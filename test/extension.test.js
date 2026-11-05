// Tests for the Chrome extension: manifest, packaging safety, page detection and the background worker.
// (The dragon + analysis box UI is tested in dragon.test.js.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { detectPage } = require('../extension/pageDetect');

const EXT = path.join(__dirname, '..', 'extension');
const read = (f) => fs.readFileSync(path.join(EXT, f), 'utf8');

test('manifest is valid MV3, every referenced file exists, mascot files are web-accessible', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.manifest_version, 3);
  assert.ok(fs.existsSync(path.join(EXT, m.background.service_worker)));
  for (const cs of m.content_scripts) for (const js of cs.js) assert.ok(fs.existsSync(path.join(EXT, js)), js);
  for (const icon of Object.values(m.icons)) assert.ok(fs.existsSync(path.join(EXT, icon)), icon);
  assert.deepEqual(m.content_scripts[0].js, ['pageDetect.js', 'dragon.js', 'content.js'], 'load order: detection, dragon, then the box');
  assert.ok(m.host_permissions.includes('http://localhost:3000/*'));
  const war = m.web_accessible_resources[0];
  assert.deepEqual(war.resources, ['mascot/*']);
  assert.deepEqual(war.matches, ['https://github.com/*']);
  for (const f of ['dragon-idle.mp4', 'dragon-fire.mp4']) assert.ok(fs.existsSync(path.join(EXT, 'mascot', f)), f);
});

test('the extension contains no secrets and no external scripts', () => {
  for (const f of fs.readdirSync(EXT).filter((x) => x.endsWith('.js'))) {
    const src = read(f);
    assert.doesNotMatch(src, /github_pat_|ghp_[A-Za-z0-9]{20}|AIza[0-9A-Za-z_-]{20}|gsk_[A-Za-z0-9]{20}|sk-or-v1/, `${f} contains something that looks like a key`);
    assert.doesNotMatch(src, /<script[^>]+src=|importScripts\(['"]https?:/, `${f} loads an external script`);
  }
});

test('.env.example (committed to git) never contains real secrets', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]*(KEY|TOKEN|SECRET)[A-Z_]*)=(.*)$/);
    if (m) assert.equal(m[3].trim(), '', `${m[1]} must be empty in .env.example (put real values in .env)`);
  }
  assert.doesNotMatch(text, /github_pat_|ghp_|gsk_|AIza|sk-or-/, 'no key-looking strings');
});

test('page detection: repos, profiles and everything else', () => {
  const cases = {
    'https://github.com/expressjs/cors': { type: 'repo', owner: 'expressjs', name: 'cors' },
    'https://github.com/expressjs/cors/tree/master/lib': { type: 'repo', owner: 'expressjs', name: 'cors' },
    'https://github.com/facebook/react/issues/123': { type: 'repo', owner: 'facebook', name: 'react' },
    'https://github.com/vercel/next.js?tab=readme': { type: 'repo', owner: 'vercel', name: 'next.js' },
    'https://github.com/torvalds': { type: 'profile', username: 'torvalds' },
    'https://github.com/torvalds?tab=repositories': { type: 'profile', username: 'torvalds' },
    'https://github.com/': { type: 'none' },
    'https://github.com/settings/profile': { type: 'none' },
    'https://github.com/orgs/github/people': { type: 'none' },
    'https://github.com/marketplace': { type: 'none' },
    'https://github.com/trending': { type: 'none' },
    'https://gist.github.com/someone': { type: 'none' },
    'https://example.com/a/b': { type: 'none' },
  };
  for (const [url, expected] of Object.entries(cases)) {
    const got = detectPage(url);
    for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, `${url} -> ${k}`);
  }
});

// ---------- background worker ----------
function loadBackground(storage = {}) {
  let listener;
  const store = { ...storage };
  const context = {
    chrome: {
      storage: {
        local: {
          get: async (k) => (typeof k === 'string' ? { [k]: store[k] } : { ...store }),
          set: async (obj) => Object.assign(store, obj),
        },
      },
      runtime: { onMessage: { addListener: (fn) => (listener = fn) } },
    },
    crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' },
    fetch,
    AbortSignal,
    encodeURIComponent,
    URLSearchParams,
    console,
  };
  vm.runInNewContext(read('background.js'), context);
  const send = (msg) =>
    new Promise((resolve) => {
      const keepOpen = listener(msg, {}, (r) => resolve(JSON.parse(JSON.stringify(r)))); // copy out of the vm sandbox
      assert.equal(keepOpen, true);
    });
  return { send, store };
}

test('background: calls the backend with an anonymous install ID, passes results / errors through', async (t) => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, method: req.method, installId: req.headers['x-install-id'] });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/repo/expressjs/cors?intensity=savage&fresh=1') return res.end(JSON.stringify({ target: 'expressjs/cors' }));
    if (req.method === 'DELETE' && req.url === '/cache/repo/expressjs/cors') return res.end(JSON.stringify({ deleted: 3 }));
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'nope' } }));
  });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const { send, store } = loadBackground({ backendUrl: `http://127.0.0.1:${server.address().port}` });

  const ok = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'repo', owner: 'expressjs', name: 'cors' }, fresh: true, intensity: 'savage' });
  assert.deepEqual(ok, { ok: true, data: { target: 'expressjs/cors' } });
  assert.equal(seen[0].installId, '11111111-2222-4333-8444-555555555555');
  assert.equal(store.installId, '11111111-2222-4333-8444-555555555555', 'the ID is created once and remembered');

  const missing = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'profile', username: 'ghost' } });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'NOT_FOUND');

  const del = await send({ type: 'GIT_AUTOPSY_DELETE', page: { type: 'repo', owner: 'expressjs', name: 'cors' } });
  assert.deepEqual(del, { ok: true, data: { deleted: 3 } });
});

test('background: clear message when the backend is not reachable (local vs hosted wording)', async () => {
  const local = await loadBackground({ backendUrl: 'http://127.0.0.1:1' }).send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'profile', username: 'ghost' } });
  assert.equal(local.error.code, 'BACKEND_UNREACHABLE');
  assert.match(local.error.message, /npm start/);
  const hosted = await loadBackground({ backendUrl: 'https://does-not-exist.invalid' }).send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'profile', username: 'ghost' } });
  assert.equal(hosted.error.code, 'BACKEND_UNREACHABLE');
  assert.match(hosted.error.message, /internet connection/);
});
