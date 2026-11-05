// Tests for the comedy engine: automatic checks, offline jokes on every pattern, and the
// two-pass AI pipeline (with fake models, so no API key is needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectAngles } = require('../src/comedy/angles');
const { checkJoke, checkJokes, openingPattern, allowedNumbersFor, countSentences } = require('../src/comedy/checks');
const { offlineJokes } = require('../src/comedy/offlineComedy');
const { writeRoast, writerPrompt, criticPrompt } = require('../src/comedy/comedyWriter');
const { loadCalibration } = require('../src/comedy/calibration');
const { repoResult, profileResult } = require('./fakeFacts');

const abandoned = repoResult({ name: 'dev/test3', commits: { daysSinceLastCommit: 2200, lastCommit: '2020-11-01', recentMessages: ['will finish tomorrow'], lazyCount: 30, lazyExamples: ['fix', 'asdf'] }, todoCount: 61, tree: { hasTests: false, testFileCount: 0 } });
const cards = detectAngles(abandoned);
const allowed = allowedNumbersFor(abandoned, cards);
const id = (angle) => cards.find((c) => c.angle === angle).id;

// ---------- the checks ----------
test('a specific, cited joke passes', () => {
  assert.deepEqual(checkJoke({ text: 'Time of death 2020-11-01, last words "will finish tomorrow". Tomorrow never got the memo.', cards: [id('abandoned')] }, cards, allowed), []);
});

test('generic joke without a detail from its card is rejected', () => {
  const p = checkJoke({ text: 'This repo has seen better days, like most of us.', cards: [id('abandoned')] }, cards, allowed);
  assert.ok(p.some((x) => x.includes('specific detail')));
});

test('joke citing no card (or a fake card) is rejected', () => {
  assert.ok(checkJoke({ text: '61 TODOs and no tests.', cards: [] }, cards, allowed).some((x) => x.includes('evidence card')));
  assert.ok(checkJoke({ text: '61 TODOs and no tests.', cards: ['C99'] }, cards, allowed).some((x) => x.includes('evidence card')));
});

test('banned phrases, "Ah"/"Well" openings, explaining, famous people and emoji spam are rejected', () => {
  const c = [id('todos_no_tests')];
  const cases = [
    ['61 TODOs: a true coding journey.', 'banned phrase'],
    ['61 TODOs and it works on my machine.', 'banned phrase'],
    ['Ah, 61 TODOs and no tests.', 'Ah'],
    ['Well, 61 TODOs and no tests.', 'Ah'],
    ['61 TODOs, zero tests. Get it? Because nothing gets done.', 'explains'],
    ['61 TODOs. Even Elon Musk would ship that.', 'famous'],
    ['61 TODOs 💀💀💀 and no tests.', 'emoji'],
  ];
  for (const [text, expected] of cases) {
    const p = checkJoke({ text, cards: c }, cards, allowed);
    assert.ok(p.some((x) => x.includes(expected)), `${text} -> ${p.join(' | ')}`);
  }
});

test('LIMIT topics are rejected (identity, appearance, health, mental health, family, nationality, personal life)', () => {
  const c = [id('todos_no_tests')];
  const bad = [
    '61 TODOs. No wonder they are still single and living in a basement.',
    '61 TODOs, written with the anxiety of someone who needs therapy.',
    '61 TODOs: his mom must be so proud.',
    '61 TODOs, typical for an Indian developer.',
    '61 TODOs and the hairline to match.',
    '61 TODOs, that burnout is showing.',
    '61 TODOs from a boomer who never learned tests.',
  ];
  for (const text of bad) {
    const p = checkJoke({ text, cards: c }, cards, allowed);
    assert.ok(p.some((x) => x.includes('LIMIT')), `${text} -> ${p.join(' | ')}`);
  }
  // Code words that look similar must NOT trigger: race condition, parent repo, a single commit, broke the build.
  for (const text of ['61 TODOs and a race condition in each.', '61 TODOs, a single commit away from chaos.', '61 TODOs that broke the build twice.']) {
    assert.ok(!checkJoke({ text, cards: c }, cards, allowed).some((x) => x.includes('LIMIT')), text);
  }
});

test('invented numbers and over-long jokes are rejected', () => {
  const c = [id('todos_no_tests')];
  assert.ok(checkJoke({ text: '61 TODOs and 4000 bugs.', cards: c }, cards, allowed).some((x) => x.includes('4000')));
  assert.ok(checkJoke({ text: '61 TODOs. One. Two. Three.', cards: c }, cards, allowed).some((x) => x.includes('two sentences')));
});

