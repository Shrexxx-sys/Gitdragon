// Unit tests for the profile facts engine with real saved API responses.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFixture, replayFetch } = require('./helpers');
const { createGithubClient } = require('../src/githubClient');
const { collectProfile, parsePinnedFromHtml } = require('../src/collectors/profileCollector');
const { computeProfileFacts, PLACEHOLDER_NAME } = require('../src/facts/profileFacts');
const { offlineWrite } = require('../src/offlineWriter');

test('octocat profile facts match the saved API data', async () => {
  const fx = loadFixture('profile-octocat');
  const gh = createGithubClient({ fetchImpl: replayFetch(fx) });
  const raw = await collectProfile(gh, 'octocat');
  const result = computeProfileFacts(raw, new Date(fx.recordedAt));
  const f = result.facts;

  const apiRepos = JSON.parse(fx.responses['https://api.github.com/users/octocat/repos?per_page=100&sort=pushed&type=owner&page=1'].body);
  const originals = apiRepos.filter((r) => !r.fork);
  assert.equal(f.login, 'octocat');
  assert.equal(f.analysedRepos, apiRepos.length);
  assert.equal(f.originals, originals.length);
  assert.equal(f.forks, apiRepos.length - originals.length);
  assert.equal(f.totalStars, originals.reduce((s, r) => s + r.stargazers_count, 0));
  assert.equal(f.topRepos[0].stars, Math.max(...originals.map((r) => r.stargazers_count)));
  assert.ok(f.placeholderNames.includes('test-repo1'));
  assert.ok(Array.isArray(f.pinned) && f.pinned.length > 0, 'pinned repos parsed from profile page');
  assert.equal(f.readmeChecked, 4);
  assert.ok(f.largestActivityGap.days > 0);
  for (const e of result.evidence) assert.ok(e.key && e.label && e.value && e.source, `evidence ${e.key}`);

  const out = offlineWrite(result);
  assert.match(out.summary.what_they_build, /octocat/i);
  assert.ok(out.roast.length >= 3 && out.roast.length <= 6);
});

test('empty profile: clear notice and a roast that does not crash', async () => {
  const user = {
    login: 'ghost-empty', name: null, type: 'User', bio: null, html_url: 'https://github.com/ghost-empty',
    created_at: '2020-01-01T00:00:00Z', followers: 0, following: 0, public_repos: 0, public_gists: 0,
  };
  const fx = {
    responses: {
      'https://api.github.com/users/ghost-empty': { status: 200, headers: {}, body: JSON.stringify(user) },
      'https://api.github.com/users/ghost-empty/repos?per_page=100&sort=pushed&type=owner&page=1': { status: 200, headers: {}, body: '[]' },
      'https://api.github.com/users/ghost-empty/events/public?per_page=100': { status: 200, headers: {}, body: '[]' },
    },
  };
  const gh = createGithubClient({ fetchImpl: replayFetch(fx) });
  const raw = await collectProfile(gh, 'ghost-empty');
  const result = computeProfileFacts(raw, new Date('2025-01-01T00:00:00Z'));
  assert.equal(result.facts.isEmpty, true);
  assert.ok(result.notices[0].includes('no public repositories'));
  const out = offlineWrite(result);
  assert.ok(out.roast.some((l) => l.startsWith('0 public repos')));
  assert.equal(out.summary.what_they_build, 'ghost-empty has no public repositories yet.');
});

test('organizations use the /orgs/ repo list', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url === 'https://api.github.com/users/acme') {
      return new Response(JSON.stringify({ login: 'acme', type: 'Organization', created_at: '2015-01-01T00:00:00Z', public_repos: 0, followers: 0, following: 0 }), { status: 200 });
    }
    return new Response('[]', { status: 200 });
  };
  const gh = createGithubClient({ fetchImpl });
  await collectProfile(gh, 'acme');
  assert.ok(calls.some((u) => u.startsWith('https://api.github.com/orgs/acme/repos')));
});

test('with a token, an empty GraphQL pinned list falls back to the profile page', async () => {
  const fx = loadFixture('profile-octocat');
  const gh = createGithubClient({ token: 'tok', fetchImpl: replayFetch(fx) });
  gh.graphql = async () => ({ data: { repositoryOwner: { pinnedItems: { nodes: [] } } } }); // what fine-grained tokens get
  const raw = await collectProfile(gh, 'octocat');
  assert.ok(raw.pinned.length > 0);
});

test('pinned repos are parsed from profile HTML', () => {
  const html =
    '<div class="js-pinned-items-reorder-container"><a href="/me/cool-app" class="Link"><span class="repo">cool-app</span></a>' +
    '<a href="/other/lib.js"><span class="repo">lib.js</span></a></div>';
  assert.deepEqual(parsePinnedFromHtml(html), ['me/cool-app', 'other/lib.js']);
  assert.deepEqual(parsePinnedFromHtml('<html>no pins</html>'), []);
});

test('placeholder repo names', () => {
  for (const n of ['test', 'untitled', 'demo2', 'hello-world', 'my-first-app', 'test-repo1', 'asdf', 'project1']) assert.ok(PLACEHOLDER_NAME.test(n), n);
  for (const n of ['git-autopsy', 'react', 'testcafe', 'linux', 'eslint-node-test']) assert.ok(!PLACEHOLDER_NAME.test(n), n);
});
