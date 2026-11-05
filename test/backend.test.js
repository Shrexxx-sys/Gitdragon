// Backend tests for Part B: cache (with last-updated marker), per-install daily limits, AI quota
// fallback, expired GitHub token, cache deletion, share pages, and the Supabase store (against a
// fake Supabase REST server). GitHub is replaced by saved fixtures; the AI by fake models.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { loadFixture, replayFetch } = require('./helpers');
const { createGithubClient } = require('../src/githubClient');
const { createApp } = require('../src/server');
const { memoryStore, supabaseStore, shareIdFor } = require('../src/store');
const { clientHash } = require('../src/service');
const { renderSharePage } = require('../src/sharePage');

const fixtures = {
  responses: Object.assign({}, loadFixture('repo-hello-world').responses, loadFixture('repo-cors').responses, loadFixture('profile-octocat').responses),
};

/** A fake AI that answers the summary, writer and critic prompts with valid JSON, and counts calls. */
function goodAI() {
  const ai = {
    name: 'fake',
    model: 'good',
    calls: 0,
    async generate(system, user) {
      ai.calls++;
      if (/technical writer/.test(system)) {
        return JSON.stringify(/what_they_build/.test(system) ? { summary: { what_they_build: 'Demo projects.', main_languages: 'HTML', notable_repos: [] } } : { summary: { what_it_does: 'A project.', how_to_run: 'See the README.', read_first: [] } });
      }
      // Build jokes from the evidence cards in the prompt: "C1 (angle: x): ... | must mention at least one of: [detail] ..."
      const cards = [...user.matchAll(/^(C\d+) \(angle: [^)]+\).*must mention at least one of: \[([^\]]+)\]/gm)].map((m) => ({ id: m[1], detail: m[2] }));
      const openers = ['Exhibit A:', 'Also noted:', 'For the record,', 'Item four:', 'Finally,'];
      const jokes = cards.slice(0, 5).map((c, i) => ({ text: `${openers[i]} "${c.detail}" and the case closes itself.`, cards: [c.id] }));
      if (/head writer/.test(system)) return JSON.stringify({ roast: jokes.slice(0, 4), rejected: [] });
      return JSON.stringify({ candidates: [...jokes, ...jokes] });
    },
  };
  return ai;
}

function failingAI(message) {
  const ai = {
    name: 'fake',
    model: 'broken',
    calls: 0,
    async generate() {
      ai.calls++;
      throw new Error(message);
    },
  };
  return ai;
}

async function start({ provider = goodAI(), env = {}, store = memoryStore(), fetchImpl = replayFetch(fixtures), token = '' } = {}) {
  const gh = createGithubClient({ fetchImpl, token });
  const app = createApp({ env, gh, provider, store });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (path, installId = 'install-aaaa-1111') => {
    const res = await fetch(base + path, { headers: { 'X-Install-Id': installId } });
    return { status: res.status, body: res.headers.get('content-type').includes('json') ? await res.json() : await res.text() };
  };
  return { server, base, get, provider, store, gh };
}

test('cache: a second identical request is served from the cache and never calls the AI again', async (t) => {
  const s = await start();
  t.after(() => s.server.close());
  const first = await s.get('/repo/expressjs/cors?intensity=medium');
  assert.equal(first.status, 200);
  assert.equal(first.body.aiStatus, 'ok');
  assert.match(first.body.generatedBy, /fake \(good\)/);
  const callsAfterFirst = s.provider.calls;
  assert.ok(callsAfterFirst >= 3, 'summary + writer + critic');

  const second = await s.get('/repo/expressjs/cors?intensity=medium', 'someone-else-2222');
  assert.equal(second.body.cached, true);
  assert.equal(s.provider.calls, callsAfterFirst, 'no AI call on a cache hit (even for another install)');
  assert.deepEqual(second.body.roast, first.body.roast);

  await s.get('/repo/expressjs/cors?intensity=savage');
  assert.ok(s.provider.calls > callsAfterFirst, 'another intensity is a different cache entry');
  const before = s.provider.calls;
  await s.get('/repo/expressjs/cors?intensity=savage&fresh=1');
  assert.ok(s.provider.calls > before, 'fresh=1 skips the cache');
});

