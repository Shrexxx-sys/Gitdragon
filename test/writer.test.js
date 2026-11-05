// Tests for the writer: summary prompt + validation + retries, provider selection, and how the
// summary and the roast (comedy engine) are combined.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { write, writeSummary, validateSummary, validateOutput, extractNumbers, parseJson, buildPrompt } = require('../src/writer');
const { getProvider, createProvider, withDiskCache } = require('../src/aiProvider');
const { repoResult } = require('./fakeFacts');

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
  facts: repoResult().facts,
};

const goodSummary = { what_it_does: 'A small web app.', how_to_run: 'Run `node src/index.js`; it listens on port 8080.', read_first: ['README.md', 'src/index.js'] };

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

test('extractNumbers finds real numbers and ignores things like v2 or Python3', () => {
  assert.deepEqual(extractNumbers('1,234 stars, 70% JS, on 2021-03-04, v2 Python3 3D 1.5'), [1234, 70, 2021, 3, 4, 1.5]);
});

test('parseJson accepts fenced JSON and JSON with extra text around it', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Sure! Here it is: {"a":2} Hope that helps.'), { a: 2 });
});

test('valid summary passes; invented numbers and fake files are rejected', () => {
  assert.deepEqual(validateSummary(goodSummary, result), []);
  assert.match(validateSummary({ ...goodSummary, what_it_does: 'Has 9000 users.' }, result).join(' '), /9000/);
  assert.match(validateSummary({ ...goodSummary, read_first: ['README.md', 'src/secret.py'] }, result).join(' '), /src\/secret\.py/);
  assert.ok(validateSummary('text', result).length);
  assert.ok(validateSummary({ what_it_does: 'x' }, result).length);
});

test('validateOutput checks a full { summary, roast } result (used by the smoke test)', () => {
  assert.deepEqual(validateOutput({ summary: goodSummary, roast: ['42 stars, a slow burn.', '1,234 commits.', 'Created 2021-03-04.'] }, result), []);
  assert.ok(validateOutput({ summary: goodSummary, roast: ['too', 'few'] }, result).length);
  assert.match(validateOutput({ summary: goodSummary, roast: ['42 stars.', '777 forks.', 'ok line here'] }, result).join(' '), /777/);
});

test('writeSummary retries after bad JSON and invented facts, then accepts a valid answer', async () => {
  const p = fakeProvider(['not json', { summary: { ...goodSummary, what_it_does: 'Used by 999 companies.' } }, { summary: goodSummary }]);
  const out = await writeSummary(result, p);
  assert.equal(out.attempts, 3);
  assert.equal(out.by, 'fake (test)');
  assert.deepEqual(out.summary, goodSummary);
  assert.match(p.calls[1].user, /not valid JSON/);
  assert.match(p.calls[2].user, /999/);
});

test('writeSummary falls back to offline when the AI keeps failing', async () => {
  const p = fakeProvider([new Error('boom'), new Error('boom'), new Error('boom')]);
  const out = await writeSummary(result, p);
  assert.match(out.by, /offline templates/);
  assert.equal(out.warnings.length, 3);
  assert.ok(out.summary.what_it_does);
});

test('write() combines summary + roast; jokes keep their evidence cards', async () => {
  const out = await write(repoResult(), { summary: null, humor: null }, { intensity: 'savage' });
  assert.ok(out.summary.what_it_does);
  assert.ok(out.roast.length >= 3);
  assert.equal(out.roast[0], out.jokes[0].text);
  assert.ok(out.jokes.every((j) => j.cards.every((id) => out.cards.some((c) => c.id === id))));
  assert.equal(out.generatedBy, 'offline templates');
});

test('summary prompt contains every evidence row and the strict rules', () => {
  const { system, user } = buildPrompt(result);
  for (const e of result.evidence) assert.ok(user.includes(e.value));
  assert.match(system, /ONLY the facts/);
  assert.match(system, /JSON only/);
});

test('getProvider: summary and humor roles, auto order, offline', () => {
  assert.equal(getProvider({}), null);
  assert.equal(getProvider({ AI_PROVIDER: 'offline', GROQ_API_KEY: 'k' }), null);
  assert.equal(getProvider({ GROQ_API_KEY: 'k' }).name, 'groq');
  assert.equal(getProvider({ GEMINI_API_KEY: 'k' }).name, 'gemini');
  assert.equal(getProvider({ OPENROUTER_API_KEY: 'k' }).name, 'openrouter');
  assert.equal(getProvider({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'k', GROQ_API_KEY: 'k' }).name, 'gemini');
  assert.equal(getProvider({ AI_PROVIDER: 'ollama' }).name, 'ollama');
  assert.equal(getProvider({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' }).model, 'gemini-x');
  // humor model: separate when set, otherwise same as summary
  const env = { GROQ_API_KEY: 'k', HUMOR_PROVIDER: 'ollama', HUMOR_MODEL: 'qwen2.5:7b' };
  assert.equal(getProvider(env, 'summary').name, 'groq');
  assert.deepEqual([getProvider(env, 'humor').name, getProvider(env, 'humor').model], ['ollama', 'qwen2.5:7b']);
  assert.equal(getProvider({ GROQ_API_KEY: 'k' }, 'humor').name, 'groq');
  assert.equal(getProvider({ GROQ_API_KEY: 'k', HUMOR_PROVIDER: 'offline' }, 'humor'), null);
});

test('createProvider parses "provider:model" (model names may contain ":")', () => {
  const p = createProvider('openrouter:meta-llama/llama-3.3-70b-instruct:free', { OPENROUTER_API_KEY: 'k' });
  assert.deepEqual([p.name, p.model], ['openrouter', 'meta-llama/llama-3.3-70b-instruct:free']);
  assert.equal(createProvider('groq:x', {}), null, 'missing key -> null');
});

test('withDiskCache answers identical requests from disk', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-cache-'));
  let calls = 0;
  const base = { name: 'fake', model: 'm', generate: async () => `answer ${++calls}` };
  const cached = withDiskCache(base, dir);
  assert.equal(await cached.generate('s', 'u', { temperature: 1 }), 'answer 1');
  assert.equal(await withDiskCache(base, dir).generate('s', 'u', { temperature: 1 }), 'answer 1', 'second client reads from disk');
  assert.equal(await cached.generate('s', 'other', { temperature: 1 }), 'answer 2');
  assert.equal(calls, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});
