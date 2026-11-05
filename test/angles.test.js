// Unit tests for the ANGLE DETECTOR, using fake facts for each roastable pattern.
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectAngles } = require('../src/comedy/angles');
const { repoResult, profileResult } = require('./fakeFacts');

const angles = (result) => detectAngles(result).map((c) => c.angle);
const top = (result) => detectAngles(result)[0];

test('long abandonment -> "abandoned" with the last commit date and message as details', () => {
  const r = repoResult({ commits: { daysSinceLastCommit: 2200, lastCommit: '2020-11-01', recentMessages: ['will finish tomorrow'] } });
  const c = top(r);
  assert.equal(c.angle, 'abandoned');
  assert.equal(c.exact_quote, 'will finish tomorrow');
  assert.ok(c.details.includes('2020-11-01'));
});

test('commit messages like "final", "final2", "asdf" -> final_final and lazy_messages', () => {
  const r = repoResult({ commits: { finalMessages: ['final', 'final2'], lazyCount: 40, lazyExamples: ['fix', 'final', 'final2', 'asdf'] } });
  const a = angles(r);
  assert.ok(a.includes('final_final'));
  assert.ok(a.includes('lazy_messages'));
  const lazy = detectAngles(r).find((c) => c.angle === 'lazy_messages');
  assert.ok(lazy.details.includes('asdf'));
});

test('commits clustered at 1-4 AM -> night_commits', () => {
  const r = repoResult({ commitTimes: { sampled: 50, night: 31, nightPercent: 62, peakHour: 2, peakCount: 14 } });
  const c = detectAngles(r).find((x) => x.angle === 'night_commits');
  assert.ok(c);
  assert.equal(c.number, 31);
  assert.ok(c.details.includes('2:00'));
});

test('40 forks and 3 original repos -> fork_collector', () => {
  const r = profileResult({ forks: 40, originals: 3, forkPercent: 93 });
  assert.equal(top(r).angle, 'fork_collector');
  assert.ok(top(r).details.includes('3'));
});

test('README that only repeats the title -> readme_only_title', () => {
  const r = repoResult({ readme: { words: 3, onlyTitle: true, excerpt: 'widget' } });
  assert.ok(angles(r).includes('readme_only_title'));
});

test('many TODOs and zero tests -> todos_no_tests (beats plain no_tests)', () => {
  const r = repoResult({ todoCount: 61, tree: { hasTests: false, testFileCount: 0 } });
  const a = angles(r);
  assert.ok(a.includes('todos_no_tests'));
  assert.ok(!a.includes('no_tests'));
});

test('repo named "test3" -> placeholder_name', () => {
  const r = repoResult({ name: 'dev/test3' });
  const c = detectAngles(r).find((x) => x.angle === 'placeholder_name');
  assert.equal(c.exact_quote, 'test3');
});

test('200 commits in one day then silence -> burst_then_silence', () => {
  const r = repoResult({ commits: { total: 230, sampleSize: 100, busiestDay: { date: '2023-06-10', count: 92, after: 1 } } });
  const c = top(r);
  assert.equal(c.angle, 'burst_then_silence');
  assert.ok(c.details.includes('2023-06-10'));
});

test('several repos from the same tutorial -> tutorial_rerun', () => {
  const r = profileResult({ tutorialGroups: [{ tutorial: 'todo app', repos: ['todo-app', 'react-todo', 'todo-list-2'], count: 3 }] });
  const c = top(r);
  assert.equal(c.angle, 'tutorial_rerun');
  assert.ok(c.details.includes('react-todo'));
});

test('numbered repo names test, test2, test3 -> numbered_series', () => {
  const r = profileResult({ numberedSeries: [{ base: 'test', names: ['test', 'test2', 'test3'], count: 3 }], placeholderNames: ['test', 'test2', 'test3'] });
  const a = angles(r);
  assert.equal(a[0], 'numbered_series');
  assert.ok(!a.includes('placeholder_names'), 'no duplicate angle for the same repos');
});

test('perfect READMEs but zero stars -> perfect_but_ignored (repo and profile)', () => {
  assert.ok(angles(repoResult({ stars: 0 })).includes('perfect_but_ignored'));
  assert.ok(angles(profileResult({ allDescribed: true, allReadmesPresent: true, totalStars: 0, noDescriptionCount: 0, zeroStarOriginals: 10 })).includes('perfect_but_ignored'));
});

test('thousands of commits and no documentation -> many_commits_no_docs', () => {
  const r = repoResult({ readme: null, commits: { total: 4200 } });
  const a = angles(r);
  assert.ok(a.includes('many_commits_no_docs'));
});

test('committed node_modules and .env -> committed_junk, ranked first', () => {
  const r = repoResult({ tree: { junk: [{ name: 'node_modules/', count: 4800 }, { name: '.env', count: 1 }] } });
  const c = top(r);
  assert.equal(c.angle, 'committed_junk');
  assert.ok(c.details.includes('.env'));
});

test('empty profile -> empty_profile, and still at least 2 cards', () => {
  const r = profileResult({ isEmpty: true, originals: 0, forks: 0, publicRepos: 0, topRepos: [], topLanguages: [], mostActiveRecentRepo: null, busiestYear: null, largestActivityGap: null, daysSinceLastActivity: null, pinned: [] });
  const cards = detectAngles(r);
  assert.equal(cards[0].angle, 'empty_profile');
  assert.ok(cards.length >= 2);
  assert.ok(!cards.some((c) => c.angle === 'nothing_pinned'), 'an empty profile is not roasted for having nothing pinned');
});

test('perfect-looking profile -> "suspiciously_clean" (joke about the absence of flaws), no invented flaws', () => {
  const r = profileResult({ allDescribed: true, noDescriptionCount: 0, totalStars: 900, zeroStarOriginals: 1 });
  const a = angles(r);
  assert.ok(a.includes('suspiciously_clean'));
  for (const bad of ['gone_quiet', 'fork_collector', 'no_descriptions', 'empty_repos', 'missing_readmes']) assert.ok(!a.includes(bad), bad);
});

test('healthy repo -> suspiciously_clean plus specific fallbacks (exact commit message)', () => {
  const cards = detectAngles(repoResult());
  const a = cards.map((c) => c.angle);
  assert.ok(a.includes('suspiciously_clean'));
  assert.ok(cards.find((c) => c.angle === 'latest_message').details.includes('Add keyboard support to the dropdown'));
});

test('empty repo -> empty_repo first', () => {
  const r = repoResult({ isEmpty: true, commits: null, readme: null, tree: null, languages: [], stars: 0, forks: 0 });
  assert.equal(top(r).angle, 'empty_repo');
});

test('every card is complete: id, fact, details, source, score; sorted best first', () => {
  for (const r of [repoResult(), repoResult({ isEmpty: true, commits: null, readme: null, tree: null, languages: [] }), profileResult(), profileResult({ isEmpty: true, originals: 0, topRepos: [], topLanguages: [], mostActiveRecentRepo: null })]) {
    const cards = detectAngles(r);
    assert.ok(cards.length >= 2 && cards.length <= 8);
    cards.forEach((c, i) => {
      assert.equal(c.id, `C${i + 1}`);
      assert.ok(c.fact && c.source_url && c.details.length, `${c.angle} complete`);
      if (i) assert.ok(cards[i - 1].score >= c.score, 'sorted by score');
    });
  }
});
