// Unit tests for the repo facts engine, using REAL saved GitHub API responses (test/fixtures).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFixture, replayFetch } = require('./helpers');
const { createGithubClient } = require('../src/githubClient');
const { collectRepo } = require('../src/collectors/repoCollector');
const { computeRepoFacts, analyzeReadme, LAZY_MESSAGE, WEB_UI_MESSAGE } = require('../src/facts/repoFacts');
const { offlineWrite } = require('../src/offlineWriter');

async function factsFromFixture(name, owner, repo) {
  const fx = loadFixture(name);
  const gh = createGithubClient({ fetchImpl: replayFetch(fx) });
  const raw = await collectRepo(gh, owner, repo);
  return { raw, result: computeRepoFacts(raw, new Date(fx.recordedAt)), fx };
}

function evidenceValue(result, key) {
  const row = result.evidence.find((e) => e.key === key);
  return row ? row.value : undefined;
}

test('tiny old repo (octocat/Hello-World): basic facts', async () => {
  const { result, fx } = await factsFromFixture('repo-hello-world', 'octocat', 'Hello-World');
  const f = result.facts;
  const api = JSON.parse(fx.responses['https://api.github.com/repos/octocat/Hello-World'].body);
  assert.equal(result.kind, 'repo');
  assert.equal(f.name, 'octocat/Hello-World');
  assert.equal(f.stars, api.stargazers_count);
  assert.equal(f.forks, api.forks_count);
  assert.equal(f.commits.total, 3);
  assert.equal(f.commits.lastCommit, '2012-03-06');
  assert.equal(f.commits.largestGap.days, 230);
  assert.equal(f.license, null);
  assert.deepEqual(f.languages, []);
  assert.equal(f.tree.hasTests, false);
  assert.equal(f.tree.hasCi, false);
  assert.deepEqual(f.tree.readFirst, ['README']);
  assert.equal(f.readme.words, 2);
  assert.equal(evidenceValue(result, 'license'), 'no license');
});

test('real maintained repo (expressjs/cors): commits, tests, CI, license, run commands', async () => {
  const { result } = await factsFromFixture('repo-cors', 'expressjs', 'cors');
  const f = result.facts;
  assert.equal(f.commits.total, 351, 'commit count read from the Link header');
  assert.equal(f.commits.sampleSize, 100);
  assert.equal(f.license, 'MIT');
  assert.deepEqual(f.languages, [{ name: 'JavaScript', percent: 100 }]);
  assert.equal(f.tree.hasTests, true);
  assert.ok(f.tree.testExamples.every((p) => p.startsWith('test/') && p.endsWith('.js')));
  assert.equal(f.tree.hasCi, true);
  assert.ok(f.tree.ciFiles.includes('.github/workflows/ci.yml'));
  assert.deepEqual(f.tree.manifests, ['package.json']);
  assert.ok(f.tree.entryPoints.includes('lib/index.js'));
  assert.deepEqual(f.tree.readFirst, ['README.md', 'package.json', 'lib/index.js']);
  assert.ok(f.readme.commands.includes('npm install cors'));
  assert.ok(f.packageScripts.includes('test'));
  assert.ok(f.commits.largestGap.days > 0);
  assert.ok(f.commits.authorsInSample > 1);
});

test('every evidence row has key, label, value and a checkable source', async () => {
  for (const [fx, o, n] of [['repo-hello-world', 'octocat', 'Hello-World'], ['repo-cors', 'expressjs', 'cors']]) {
    const { result } = await factsFromFixture(fx, o, n);
    assert.ok(result.evidence.length >= 15, `${fx} has enough evidence`);
    const keys = new Set();
    for (const e of result.evidence) {
      assert.ok(e.key && e.label && typeof e.value === 'string' && e.value.length, `row ${e.key} complete`);
      assert.match(e.source, /^https:\/\/api\.github\.com\//);
      assert.ok(!keys.has(e.key), `duplicate key ${e.key}`);
      keys.add(e.key);
    }
  }
});

test('empty repository: no crash, clear notice, zero commits', async () => {
  const base = 'https://api.github.com/repos/someone/empty';
  const repoJson = {
    full_name: 'someone/empty', html_url: 'https://github.com/someone/empty', description: null, topics: [], fork: false,
    archived: false, created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-01-01T00:00:00Z', size: 0, default_branch: 'main',
    stargazers_count: 0, forks_count: 0, subscribers_count: 1, open_issues_count: 0, license: null, language: null,
  };
  const fx = {
    responses: {
      [base]: { status: 200, headers: {}, body: JSON.stringify(repoJson) },
      [base + '/languages']: { status: 200, headers: {}, body: '{}' },
      [base + '/commits?per_page=100']: { status: 409, headers: {}, body: JSON.stringify({ message: 'Git Repository is empty.' }) },
      [base + '/readme']: { status: 404, headers: {}, body: '{"message":"Not Found"}' },
      [base + '/git/trees/main?recursive=1']: { status: 409, headers: {}, body: JSON.stringify({ message: 'Git Repository is empty.' }) },
    },
  };
  const gh = createGithubClient({ fetchImpl: replayFetch(fx) });
  const raw = await collectRepo(gh, 'someone', 'empty');
  const result = computeRepoFacts(raw, new Date('2024-06-01T00:00:00Z'));
  assert.equal(result.facts.isEmpty, true);
  assert.equal(evidenceValue(result, 'commit_count'), '0');
  assert.ok(result.notices.some((n) => /empty/i.test(n)));
  const out = offlineWrite(result);
  assert.ok(out.roast.length >= 3);
  assert.ok(out.roast.some((l) => /zero commits/i.test(l)));
  assert.equal(out.summary.how_to_run, 'Nothing to run yet.');
});

test('README analysis finds headings, run commands and the first real paragraph', () => {
  const fence = '`'.repeat(3);
  const text = [
    '# My Tool',
    '![badge](https://img.shields.io/x)',
    'A command line tool that counts words in files quickly.',
    '## Install',
    fence + 'bash',
    '$ pip install -r requirements.txt',
    'python main.py --help',
    'echo not-a-command-we-know',
    fence,
  ].join('\n');
  const r = analyzeReadme({ path: 'README.md', size: text.length, text });
  assert.deepEqual(r.headings, ['My Tool', 'Install']);
  assert.deepEqual(r.commands, ['pip install -r requirements.txt', 'python main.py --help']);
  assert.equal(r.firstParagraph, 'A command line tool that counts words in files quickly.');
});

test('commit message classifiers', () => {
  for (const m of ['update', 'fix', 'wip', 'asdf', '.', 'Final', 'minor']) assert.ok(LAZY_MESSAGE.test(m), m);
  for (const m of ['Add CORS preflight support', 'docs: revamp content (#374)']) assert.ok(!LAZY_MESSAGE.test(m), m);
  assert.ok(WEB_UI_MESSAGE.test('Update README.md'));
  assert.ok(WEB_UI_MESSAGE.test('Add files via upload'));
  assert.ok(!WEB_UI_MESSAGE.test('Update README with install steps'));
});
