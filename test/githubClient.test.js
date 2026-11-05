// Error handling + caching in the GitHub client.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createGithubClient, lastPageFromLink } = require('../src/githubClient');
const { collectRepo } = require('../src/collectors/repoCollector');
const { collectProfile } = require('../src/collectors/profileCollector');

const notFound = async () => new Response('{"message":"Not Found"}', { status: 404 });

test('404 repo -> NOT_FOUND error (private or missing)', async () => {
  const gh = createGithubClient({ fetchImpl: notFound });
  await assert.rejects(collectRepo(gh, 'someone', 'secret-repo'), (err) => err.code === 'NOT_FOUND' && err.status === 404 && /private/.test(err.message));
});

test('404 user -> NOT_FOUND error', async () => {
  const gh = createGithubClient({ fetchImpl: notFound });
  await assert.rejects(collectProfile(gh, 'nobody-here'), (err) => err.code === 'NOT_FOUND');
});

test('rate limit -> RATE_LIMITED with reset time', async () => {
  const reset = Math.floor(Date.now() / 1000) + 600;
  const gh = createGithubClient({
    fetchImpl: async () =>
      new Response('{"message":"API rate limit exceeded"}', { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } }),
  });
  await assert.rejects(gh.get('/users/x'), (err) => err.code === 'RATE_LIMITED' && err.status === 429 && err.extra.resetAt === new Date(reset * 1000).toISOString());
});

test('network failure -> NETWORK_ERROR', async () => {
  const gh = createGithubClient({
    fetchImpl: async () => {
      const e = new TypeError('fetch failed');
      e.cause = { code: 'ENOTFOUND' };
      throw e;
    },
  });
  await assert.rejects(gh.get('/users/x'), (err) => err.code === 'NETWORK_ERROR' && /ENOTFOUND/.test(err.message));
});

test('other GitHub errors -> GITHUB_ERROR', async () => {
  const gh = createGithubClient({ fetchImpl: async () => new Response('{"message":"Server Error"}', { status: 500 }) });
  await assert.rejects(gh.get('/users/x'), (err) => err.code === 'GITHUB_ERROR');
});

test('disk cache re-validates with ETag and reuses data on 304', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autopsy-cache-'));
  const seen = [];
  const fetchImpl = async (url, opts) => {
    seen.push(opts.headers['If-None-Match'] || null);
    if (opts.headers['If-None-Match'] === '"abc"') return new Response(null, { status: 304 });
    return new Response('{"login":"x"}', { status: 200, headers: { etag: '"abc"' } });
  };
  const gh1 = createGithubClient({ cacheDir: dir, fetchImpl, freshMs: 0 });
  assert.deepEqual((await gh1.get('/users/x')).data, { login: 'x' });
  const gh2 = createGithubClient({ cacheDir: dir, fetchImpl, freshMs: 0 }); // new client = reads from disk
  assert.deepEqual((await gh2.get('/users/x')).data, { login: 'x' });
  assert.deepEqual(seen, [null, '"abc"']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('when rate limited, an older cached copy is used instead of failing', async () => {
  let limited = false;
  const fetchImpl = async () =>
    limited
      ? new Response('{"message":"API rate limit exceeded"}', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })
      : new Response('{"login":"x"}', { status: 200, headers: { etag: '"e1"' } });
  const gh = createGithubClient({ fetchImpl, freshMs: 0 });
  await gh.get('/users/x');
  limited = true;
  assert.deepEqual((await gh.get('/users/x')).data, { login: 'x' });
  await assert.rejects(gh.get('/users/never-fetched'), (err) => err.code === 'RATE_LIMITED');
});

test('token is sent as a Bearer header', async () => {
  let auth;
  const gh = createGithubClient({
    token: 'tok123',
    fetchImpl: async (url, opts) => {
      auth = opts.headers.Authorization;
      return new Response('{}', { status: 200 });
    },
  });
  await gh.get('/users/x');
  assert.equal(auth, 'Bearer tok123');
});

test('lastPageFromLink reads the commit count trick', () => {
  const link =
    '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=351>; rel="last"';
  assert.equal(lastPageFromLink(link), 351);
  assert.equal(lastPageFromLink(''), null);
});