test('two jokes with the same opening pattern: the second one is flagged', () => {
  const jokes = [
    { text: '61 TODOs and no tests. A bucket list.', cards: [id('todos_no_tests')] },
    { text: '61 TODOs, still no tests anywhere.', cards: [id('todos_no_tests')] },
  ];
  const r = checkJokes(jokes, cards, abandoned);
  assert.equal(r.results[0].problems.length, 0);
  assert.ok(r.results[1].problems.some((p) => p.includes('opening pattern')));
});

test('opening patterns ignore exact numbers and quotes; sentences ignore quoted text', () => {
  assert.equal(openingPattern('61 TODOs and more'), openingPattern('12 TODOs elsewhere'));
  assert.equal(countSentences('Messages like "fix. again. done." appear. That is all.'), 2);
});

// ---------- offline jokes on every pattern ----------
const patterns = {
  abandoned,
  healthy: repoResult(),
  empty_repo: repoResult({ isEmpty: true, commits: null, readme: null, tree: null, languages: [], stars: 0, forks: 0 }),
  burst: repoResult({ commits: { busiestDay: { date: '2023-06-10', count: 92, after: 1 } } }),
  night: repoResult({ commitTimes: { sampled: 50, night: 31, nightPercent: 62, peakHour: 2, peakCount: 14 } }),
  junk: repoResult({ tree: { junk: [{ name: 'node_modules/', count: 4800 }, { name: '.env', count: 1 }] } }),
  finals: repoResult({ commits: { finalMessages: ['final', 'final2', 'final_REAL'], lazyCount: 12, lazyExamples: ['final', 'final2'] } }),
  readme_title: repoResult({ readme: { words: 3, onlyTitle: true, excerpt: 'widget' }, stars: 0 }),
  no_docs: repoResult({ readme: null, commits: { total: 4200 } }),
  perfect_repo: repoResult({ stars: 0 }),
  fork_profile: profileResult({ forks: 40, originals: 3, forkPercent: 93 }),
  tutorial_profile: profileResult({ tutorialGroups: [{ tutorial: 'todo app', repos: ['todo-app', 'react-todo', 'todo-list-2'], count: 3 }] }),
  numbered_profile: profileResult({ numberedSeries: [{ base: 'test', names: ['test', 'test2', 'test3'], count: 3 }] }),
  empty_profile: profileResult({ isEmpty: true, originals: 0, forks: 0, publicRepos: 0, topRepos: [], topLanguages: [], mostActiveRecentRepo: null, busiestYear: null, largestActivityGap: null, daysSinceLastActivity: null }),
  perfect_profile: profileResult({ allDescribed: true, noDescriptionCount: 0, totalStars: 900, zeroStarOriginals: 1 }),
  dead_profile: profileResult({ daysSinceLastActivity: 2900, lastActivity: '2018-08-30', emptyRepoCount: 4, missingReadme: ['a', 'b'] }),
};

test('offline jokes: 3-5 per input, every one passes every check, at every intensity', () => {
  for (const [name, result] of Object.entries(patterns)) {
    const c = detectAngles(result);
    for (const intensity of ['mild', 'medium', 'savage']) {
      const jokes = offlineJokes(result, c, { intensity });
      assert.ok(jokes.length >= 3 && jokes.length <= 5, `${name}/${intensity}: ${jokes.length} jokes`);
      const r = checkJokes(jokes, c, result);
      assert.ok(r.ok, `${name}/${intensity}: ${JSON.stringify(r.results.filter((x) => x.problems.length))}`);
    }
  }
});

test('offline jokes: the strongest angle is always roasted first', () => {
  for (const [name, result] of Object.entries(patterns)) {
    const c = detectAngles(result);
    const jokes = offlineJokes(result, c, { intensity: 'medium' });
    assert.equal(jokes[0].cards[0], 'C1', name);
  }
});

test('offline jokes differ between inputs: different lead joke and different set for each of 16 inputs', () => {
  // (The fake inputs share a base, so a low-priority fallback line may repeat; the lead joke and the set must not.)
  const leads = new Map();
  const sets = new Map();
  for (const [name, result] of Object.entries(patterns)) {
    const jokes = offlineJokes(result, detectAngles(result));
    assert.ok(!leads.has(jokes[0].text), `lead joke shared by ${leads.get(jokes[0].text)} and ${name}`);
    leads.set(jokes[0].text, name);
    const key = jokes.map((j) => j.text).join('|');
    assert.ok(!sets.has(key), `identical joke set for ${sets.get(key)} and ${name}`);
    sets.set(key, name);
  }
});

test('intensity changes the wording', () => {
  const c = detectAngles(abandoned);
  const mild = offlineJokes(abandoned, c, { intensity: 'mild' })[0].text;
  const savage = offlineJokes(abandoned, c, { intensity: 'savage' })[0].text;
  assert.notEqual(mild, savage);
});

