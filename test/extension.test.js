// Tests for the Chrome extension: manifest, page detection, panel rendering (in jsdom) and the background worker.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { JSDOM } = require('jsdom');
const { detectPage } = require('../extension/pageDetect');

const EXT = path.join(__dirname, '..', 'extension');
const read = (f) => fs.readFileSync(path.join(EXT, f), 'utf8');

test('manifest is valid MV3 and every referenced file exists', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.manifest_version, 3);
  assert.ok(fs.existsSync(path.join(EXT, m.background.service_worker)));
  for (const cs of m.content_scripts) for (const js of cs.js) assert.ok(fs.existsSync(path.join(EXT, js)), js);
  for (const icon of Object.values(m.icons)) assert.ok(fs.existsSync(path.join(EXT, icon)), icon);
  assert.deepEqual(m.content_scripts[0].js, ['pageDetect.js', 'content.js'], 'pageDetect must load before content');
  assert.ok(m.host_permissions.includes('http://localhost:3000/*'));
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

// ---------- content script in a fake browser ----------
function loadPanel(url, onMessage) {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><main>GitHub page</main></body></html>', { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const sent = [];
  w.chrome = {
    runtime: {
      lastError: null,
      sendMessage(msg, cb) {
        sent.push(msg);
        onMessage(msg, cb);
      },
    },
  };
  w.eval(read('pageDetect.js'));
  w.eval(read('content.js'));
  const shadow = w.__gitAutopsy.shadow;
  return { w, shadow, sent, $: (s) => shadow.querySelector(s), $$: (s) => [...shadow.querySelectorAll(s)] };
}

const sampleData = {
  kind: 'repo',
  target: 'expressjs/cors',
  summary: { what_it_does: 'Node.js CORS middleware.', how_to_run: 'Run `npm install cors`.', read_first: ['README.md', 'lib/index.js'] },
  roast: ['705 days without a commit.', '<img src=x onerror="window.hacked=1"> is just text here', 'Third line.'],
  evidence: [
    { key: 'stars', label: 'Stars', value: '6193', source: 'https://api.github.com/repos/expressjs/cors' },
    { key: 'readme_check', label: 'README check', value: '1 of 4', source: 'https://api.github.com/repos/{owner}/{repo}/readme' },
  ],
  notices: ['This repository is archived (read-only).'],
  generatedBy: 'offline templates',
  analysedAt: new Date().toISOString(),
};

test('panel: shows tab on repo pages, runs autopsy and renders summary, roast, evidence safely', () => {
  const { w, sent, $, $$ } = loadPanel('https://github.com/expressjs/cors', (msg, cb) => cb({ ok: true, data: sampleData }));
  try {
    assert.equal($('.tab').hidden, false);
    $('.tab').click();
    assert.ok($('.panel').classList.contains('open'));
    assert.equal($('.target').textContent, 'expressjs/cors');
    $('button.run').click();

    assert.equal(sent.length, 1);
    assert.deepEqual({ type: sent[0].type, pageType: sent[0].page.type, owner: sent[0].page.owner, name: sent[0].page.name }, { type: 'GIT_AUTOPSY_RUN', pageType: 'repo', owner: 'expressjs', name: 'cors' });

    const text = $('.body').textContent;
    assert.match(text, /What it does/);
    assert.match(text, /Node\.js CORS middleware\./);
    assert.equal($$('ol.roast li').length, 3);
    assert.equal($$('.ev').length, 2);
    assert.equal($$('.ev a').length, 1, 'only real URLs become links');
    assert.equal($$('.notice').length, 1);
    assert.ok($$('code').some((c) => c.textContent === 'npm install cors'), 'backticks rendered as code');
    assert.equal($$('img').length, 0, 'HTML inside data is never executed');
    assert.equal(w.hacked, undefined);
  } finally {
    w.close();
  }
});

test('panel: shows clear error messages', () => {
  const { w, $ } = loadPanel('https://github.com/someone/private-thing', (msg, cb) =>
    cb({ ok: false, error: { code: 'NOT_FOUND', message: 'Repository someone/private-thing was not found. It may be private, deleted, or misspelled.' } })
  );
  try {
    $('.tab').click();
    $('button.run').click();
    assert.match($('.error').textContent, /Not found \(or private\)/);
    assert.match($('.error').textContent, /may be private/);
  } finally {
    w.close();
  }
});

test('panel: follows GitHub navigation without reloads and hides on non-repo pages', () => {
  const { w, $ } = loadPanel('https://github.com/expressjs/cors', (msg, cb) => cb({ ok: true, data: sampleData }));
  try {
    $('.tab').click();
    w.history.pushState({}, '', '/torvalds');
    w.document.dispatchEvent(new w.Event('turbo:load'));
    assert.equal(w.__gitAutopsy.getPage().type, 'profile');
    assert.equal($('.target').textContent, 'torvalds');
    assert.match($('.kind').textContent, /profile/);

    w.history.pushState({}, '', '/settings/profile');
    w.document.dispatchEvent(new w.Event('turbo:load'));
    assert.equal(w.__gitAutopsy.getPage().type, 'none');
    assert.match($('.body').textContent, /Open a GitHub repository or a user profile/);
    $('.close').click();
    assert.equal($('.tab').hidden, true, 'tab hidden on pages that are not repos/profiles');
  } finally {
    w.close();
  }
});

// ---------- background worker ----------
function loadBackground(storage = {}) {
  let listener;
  const context = {
    chrome: {
      storage: { local: { get: async () => storage } },
      runtime: { onMessage: { addListener: (fn) => (listener = fn) } },
    },
    fetch,
    AbortSignal,
    encodeURIComponent,
    console,
  };
  vm.runInNewContext(read('background.js'), context);
  return (msg) =>
    new Promise((resolve) => {
      const keepOpen = listener(msg, {}, (r) => resolve(JSON.parse(JSON.stringify(r)))); // copy out of the vm sandbox
      assert.equal(keepOpen, true);
    });
}

test('background: calls the backend and passes results / errors through', async (t) => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/repo/expressjs/cors?fresh=1') return res.end(JSON.stringify({ target: 'expressjs/cors' }));
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'nope' } }));
  });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const send = loadBackground({ backendUrl: `http://127.0.0.1:${server.address().port}` });

  const ok = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'repo', owner: 'expressjs', name: 'cors' }, fresh: true });
  assert.deepEqual(ok, { ok: true, data: { target: 'expressjs/cors' } });

  const missing = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'profile', username: 'ghost' } });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'NOT_FOUND');
});

test('background: clear message when the backend is not running', async () => {
  const send = loadBackground({ backendUrl: 'http://127.0.0.1:1' });
  const res = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'profile', username: 'ghost' } });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'BACKEND_UNREACHABLE');
  assert.match(res.error.message, /npm start/);
});
