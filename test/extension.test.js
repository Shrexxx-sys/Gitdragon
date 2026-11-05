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

const jokeData = {
  ...sampleData,
  intensity: 'savage',
  roast: ['705 days flatlined (2022-05-14 to 2024-04-19), then a pulse.', 'Second line.', 'Third line.'],
  jokes: [
    { text: '705 days flatlined (2022-05-14 to 2024-04-19), then a pulse.', cards: ['C1'] },
    { text: 'Second line.', cards: ['C2'] },
    { text: 'Third line.', cards: [] },
  ],
  cards: [
    { id: 'C1', angle: 'long_gap', fact: 'Once went 705 days without a commit (2022-05-14 to 2024-04-19).', number: 705, exact_quote: null, source_url: 'https://api.github.com/repos/expressjs/cors/commits?per_page=100' },
    { id: 'C2', angle: 'latest_message', fact: 'The most recent commit message is "docs: tweak".', number: null, exact_quote: 'docs: tweak', source_url: 'https://api.github.com/repos/expressjs/cors/commits' },
  ],
};

test('panel: intensity selector sends the chosen intensity and keeps one result per intensity', () => {
  const { w, sent, $, $$ } = loadPanel('https://github.com/expressjs/cors', (msg, cb) => cb({ ok: true, data: { ...jokeData, intensity: msg.intensity } }));
  try {
    $('.tab').click();
    assert.deepEqual($$('.intensity .seg').map((b) => b.textContent), ['Mild', 'Medium', 'Savage']);
    assert.equal($('.intensity .seg.active').dataset.intensity, 'medium', 'medium is the default');
    $('.intensity .seg[data-intensity="savage"]').click();
    assert.equal($('.intensity .seg.active').dataset.intensity, 'savage');
    $('button.run').click();
    assert.equal(sent[0].intensity, 'savage');
    assert.match($('.body').textContent, /The Autopsy · savage/);
    // switching to mild shows that intensity's own (empty) state, not the savage result
    $('.intensity .seg[data-intensity="mild"]').click();
    assert.equal($$('ol.roast li').length, 0);
    $('.intensity .seg[data-intensity="savage"]').click();
    assert.equal($$('ol.roast li').length, 3, 'savage result is still there');
  } finally {
    w.close();
  }
});

test('panel: "Why this joke?" reveals the evidence card behind each line', () => {
  const { w, $, $$ } = loadPanel('https://github.com/expressjs/cors', (msg, cb) => cb({ ok: true, data: jokeData }));
  try {
    $('.tab').click();
    $('button.run').click();
    const items = $$('ol.roast li');
    assert.equal(items.length, 3);
    assert.equal($$('.why-btn').length, 2, 'only jokes with cards get the button');
    const why = items[0].querySelector('.why');
    assert.equal(why.hidden, true);
    items[0].querySelector('.why-btn').click();
    assert.equal(why.hidden, false);
    assert.match(why.textContent, /long gap/);
    assert.match(why.textContent, /705 days without a commit/);
    assert.equal(why.querySelector('a').getAttribute('href'), 'https://api.github.com/repos/expressjs/cors/commits?per_page=100');
    assert.match(items[1].querySelector('.why').textContent, /Exact quote: "docs: tweak"/);
    items[0].querySelector('.why-btn').click();
    assert.equal(why.hidden, true, 'click again hides it');
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
    URLSearchParams,
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
    if (req.url === '/repo/expressjs/cors?intensity=savage&fresh=1') return res.end(JSON.stringify({ target: 'expressjs/cors' }));
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'nope' } }));
  });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const send = loadBackground({ backendUrl: `http://127.0.0.1:${server.address().port}` });

  const ok = await send({ type: 'GIT_AUTOPSY_RUN', page: { type: 'repo', owner: 'expressjs', name: 'cors' }, fresh: true, intensity: 'savage' });
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
