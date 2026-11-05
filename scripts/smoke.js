// SMOKE TEST: runs the FULL pipeline (GitHub API -> facts -> writer) on real public repos and profiles.
// Usage: npm run smoke
// Needs internet. Uses the disk cache in .cache/ so re-runs cost almost no GitHub rate limit.
// Every result is checked: summary present, 3-7 roast lines, and every number in the text exists in the evidence.

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createGithubClient } = require('../src/githubClient');
const { getProvider } = require('../src/aiProvider');
const { repoAutopsy, profileAutopsy } = require('../src/autopsy');
const { validateOutput, extractNumbers } = require('../src/writer');

const REPOS = [
  { label: 'active', owner: 'expressjs', name: 'express' },
  { label: 'huge', owner: 'torvalds', name: 'linux' },
  { label: 'dead (archived)', owner: 'mojombo', name: 'grit' },
  { label: 'tiny', owner: 'octocat', name: 'Spoon-Knife' },
  { label: 'empty', owner: null, name: null }, // found at runtime (see findEmptyRepo)
];
const PROFILES = [
  { label: 'huge (1000+ repos)', username: 'sindresorhus' },
  { label: 'active', username: 'torvalds' },
  { label: 'dead', username: 'pjhyett' },
  { label: 'empty', username: 'ghost' },
  { label: 'tiny', username: 'octocat' },
];
const EXPECTED_ERRORS = [{ label: 'missing repo', owner: 'octocat', name: 'this-repo-does-not-exist-12345', code: 'NOT_FOUND' }];

const cacheDir = process.env.GITHUB_CACHE_DIR || '.cache';
const gh = createGithubClient({ token: process.env.GITHUB_TOKEN || '', cacheDir });
const provider = getProvider();

/** Finds a real public repository with no commits (GitHub answers 409 "Git Repository is empty"). */
async function findEmptyRepo() {
  const cacheFile = path.join(cacheDir, 'smoke-empty-repo.json');
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    /* not cached yet */
  }
  // Search is cheap (separate quota). Only probe repos that were never pushed to (pushed_at == created_at).
  const res = await gh.get('/search/repositories?q=size:0+stars:>3+created:2024-01-01..2025-06-01&per_page=50');
  const candidates = ((res.data && res.data.items) || []).filter((r) => r.pushed_at === r.created_at).slice(0, 3);
  for (const r of candidates) {
    const commits = await gh.get(`/repos/${r.full_name}/commits?per_page=1`);
    if (commits.status === 409) {
      const found = { owner: r.owner.login, name: r.name };
      fs.writeFileSync(cacheFile, JSON.stringify(found));
      return found;
    }
  }
  return null;
}

function check(result) {
  // Shape checks (summary fields, 3-7 roast lines, read_first files exist in evidence).
  const problems = validateOutput({ summary: result.summary, roast: result.roast }, { kind: result.kind, evidence: result.evidence, context: {} }).filter(
    (p) => !p.startsWith('These numbers') // summary may quote numbers from the README; checked separately below for the roast
  );
  // Grounding check: every number in the roast must appear in the evidence.
  const allowed = new Set([0, 1, ...extractNumbers(result.evidence.map((e) => `${e.label}: ${e.value}`).join('\n'))]);
  const invented = extractNumbers(result.roast.join('\n')).filter((n) => !allowed.has(n));
  if (invented.length) problems.push(`roast has numbers not in evidence: ${invented.join(', ')}`);
  return problems;
}

function printResult(title, r) {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
  console.log(`written by: ${r.generatedBy}   evidence rows: ${r.evidence.length}`);
  for (const n of r.notices) console.log(`NOTICE: ${n}`);
  console.log('SUMMARY:');
  for (const [k, v] of Object.entries(r.summary)) console.log(`  ${k}: ${Array.isArray(v) ? v.join(' | ') : v}`);
  console.log('ROAST:');
  r.roast.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
  console.log('EVIDENCE (first 8):');
  for (const e of r.evidence.slice(0, 8)) console.log(`  - ${e.label}: ${e.value.slice(0, 110)}`);
  if (r.aiWarnings && r.aiWarnings.length) console.log('AI WARNINGS:', r.aiWarnings.join(' / '));
}

(async () => {
  console.log(`Git Autopsy smoke test   AI: ${provider ? `${provider.name} (${provider.model})` : 'offline templates'}   GitHub token: ${gh.hasToken ? 'yes' : 'no'}`);
  const summary = [];

  const empty = await findEmptyRepo().catch((e) => {
    console.log('Could not search for an empty repo:', e.message);
    return null;
  });
  if (empty) Object.assign(REPOS[4], empty);

  const jobs = [
    ...REPOS.map((r) => ({ title: `REPO [${r.label}] ${r.owner}/${r.name}`, skip: !r.owner, run: () => repoAutopsy({ gh, provider, owner: r.owner, name: r.name }) })),
    ...PROFILES.map((p) => ({ title: `PROFILE [${p.label}] ${p.username}`, run: () => profileAutopsy({ gh, provider, username: p.username }) })),
  ];

  for (const job of jobs) {
    if (job.skip) {
      summary.push({ title: job.title, status: 'SKIPPED (no empty repo found)' });
      continue;
    }
    const started = Date.now();
    try {
      const r = await job.run();
      printResult(job.title, r);
      const problems = check(r);
      summary.push({ title: job.title, status: problems.length ? 'FAIL: ' + problems.join(' ') : 'PASS', ms: Date.now() - started });
    } catch (err) {
      console.log(`\n${job.title}\n  ERROR ${err.code || ''}: ${err.message}`);
      summary.push({ title: job.title, status: err.code === 'RATE_LIMITED' ? 'RATE_LIMITED (re-run later or add GITHUB_TOKEN)' : `FAIL: ${err.code || 'ERROR'} ${err.message}` });
    }
  }

  for (const e of EXPECTED_ERRORS) {
    const title = `ERROR CASE [${e.label}] ${e.owner}/${e.name}`;
    try {
      await repoAutopsy({ gh, provider, owner: e.owner, name: e.name });
      summary.push({ title, status: `FAIL: expected ${e.code} but it succeeded` });
    } catch (err) {
      summary.push({ title, status: err.code === e.code ? `PASS (got ${err.code}: "${err.message}")` : `FAIL: expected ${e.code}, got ${err.code}` });
    }
  }

  console.log(`\n${'#'.repeat(78)}\nSMOKE TEST RESULTS\n${'#'.repeat(78)}`);
  for (const s of summary) console.log(`${s.status.startsWith('PASS') ? 'PASS' : s.status.startsWith('RATE') ? 'WAIT' : 'FAIL'}  ${s.title}${s.ms ? ` (${s.ms} ms)` : ''}\n      ${s.status}`);
  const failed = summary.filter((s) => !s.status.startsWith('PASS'));
  console.log(`\n${summary.length - failed.length}/${summary.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
