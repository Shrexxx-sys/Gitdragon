// Tests for the AI step: prompt, JSON validation, "no invented numbers" check, retries and fallback.
const test = require('node:test');
const assert = require('node:assert/strict');
const { write, validateOutput, extractNumbers, parseJson, buildPrompt } = require('../src/writer');
const { getProvider } = require('../src/aiProvider');

const result = {
  kind: 'repo',
  target: 'me/app',
  evidence: [
    { key: 'stars', label: 'Stars', value: '42', source: 'x' },
    { key: 'commit_count', label: 'Total commits', value: '1,234', source: 'x' },
    { key: 'read_first', label: 'Suggested files to read first', value: 'README.md, src/index.js', source: 'x' },
    { key: 'created', label: 'Created on', value: '2021-03-04 (3 years ago)', source: 'x' },
  ],
  context: { readmeExcerpt: 'Run it with node src/index.js on port 8080.' },
  facts: {},
};

const good = {
  summary: { what_it_does: 'A small web app.', how_to_run: 'Run `node src/index.js`; it listens on port 8080.', read_first: ['README.md', 'src/index.js'] },
  roast: ['42 stars since 2021. A slow burn.', '1,234 commits and still no tests.', 'Created 3 years ago and it shows.'],
};

test('extractNumbers finds real numbers and ignores things like v2 or Python3', () => {
  assert.deepEqual(extractNumbers('1,234 stars, 70% JS, on 2021-03-04, v2 Python3 3D 1.5'), [1234, 70, 2021, 3, 4, 1.5]);
});

test('parseJson accepts fenced JSON', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
});

test('valid output passes', () => {
  assert.deepEqual(validateOutput(good, result), []);
});

test('invented numbers are rejected', () => {
  const bad = { ...good, roast: [...good.roast.slice(0, 2), 'Has 9000 stars apparently.'] };
  const problems = validateOutput(bad, result);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /9000/);
});

test('read_first files must exist in the evidence', () => {
  const bad = { ...good, summary: { ...good.summary, read_first: ['README.md', 'src/secret.py'] } };
  assert.match(validateOutput(bad, result).join(' '), /src\/secret\.py/);
});

test('wrong shapes are rejected', () => {
  assert.ok(validateOutput(null, result).length);
  assert.ok(validateOutput({ summary: 'text', roast: [] }, result).length);
  assert.ok(validateOutput({ ...good, roast: ['too', 'few'] }, result).length);
  assert.ok(validateOutput({ ...good, summary: { what_it_does: 'x' } }, result).length);
});

test('write() retries after bad JSON and invented facts, then accepts a valid answer', async () => {
  const replies = ['not json at all', JSON.stringify({ ...good, roast: ['It has 999 forks.', 'b line here', 'c line here'] }), JSON.stringify(good)];
  const prompts = [];
  const provider = {
    name: 'fake',
    model: 'test',
    generate: async (system, user) => {
      prompts.push(user);
      return replies.shift();
    },
  };
  const out = await write(result, provider);
  assert.equal(out.attempts, 3);
  assert.equal(out.generatedBy, 'fake (test)');
  assert.deepEqual(out.roast, good.roast);
  assert.equal(out.warnings.length, 2);
  assert.match(prompts[1], /not valid JSON/);
  assert.match(prompts[2], /999/); // the model was told which number was invented
});

test('write() falls back to offline templates when the AI keeps failing', async () => {
  const provider = { name: 'fake', model: 'test', generate: async () => { throw new Error('boom'); } };
  const realResult = {
    ...result,
    facts: { name: 'me/app', description: 'An app', languages: [], commits: null, tree: null, readme: null, packageScripts: [], stars: 42, forks: 0, createdAt: '2021-03-04', ageDays: 1000, isEmpty: false },
  };
  const out = await write(realResult, provider);
  assert.match(out.generatedBy, /offline templates/);
  assert.equal(out.warnings.length, 3);
  assert.ok(out.roast.length >= 3);
});

test('prompt contains every evidence row and the strict rules', () => {
  const { system, user } = buildPrompt(result);
  for (const e of result.evidence) assert.ok(user.includes(e.value));
  assert.match(system, /ONLY the facts/);
  assert.match(system, /JSON only/);
});

test('getProvider picks the right provider from env', () => {
  assert.equal(getProvider({}), null);
  assert.equal(getProvider({ AI_PROVIDER: 'offline', GROQ_API_KEY: 'k' }), null);
  assert.equal(getProvider({ GROQ_API_KEY: 'k' }).name, 'groq');
  assert.equal(getProvider({ GEMINI_API_KEY: 'k' }).name, 'gemini');
  assert.equal(getProvider({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'k', GROQ_API_KEY: 'k' }).name, 'gemini');
  assert.equal(getProvider({ AI_PROVIDER: 'ollama' }).name, 'ollama');
  assert.equal(getProvider({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' }).model, 'gemini-x');
});
