// ACCURACY TEST: checks the facts engine against GitHub on 50 varied repos and profiles.
//
// The facts engine reads GitHub's REST API. This script asks a DIFFERENT source, GitHub's GraphQL
// API, for the same numbers and compares them field by field. It writes accuracy-report.md.
// Real numbers only: every value in the report is what the two APIs actually returned.
//
// Usage: npm run accuracy   (needs GITHUB_TOKEN in .env: GraphQL requires a token; ~600 API calls)

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createGithubClient } = require('../src/githubClient');
const { collectRepo } = require('../src/collectors/repoCollector');
const { collectProfile } = require('../src/collectors/profileCollector');
const { computeRepoFacts } = require('../src/facts/repoFacts');
const { computeProfileFacts } = require('../src/facts/profileFacts');

const REPOS = [
  'torvalds/linux', 'expressjs/express', 'expressjs/cors', 'mojombo/grit', 'octocat/Spoon-Knife', 'octocat/Hello-World',
  'diamante-io/test', 'kelseyhightower/nocode', 'sindresorhus/awesome', 'facebook/react', 'vuejs/vue', 'python/cpython',
  'golang/go', 'nodejs/node', 'microsoft/vscode', 'denoland/deno', 'tj/commander.js', 'lodash/lodash', 'jashkenas/backbone',
  'jquery/jquery', 'twbs/bootstrap', 'pallets/flask', 'psf/requests', 'django/django', 'rails/rails', 'octocat/linguist',
  'github/gitignore', 'public-apis/public-apis', 'ohmyzsh/ohmyzsh', 'sindresorhus/is-online',
];
const PROFILES = [
  'torvalds', 'sindresorhus', 'pjhyett', 'ghost', 'octocat', 'defunkt', 'github', 'gaearon', 'tj', 'mojombo',
  'kelseyhightower', 'yyx990803', 'addyosmani', 'getify', 'jashkenas', 'wycats', 'mitchellh', 'antirez', 'dhh', 'google',
];

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN is required (GitHub only allows GraphQL with a token). Add it to .env.');
  process.exit(1);
}
const gh = createGithubClient({ token, cacheDir: process.env.GITHUB_CACHE_DIR || '.cache' });

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'git-autopsy-accuracy' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const REPO_Q = `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){
  stargazerCount forkCount createdAt isArchived isFork isEmpty description
  licenseInfo{ spdxId } primaryLanguage{ name }
  issues(states:OPEN){ totalCount } pullRequests(states:OPEN){ totalCount }
  defaultBranchRef{ target{ ... on Commit { history(first:1){ totalCount nodes{ committedDate } } } } }
}}`;

const OWNER_Q = `query($login:String!,$after:String){ repositoryOwner(login:$login){ __typename login
  ... on User { createdAt followers{ totalCount } }
  ... on Organization { createdAt }
  repositories(first:100, after:$after, privacy:PUBLIC, ownerAffiliations:OWNER, orderBy:{field:PUSHED_AT, direction:DESC}){
    totalCount pageInfo{ hasNextPage endCursor } nodes{ isFork stargazerCount primaryLanguage{ name } }
  }
}}`;

// tolerance for numbers that can change in the seconds between the two requests (busy repos)
const near = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= Math.max(2, Math.abs(b) * 0.002));

const fields = {}; // field -> { checked, exact, near, mismatches: [] }
function compare(target, field, engine, independent, { exactOnly = false } = {}) {
  const f = (fields[field] = fields[field] || { checked: 0, exact: 0, near: 0, mismatches: [] });
  f.checked++;
  if (engine === independent) f.exact++;
  else if (!exactOnly && near(engine, independent)) f.near++;
  else f.mismatches.push({ target, engine, independent });
}

async function checkRepo(full) {
  const [owner, name] = full.split('/');
  const facts = computeRepoFacts(await collectRepo(gh, owner, name)).facts;
  const g = (await graphql(REPO_Q, { owner, name })).repository;
  compare(full, 'stars', facts.stars, g.stargazerCount);
  compare(full, 'forks', facts.forks, g.forkCount);
  compare(full, 'open issues + PRs', facts.openIssuesAndPrs, g.issues.totalCount + g.pullRequests.totalCount);
  compare(full, 'created date', facts.createdAt, g.createdAt.slice(0, 10), { exactOnly: true });
  compare(full, 'archived', facts.archived, g.isArchived, { exactOnly: true });
  compare(full, 'is a fork', facts.isFork, g.isFork, { exactOnly: true });
  compare(full, 'empty repo', facts.isEmpty, g.isEmpty, { exactOnly: true });
  compare(full, 'description', facts.description || null, g.description || null, { exactOnly: true });
  const gl = g.licenseInfo && g.licenseInfo.spdxId !== 'NOASSERTION' ? g.licenseInfo.spdxId : null;
  const el = facts.license && !/unrecognized/.test(facts.license) ? facts.license : null;
  compare(full, 'license', el, gl, { exactOnly: true });
  compare(full, 'main language', facts.primaryLanguage || null, g.primaryLanguage ? g.primaryLanguage.name : null, { exactOnly: true });
  const hist = g.defaultBranchRef && g.defaultBranchRef.target.history;
  if (hist) {
    compare(full, 'total commits', facts.commits ? facts.commits.total : 0, hist.totalCount);
    compare(full, 'last commit date', facts.commits ? facts.commits.lastCommit : null, hist.nodes[0] ? hist.nodes[0].committedDate.slice(0, 10) : null, { exactOnly: true });
  }
}

