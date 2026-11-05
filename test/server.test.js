// End-to-end tests of the HTTP endpoints, with GitHub replaced by saved fixtures.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFixture, replayFetch } = require('./helpers');
const { createGithubClient } = require('../src/githubClient');
const { createApp } = require('../src/server');

function startServer(fetchImpl, provider = null) {
  const gh = createGithubClient({ fetchImpl });
  const app = createApp({ env: {}, gh, provider });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

const allFixtures = {
  responses: Object.assign(
    {},
    loadFixture('repo-hello-world').responses,
    loadFixture('repo-cors').responses,
    loadFixture('profile-octocat').responses
  ),
};

test('GET /repo/:owner/:name returns summary, roast and evidence', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const res = await fetch(`${base}/repo/expressjs/cors`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.kind, 'repo');
  assert.equal(body.target, 'expressjs/cors');
  assert.ok(body.summary.what_it_does.includes('CORS'));
  assert.deepEqual(body.summary.read_first, ['README.md', 'package.json', 'lib/index.js']);
  assert.ok(body.roast.length >= 3);
  assert.ok(body.evidence.find((e) => e.key === 'commit_count' && e.value === '351'));
  assert.match(body.generatedBy, /offline/);

  const again = await (await fetch(`${base}/repo/expressjs/cors`)).json();
  assert.equal(again.cached, true, 'second request is served from the result cache');
});

test('GET /profile/:username works', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const res = await fetch(`${base}/profile/octocat`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.kind, 'profile');
  assert.ok(body.summary.what_they_build);
  assert.ok(body.summary.notable_repos.length > 0);
  assert.ok(body.evidence.length > 10);
});

test('unknown repo -> 404 with NOT_FOUND message', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const res = await fetch(`${base}/repo/someone/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.match(body.error.message, /private/);
});

test('invalid names -> 400', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const res = await fetch(`${base}/profile/${encodeURIComponent('bad name!')}`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'BAD_INPUT');
});

test('GitHub rate limit -> 429 with RATE_LIMITED', async (t) => {
  const limited = async () => new Response('{"message":"API rate limit exceeded"}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' } });
  const { server, base } = await startServer(limited);
  t.after(() => server.close());
  const res = await fetch(`${base}/repo/a/b`);
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error.code, 'RATE_LIMITED');
  assert.ok(body.error.resetAt);
});

test('GitHub unreachable -> 502 with NETWORK_ERROR', async (t) => {
  const offline = async () => {
    throw new TypeError('fetch failed');
  };
  const { server, base } = await startServer(offline);
  t.after(() => server.close());
  const res = await fetch(`${base}/profile/someone`);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error.code, 'NETWORK_ERROR');
});

test('?intensity= changes the roast, returns jokes with evidence cards, and is validated', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const mild = await (await fetch(`${base}/repo/octocat/Hello-World?intensity=mild`)).json();
  const savage = await (await fetch(`${base}/repo/octocat/Hello-World?intensity=savage`)).json();
  assert.equal(mild.intensity, 'mild');
  assert.equal(savage.intensity, 'savage');
  assert.notDeepEqual(mild.roast, savage.roast, 'each intensity has its own wording (and cache entry)');
  for (const j of savage.jokes) assert.ok(j.cards.length && j.cards.every((id) => savage.cards.some((c) => c.id === id)));
  assert.equal(savage.cards[0].angle, 'abandoned');
  const bad = await fetch(`${base}/repo/octocat/Hello-World?intensity=nuclear`);
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error.message, /mild, medium, savage/);
});

test('/ shows a help message instead of an error', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).try.includes('/health'));
});

test('/health reports the AI mode', async (t) => {
  const { server, base } = await startServer(replayFetch(allFixtures));
  t.after(() => server.close());
  const body = await (await fetch(`${base}/health`)).json();
  assert.equal(body.ok, true);
  assert.equal(body.ai, 'offline templates');
});