test('cache key includes the last-updated marker: a pushed repo gets a new analysis', async (t) => {
  let pushedAt = '2026-01-01T00:00:00Z';
  const replay = replayFetch(fixtures);
  const fetchImpl = async (url, opts) => {
    const res = await replay(url, opts);
    if (url === 'https://api.github.com/repos/expressjs/cors') {
      const body = JSON.parse(await res.text());
      body.pushed_at = pushedAt;
      return new Response(JSON.stringify(body), { status: 200 });
    }
    return res;
  };
  const gh = createGithubClient({ fetchImpl, freshMs: 0 });
  const provider = goodAI();
  const app = createApp({ env: {}, gh, provider, store: memoryStore() });
  const server = await new Promise((r) => {
    const x = app.listen(0, () => r(x));
  });
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/repo/expressjs/cors`;
  await fetch(url);
  const calls = provider.calls;
  assert.equal((await (await fetch(url)).json()).cached, true);
  pushedAt = '2026-02-02T00:00:00Z';
  const after = await (await fetch(url)).json();
  assert.equal(after.cached, undefined, 'new marker -> new analysis');
  assert.ok(provider.calls > calls);
});

test('daily limits per install: AI allowance -> offline roast with a friendly note -> hard limit error', async (t) => {
  const s = await start({ env: { AI_DAILY_LIMIT: '2', HARD_DAILY_LIMIT: '3' } });
  t.after(() => s.server.close());
  const id = 'install-limit-3333';
  for (let i = 1; i <= 2; i++) assert.equal((await s.get('/repo/expressjs/cors?fresh=1', id)).body.aiStatus, 'ok', `request ${i} uses the AI`);
  const calls = s.provider.calls;
  const third = await s.get('/repo/expressjs/cors?fresh=1', id);
  assert.equal(third.status, 200, 'still a full answer');
  assert.equal(third.body.aiStatus, 'daily_limit');
  assert.equal(s.provider.calls, calls, 'the AI is not called over the allowance');
  assert.match(third.body.notices[0], /today's 2 AI-written analyses/);
  assert.ok(third.body.summary && third.body.roast.length >= 3 && third.body.evidence.length > 10, 'facts, summary and offline roast');
  const fourth = await s.get('/repo/expressjs/cors?fresh=1', id);
  assert.equal(fourth.status, 429);
  assert.equal(fourth.body.error.code, 'DAILY_LIMIT');
  assert.match(fourth.body.error.message, /resets at midnight UTC/);
  // another install is not affected; cache hits don't count
  assert.equal((await s.get('/repo/expressjs/cors?fresh=1', 'install-other-4444')).body.aiStatus, 'ok');
  assert.equal((await s.get('/repo/expressjs/cors', id)).body.cached, true, 'cached answers are served even over the limit');
});

test('privacy: daily counters store only a salted hash, never the raw install ID or IP', async (t) => {
  const inner = memoryStore();
  const seen = [];
  const store = { ...inner, incrementUsage: (h, d) => (seen.push(h), inner.incrementUsage(h, d)) };
  const s = await start({ store, env: { HASH_SALT: 'pepper' } });
  t.after(() => s.server.close());
  await s.get('/profile/octocat', 'install-secret-5555');
  assert.equal(seen.length, 1);
  assert.match(seen[0], /^[a-f0-9]{32}$/);
  assert.ok(!seen[0].includes('install-secret'));
  assert.equal(seen[0], clientHash('pepper', { installId: 'install-secret-5555' }));
  assert.notEqual(clientHash('pepper', { installId: 'install-secret-5555' }), clientHash('other-salt', { installId: 'install-secret-5555' }));
});

test('AI quota exhausted -> facts + summary + offline roast, a clear note, and the fallback is NOT cached', async (t) => {
  const provider = failingAI('AI HTTP 429: RESOURCE_EXHAUSTED quota exceeded');
  const s = await start({ provider });
  t.after(() => s.server.close());
  const r = await s.get('/repo/octocat/Hello-World');
  assert.equal(r.status, 200);
  assert.equal(r.body.aiStatus, 'quota');
  assert.match(r.body.notices[0], /free AI quota is used up/);
  assert.ok(r.body.summary.what_it_does && r.body.roast.length >= 3 && r.body.evidence.length > 5);
  assert.equal(r.body.aiWarnings, undefined, 'internal AI errors are not sent to users');
  const calls = provider.calls;
  const again = await s.get('/repo/octocat/Hello-World');
  assert.equal(again.body.cached, undefined, 'a fallback answer is not cached');
  assert.ok(provider.calls > calls, 'the AI is tried again next time');
});

test('AI failure (not quota) -> offline roast with a different note', async (t) => {
  const s = await start({ provider: failingAI('socket hang up') });
  t.after(() => s.server.close());
  const r = await s.get('/profile/octocat');
  assert.equal(r.body.aiStatus, 'failed');
  assert.match(r.body.notices[0], /didn't answer properly/);
});

test('expired GitHub token (401): falls back to public access, says so, /health shows it', async (t) => {
  const replay = replayFetch(fixtures);
  const fetchImpl = (url, opts) => (opts && opts.headers && opts.headers.Authorization ? Promise.resolve(new Response('{"message":"Bad credentials"}', { status: 401 })) : replay(url, opts));
  const s = await start({ fetchImpl, token: 'expired-token' });
  t.after(() => s.server.close());
  const r = await s.get('/repo/expressjs/cors');
  assert.equal(r.status, 200);
  assert.ok(r.body.notices.some((n) => /GitHub token has expired/.test(n)));
  const health = await s.get('/health');
  assert.match(health.body.githubToken, /EXPIRED/);
});

test('GitHub refusing even public access with 401 -> GITHUB_AUTH error', async (t) => {
  const s = await start({ fetchImpl: async () => new Response('{"message":"Bad credentials"}', { status: 401 }) });
  t.after(() => s.server.close());
  const r = await s.get('/repo/expressjs/cors');
  assert.equal(r.status, 502);
  assert.equal(r.body.error.code, 'GITHUB_AUTH');
});

test('delete cached result: DELETE /cache/... removes every intensity of that target', async (t) => {
  const s = await start();
  t.after(() => s.server.close());
  await s.get('/repo/expressjs/cors?intensity=mild');
  await s.get('/repo/expressjs/cors?intensity=savage');
  const del = await fetch(`${s.base}/cache/repo/ExpressJS/cors`, { method: 'DELETE' });
  assert.deepEqual(await del.json(), { deleted: 2 });
  assert.equal((await s.get('/repo/expressjs/cors?intensity=mild')).body.cached, undefined);
  const bad = await fetch(`${s.base}/cache/profile/${encodeURIComponent('bad name!')}`, { method: 'DELETE' });
  assert.equal(bad.status, 400);
});

test('share link: the result includes a link to a public page with the roast, the dragon and the evidence', async (t) => {
  const s = await start();
  t.after(() => s.server.close());
  const r = await s.get('/repo/octocat/Hello-World?intensity=savage');
  assert.match(r.body.shareUrl, /^http:\/\/127\.0\.0\.1:\d+\/share\/[a-f0-9]{16}$/);
  const page = await fetch(r.body.shareUrl);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /octocat\/Hello-World/);
  assert.match(html, /\/mascot\/dragon-fire\.mp4/);
  assert.match(html, /Evidence: /);
  assert.ok(r.body.jokes.every((j) => html.includes(j.text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'))));
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  const video = await fetch(`${s.base}/mascot/dragon-fire.mp4`);
  assert.equal(video.status, 200);
  assert.equal((await fetch(`${s.base}/share/0000000000000000`)).status, 404);
  assert.equal((await fetch(`${s.base}/share/../../etc`)).status, 404);
});

test('share page escapes everything (no HTML or script injection from GitHub data)', () => {
  const html = renderSharePage(
    {
      target: '<script>alert(1)</script>',
      url: 'javascript:alert(1)"',
      kind: 'repo',
      jokes: [{ text: '<img src=x onerror=alert(1)>', cards: ['C1'] }],
      cards: [{ id: 'C1', fact: '"><b>bold</b>', source_url: 'https://evil.example.com' }],
      evidence: [{ label: '<i>x</i>', value: '<svg onload=alert(1)>', source: 'https://api.github.com/repos/a/b' }],
    },
    'http://x'
  );
  assert.ok(!/<script>alert|<img src=x|<svg onload|<b>bold/.test(html));
  assert.ok(!html.includes('href="https://evil.example.com"'), 'only GitHub links become links');
});

test('a broken store never breaks the analysis', async (t) => {
  const boom = async () => {
    throw new Error('store down');
  };
  const s = await start({ store: { kind: 'broken', getResult: boom, putResult: boom, getShare: boom, deleteTarget: boom, incrementUsage: boom } });
  t.after(() => s.server.close());
  const r = await s.get('/repo/expressjs/cors');
  assert.equal(r.status, 200);
  assert.ok(r.body.roast.length >= 3);
  assert.equal(r.body.shareUrl, undefined, 'no share link when nothing could be stored');
});

// ---------- Supabase store against a fake Supabase (PostgREST) server ----------
function fakeSupabase(serviceKey) {
  const rows = [];
  const usage = new Map();
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, 'http://x');
    requests.push({ method: req.method, path: url.pathname, apikey: req.headers.apikey, auth: req.headers.authorization, prefer: req.headers.prefer });
    if (req.headers.apikey !== serviceKey || req.headers.authorization !== `Bearer ${serviceKey}`) {
      res.statusCode = 401;
      return res.end('{"message":"bad key"}');
    }
    const eq = (name) => {
      const v = url.searchParams.get(name);
      return v && v.startsWith('eq.') ? v.slice(3) : null;
    };
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/rest/v1/rpc/increment_usage') {
      const { p_install, p_day } = JSON.parse(body);
      const k = `${p_install}|${p_day}`;
      usage.set(k, (usage.get(k) || 0) + 1);
      return res.end(String(usage.get(k)));
    }
    if (url.pathname !== '/rest/v1/autopsy_cache') {
      res.statusCode = 404;
      return res.end('{}');
    }
    const now = new Date().toISOString();
    if (req.method === 'GET') {
      const key = eq('key');
      const share = eq('share_id');
      const found = rows.filter((r) => (key ? r.key === key : r.share_id === share) && r.expires_at > now);
      return res.end(JSON.stringify(found.map((r) => ({ data: r.data }))));
    }
    if (req.method === 'POST') {
      for (const row of JSON.parse(body)) {
        const i = rows.findIndex((r) => r.key === row.key);
        if (i >= 0) rows[i] = row;
        else rows.push(row);
      }
      res.statusCode = 201;
      return res.end('');
    }
    if (req.method === 'DELETE') {
      const kind = eq('kind');
      const target = eq('target');
      const gone = rows.filter((r) => (kind ? r.kind === kind && r.target === target : r.expires_at < now));
      for (const g of gone) rows.splice(rows.indexOf(g), 1);
      return res.end(req.headers.prefer && req.headers.prefer.includes('return=representation') ? JSON.stringify(gone) : '');
    }
    res.statusCode = 405;
    res.end('{}');
  });
  return { server, rows, usage, requests };
}

test('Supabase store: cache, share, usage counter and delete through the real REST format', async (t) => {
  const fake = fakeSupabase('service-key-xyz');
  await new Promise((r) => fake.server.listen(0, r));
  t.after(() => fake.server.close());
  const store = supabaseStore({ url: `http://127.0.0.1:${fake.server.address().port}`, serviceKey: 'service-key-xyz' });
  assert.equal(store.kind, 'supabase');

  const s = await start({ store });
  t.after(() => s.server.close());
  const first = await s.get('/repo/expressjs/cors?intensity=mild');
  assert.equal(first.status, 200);
  assert.equal(fake.rows.length, 1);
  const row = fake.rows[0];
  assert.match(row.key, /^v3:repo:expressjs\/cors:mild:/, 'key = version:kind:target:intensity:marker');
  assert.equal(row.share_id, shareIdFor(row.key));
  assert.ok(new Date(row.expires_at) > new Date(), 'has an expiry');
  assert.equal([...fake.usage.values()][0], 1);

  const calls = s.provider.calls;
  const second = await s.get('/repo/expressjs/cors?intensity=mild');
  assert.equal(second.body.cached, true);
  assert.equal(s.provider.calls, calls, 'Supabase cache hit: no AI call');

  const share = await fetch(first.body.shareUrl);
  assert.equal(share.status, 200);

  const del = await (await fetch(`${s.base}/cache/repo/expressjs/cors`, { method: 'DELETE' })).json();
  assert.deepEqual(del, { deleted: 1 });
  assert.equal(fake.rows.length, 0);
  assert.ok(fake.requests.every((r) => r.apikey === 'service-key-xyz'), 'every request is authenticated with the server-side key');
  const health = await s.get('/health');
  assert.equal(health.body.store, 'supabase');
});