async function checkProfile(login) {
  const facts = computeProfileFacts(await collectProfile(gh, login)).facts;
  let owner = null;
  const nodes = [];
  let after = null;
  for (let page = 0; page < 3; page++) {
    const d = (await graphql(OWNER_Q, { login, after })).repositoryOwner;
    owner = owner || d;
    nodes.push(...d.repositories.nodes);
    if (!d.repositories.pageInfo.hasNextPage) break;
    after = d.repositories.pageInfo.endCursor;
  }
  const total = owner.repositories.totalCount;
  compare(login, 'public repos', facts.publicRepos, total);
  compare(login, 'account created date', facts.createdAt, owner.createdAt.slice(0, 10), { exactOnly: true });
  if (owner.__typename === 'User') compare(login, 'followers', facts.followers, owner.followers.totalCount);
  // these need the full repo list: only when both sides saw every repo (<= 300)
  if (facts.analysedAll && nodes.length === total) {
    const originals = nodes.filter((n) => !n.isFork);
    compare(login, 'original repos', facts.originals, originals.length, { exactOnly: true });
    compare(login, 'forked repos', facts.forks, nodes.length - originals.length, { exactOnly: true });
    compare(login, 'total stars (originals)', facts.totalStars, originals.reduce((s, n) => s + n.stargazerCount, 0));
    const counts = {};
    for (const n of originals) if (n.primaryLanguage) counts[n.primaryLanguage.name] = (counts[n.primaryLanguage.name] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const topCount = top ? top[1] : 0;
    // ties are allowed: any language with the top count is correct
    const engineTop = facts.topLanguages[0] ? facts.topLanguages[0].name : null;
    compare(login, 'top language', engineTop && counts[engineTop] === topCount ? 'ok' : engineTop, top ? 'ok' : null, { exactOnly: true });
  }
}

(async () => {
  const started = Date.now();
  const errors = [];
  const all = [...REPOS.map((r) => ['repo', r]), ...PROFILES.map((p) => ['profile', p])];
  for (let i = 0; i < all.length; i++) {
    const [kind, target] = all[i];
    process.stdout.write(`[${i + 1}/${all.length}] ${kind} ${target} ... `);
    try {
      await (kind === 'repo' ? checkRepo(target) : checkProfile(target));
      console.log('ok');
    } catch (err) {
      console.log(`ERROR ${err.message}`);
      errors.push({ kind, target, message: err.message });
    }
  }

  let checked = 0;
  let exact = 0;
  let nearCount = 0;
  for (const f of Object.values(fields)) {
    checked += f.checked;
    exact += f.exact;
    nearCount += f.near;
  }
  const pct = (n) => (checked ? ((n / checked) * 100).toFixed(1) : '0.0');
  const out = [];
  out.push('# Git Autopsy: accuracy report', '');
  out.push(`Generated ${new Date().toISOString()} · ${all.length} targets (${REPOS.length} repos, ${PROFILES.length} profiles) · ${((Date.now() - started) / 1000).toFixed(0)}s`, '');
  out.push('**Method:** the facts engine reads the GitHub **REST** API. This report compares its numbers with the same facts read from GitHub\'s **GraphQL** API (a separate source), field by field. All values are real API responses.', '');
  out.push('## Overall', '');
  out.push(`- Facts checked: **${checked}**`);
  out.push(`- Exact matches: **${exact}** (${pct(exact)}%)`);
  out.push(`- Within tolerance: **${nearCount}** (${pct(nearCount)}%): busy counters (stars, issues) can change in the seconds between the two requests; tolerance = max(2, 0.2%)`);
  out.push(`- Mismatches: **${checked - exact - nearCount}** (${pct(checked - exact - nearCount)}%)`);
  out.push(`- Targets that failed to load: ${errors.length}`, '');
  out.push('## By field', '', '| Field | Checked | Exact | Within tolerance | Mismatch |', '|---|---|---|---|---|');
  for (const [name, f] of Object.entries(fields)) out.push(`| ${name} | ${f.checked} | ${f.exact} | ${f.near} | ${f.mismatches.length} |`);
  out.push('');
  const mism = Object.entries(fields).flatMap(([name, f]) => f.mismatches.map((m) => ({ field: name, ...m })));
  out.push('## Every mismatch', '');
  if (!mism.length) out.push('None.');
  else {
    out.push('| Target | Field | Facts engine (REST) | GraphQL |', '|---|---|---|---|');
    for (const m of mism) out.push(`| ${m.target} | ${m.field} | ${JSON.stringify(m.engine)} | ${JSON.stringify(m.independent)} |`);
  }
  out.push('');
  if (errors.length) {
    out.push('## Targets that failed to load', '');
    for (const e of errors) out.push(`- ${e.kind} ${e.target}: ${e.message}`);
    out.push('');
  }
  out.push('## Targets', '', `Repos: ${REPOS.join(', ')}`, '', `Profiles: ${PROFILES.join(', ')}`, '');
  fs.writeFileSync(path.join(__dirname, '..', 'accuracy-report.md'), out.join('\n'));
  console.log(`\nChecked ${checked} facts: ${exact} exact (${pct(exact)}%), ${nearCount} within tolerance, ${checked - exact - nearCount} mismatches. Wrote accuracy-report.md`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