// ---------- two-pass AI pipeline (fake model) ----------
function fakeProvider(replies) {
  const calls = [];
  return {
    name: 'fake',
    model: 'test',
    calls,
    async generate(system, user, opts) {
      calls.push({ system, user, opts });
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return typeof next === 'string' ? next : JSON.stringify(next);
    },
  };
}

const goodRoast = [
  { text: 'Time of death 2020-11-01, last words "will finish tomorrow". Tomorrow has been notified.', cards: ['C1'] },
  { text: '61 TODOs and not one test: a bucket list nobody intends to cross off.', cards: [id('todos_no_tests')] },
  { text: 'Commit messages like "asdf" carry the whole history, like a ransom note.', cards: [id('lazy_messages')] },
];
const tenCandidates = { candidates: [...goodRoast, ...Array.from({ length: 7 }, (_, i) => ({ text: `Generic line number ${i}.`, cards: [] }))] };

test('two-pass: writer gets cards + calibration, critic gets candidates with AUTO-CHECK notes', async () => {
  const p = fakeProvider([tenCandidates, { roast: goodRoast, rejected: [{ candidate: 4, reason: 'generic' }] }]);
  const out = await writeRoast(abandoned, p, { intensity: 'savage', calibration: { examples: ['Example tone line that is long enough.'], placeholder: false } });
  assert.equal(out.jokes.length, 3);
  assert.equal(out.generatedBy, 'fake (test), 2-pass');
  assert.equal(p.calls.length, 2);
  assert.match(p.calls[0].system, /SAVAGE/);
  assert.match(p.calls[0].system, /Example tone line/);
  assert.match(p.calls[0].user, /C1 \(angle: abandoned\)/);
  assert.ok(p.calls[0].opts.temperature > p.calls[1].opts.temperature, 'writer runs hotter than the critic');
  assert.match(p.calls[1].user, /AUTO-CHECK: does not cite a valid evidence card/);
  assert.equal(out.debug.criticRejected[0].reason, 'generic');
});

test('two-pass: critic output that fails checks is retried with the problems listed', async () => {
  const badPick = { roast: [{ text: 'Well, this repo exists.', cards: ['C1'] }, goodRoast[1]] };
  const p = fakeProvider([tenCandidates, badPick, { roast: goodRoast }]);
  const out = await writeRoast(abandoned, p, { calibration: { examples: [] } });
  assert.equal(out.jokes.length, 3);
  assert.equal(p.calls.length, 3);
  assert.match(p.calls[2].user, /failed automatic checks/);
  assert.match(p.calls[2].user, /Ah" or "Well/);
});

test('two-pass: if only 2 AI jokes survive, offline jokes fill to 3 without repeating openings', async () => {
  const two = { roast: goodRoast.slice(0, 2) };
  const p = fakeProvider([tenCandidates, two, two]);
  const out = await writeRoast(abandoned, p, { calibration: { examples: [] } });
  assert.equal(out.jokes.length, 3);
  assert.match(out.generatedBy, /\+ offline fill/);
  assert.ok(checkJokes(out.jokes, out.cards, abandoned).ok);
});

test('two-pass: broken AI (errors / junk) falls back to offline templates', async () => {
  const p = fakeProvider([new Error('429 rate limit'), 'not json']);
  const out = await writeRoast(abandoned, p, { calibration: { examples: [] } });
  assert.match(out.generatedBy, /offline templates/);
  assert.ok(out.jokes.length >= 3);
  assert.equal(out.warnings.length, 3);
});

test('no AI at all -> offline templates, still checked', async () => {
  const out = await writeRoast(patterns.tutorial_profile, null);
  assert.equal(out.generatedBy, 'offline templates');
  assert.ok(checkJokes(out.jokes, out.cards, patterns.tutorial_profile).ok);
});

test('prompts contain the LIMIT and the banned list; the critic never sees the bio', () => {
  const r = profileResult({ bio: 'Father of two, coffee addict', tutorialGroups: [{ tutorial: 'todo app', repos: ['todo-app', 'react-todo'], count: 2 }] });
  const c = detectAngles(r);
  const w = writerPrompt(r, c, 'medium', { examples: [] });
  assert.match(w.system, /LIMIT \(non-negotiable\)/);
  assert.match(w.system, /coding journey/);
  const cr = criticPrompt(r, c, [{ text: 'x', cards: [] }], { results: [{ problems: [] }] }, 'medium');
  assert.ok(!w.user.includes('Father of two') && !cr.user.includes('Father of two'), 'personal bio never reaches the comedy model');
});

test('calibration.md loads, and its placeholders are detected', () => {
  const cal = loadCalibration();
  assert.ok(cal.examples.length >= 10);
  assert.ok(cal.examples.every((e) => !e.startsWith('PLACEHOLDER')));
  assert.equal(typeof cal.placeholder, 'boolean');
  assert.deepEqual(loadCalibration('does-not-exist.md'), { examples: [], placeholder: true, missing: true });
});
