// Dragon + analysis box tests in a simulated browser (jsdom).
// Covers: idle, hover -> fire -> back, click -> fire then box, run analysis, loading, errors, close,
// minimize, drag to a corner, auto-run, reduced motion, dark mode, and nothing injected on other pages.
// (scripts/browserCheck.js runs the same flows in a REAL Chrome on github.com.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { FIRE_BEFORE_OPEN_MS } = require('../extension/dragon');

const EXT = path.join(__dirname, '..', 'extension');
const read = (f) => fs.readFileSync(path.join(EXT, f), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const AFTER_FIRE = FIRE_BEFORE_OPEN_MS + 120;

/**
 * Loads the three content scripts into a fake github.com page.
 * @param onMessage (msg, reply) => void : plays the background worker
 */
function loadPage(url, onMessage = () => {}, { reducedMotion = false, colorMode = 'light', storage = {}, session = {} } = {}) {
  const dom = new JSDOM(`<!DOCTYPE html><html data-color-mode="${colorMode}"><head></head><body><main>GitHub page</main></body></html>`, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const played = new Set();
  // jsdom has no media playback: record play/pause instead.
  w.HTMLMediaElement.prototype.play = function () {
    played.add(this.className);
    Object.defineProperty(this, 'paused', { value: false, configurable: true });
    return Promise.resolve();
  };
  w.HTMLMediaElement.prototype.pause = function () {
    Object.defineProperty(this, 'paused', { value: true, configurable: true });
  };
  w.matchMedia = (q) => ({ matches: q.includes('reduced-motion') ? reducedMotion : false, addEventListener() {}, removeEventListener() {} });
  for (const [k, v] of Object.entries(session)) w.sessionStorage.setItem(k, v);
  const store = { ...storage };
  const sent = [];
  w.chrome = {
    runtime: {
      lastError: null,
      getURL: (p) => `chrome-extension://test-id/${p}`,
      sendMessage(msg, cb) {
        sent.push(msg);
        onMessage(msg, cb);
      },
    },
    storage: {
      local: {
        get: (keys, cb) => cb(Object.fromEntries([].concat(keys).map((k) => [k, store[k]]))),
        set: (obj) => Object.assign(store, obj),
      },
    },
  };
  w.eval(read('pageDetect.js'));
  w.eval(read('dragon.js'));
  w.eval(read('content.js'));
  const api = w.__gitAutopsy;
  const $ = (s) => api.shadow.querySelector(s);
  const $$ = (s) => [...api.shadow.querySelectorAll(s)];
  const pointer = (type, target, opts = {}) => target.dispatchEvent(new w.PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, ...opts }));
  const clickDragon = () => {
    pointer('pointerdown', $('.frame'), { clientX: 1300, clientY: 800 });
    pointer('pointerup', $('.frame'), { clientX: 1300, clientY: 800 });
  };
  return { w, api, $, $$, sent, store, played, pointer, clickDragon };
}

async function open(...args) {
  const p = loadPage(...args);
  await sleep(5); // let saved settings (async storage) load, like a real page
  return p;
}

const result = {
  kind: 'repo',
  target: 'expressjs/cors',
  intensity: 'medium',
  summary: { what_it_does: 'Node.js CORS middleware.', how_to_run: 'Run `npm install cors`.', read_first: ['README.md', 'lib/index.js'] },
  roast: ['705 days flatlined (2022-05-14 to 2024-04-19), then a pulse.', '<img src=x onerror="window.hacked=1"> stays text', 'Third line.'],
  jokes: [
    { text: '705 days flatlined (2022-05-14 to 2024-04-19), then a pulse.', cards: ['C1'] },
    { text: '<img src=x onerror="window.hacked=1"> stays text', cards: ['C2'] },
    { text: 'Third line.', cards: [] },
  ],
  cards: [
    { id: 'C1', angle: 'long_gap', fact: 'Once went 705 days without a commit (2022-05-14 to 2024-04-19).', number: 705, exact_quote: null, source_url: 'https://api.github.com/repos/expressjs/cors/commits?per_page=100' },
    { id: 'C2', angle: 'latest_message', fact: 'The most recent commit message is "docs: tweak".', number: null, exact_quote: 'docs: tweak', source_url: 'https://api.github.com/repos/expressjs/cors/commits' },
  ],
  evidence: [
    { key: 'stars', label: 'Stars', value: '6193', source: 'https://api.github.com/repos/expressjs/cors' },
    { key: 'readme_check', label: 'README check', value: '1 of 4', source: 'https://api.github.com/repos/{owner}/{repo}/readme' },
  ],
  notices: ['This repository is archived (read-only).'],
  generatedBy: 'gemini (gemini-3.5-flash), 2-pass',
  shareUrl: 'https://gitdragon.vercel.app/share/abc123',
  analysedAt: new Date().toISOString(),
};
const answer = (data) => (msg, cb) => cb({ ok: true, data: { ...data, intensity: msg.intensity } });

test('idle: dragon shown on a repo page, idle video autoplays muted + looping, fire preloaded and hidden', async () => {
  const { w, $, played } = await open('https://github.com/expressjs/cors');
  try {
    assert.ok(w.document.getElementById('git-autopsy-root'));
    const dock = $('.dock');
    assert.equal(dock.dataset.state, 'idle');
    assert.equal(dock.dataset.corner, 'br', 'bottom-right by default');
    const idle = $('video.idle');
    const fire = $('video.fire');
    assert.ok(idle.muted && idle.loop && idle.hasAttribute('autoplay') && idle.hasAttribute('playsinline'));
    assert.equal(idle.preload, 'auto');
    assert.equal(fire.preload, 'auto', 'fire is preloaded so switching is instant');
    assert.ok(played.has('idle'));
    assert.ok(!played.has('fire'));
    // WebM first (for a future transparent version), MP4 fallback, all from extension/mascot/
    assert.deepEqual([...idle.querySelectorAll('source')].map((s) => s.getAttribute('src')), ['chrome-extension://test-id/mascot/dragon-idle.webm', 'chrome-extension://test-id/mascot/dragon-idle.mp4']);
    assert.equal($('.box').hidden, true);
  } finally {
    w.close();
  }
});

test('hover: fire while the cursor is over the dragon, back to idle when it leaves', async () => {
  const { w, $, pointer, played } = await open('https://github.com/expressjs/cors');
  try {
    pointer('pointerenter', $('.frame'));
    assert.equal($('.dock').dataset.state, 'fire');
    assert.ok(played.has('fire'));
    pointer('pointerleave', $('.frame'));
    assert.equal($('.dock').dataset.state, 'idle');
    await sleep(250);
    assert.equal($('video.fire').paused, true, 'fire video paused after the cross-fade');
  } finally {
    w.close();
  }
});

test('click: the dragon breathes fire first, THEN the box opens; click again closes it', async () => {
  const { w, $, clickDragon } = await open('https://github.com/expressjs/cors');
  try {
    clickDragon();
    assert.equal($('.dock').dataset.state, 'fire');
    assert.equal($('.box').hidden, true, 'box waits for the fire');
    await sleep(AFTER_FIRE);
    assert.equal($('.box').hidden, false);
    assert.equal($('.dock').dataset.state, 'idle', 'back to idle when the cursor is not on it');
    assert.match($('.box').textContent, /Run Analysis/);
    assert.deepEqual($$intensity($), ['Mild', 'Medium', 'Savage']);
    clickDragon();
    assert.equal($('.box').hidden, true, 'clicking the dragon again closes the box');
  } finally {
    w.close();
  }
});

function $$intensity($) {
  return [...$('.intensity').querySelectorAll('.seg')].map((b) => b.textContent);
}

test('run analysis: loading state, then summary, roast, "Why this joke?" and evidence (safely rendered)', async () => {
  let reply;
  const { w, $, $$, sent, clickDragon } = await open('https://github.com/expressjs/cors', (msg, cb) => (reply = () => cb({ ok: true, data: { ...result, intensity: msg.intensity } })));
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    $('.intensity .seg[data-intensity="savage"]').click();
    $('button.run').click();
    assert.ok($('.loading'), 'loading state while the analysis runs');
    assert.equal($('button.run').disabled, true);
    assert.equal(sent[0].type, 'GIT_AUTOPSY_RUN');
    assert.equal(sent[0].intensity, 'savage');
    assert.deepEqual([sent[0].page.owner, sent[0].page.name], ['expressjs', 'cors']);
    reply();
    await sleep(10);
    assert.equal($('.loading'), null);
    assert.match($('.box').textContent, /The Autopsy · savage/);
    assert.match($('.box').textContent, /What it does/);
    assert.equal($$('ol.roast li').length, 3);
    assert.equal($$('.why-btn').length, 2, 'only jokes with evidence cards get "Why this joke?"');
    const why = $$('ol.roast li')[0].querySelector('.why');
    $$('ol.roast li')[0].querySelector('.why-btn').click();
    assert.equal(why.hidden, false);
    assert.match(why.textContent, /705 days without a commit/);
    assert.equal(why.querySelector('a').getAttribute('href'), 'https://api.github.com/repos/expressjs/cors/commits?per_page=100');
    assert.equal($$('.ev').length, 2);
    assert.equal($$('.ev a').length, 1, 'only real GitHub URLs become links');
    assert.equal($$('.notice').length, 1);
    assert.equal($$('img').length, 0, 'HTML inside data is never executed');
    assert.equal(w.hacked, undefined);
    assert.ok($('.share-img') && $('.share-link') && $('.delete-cache'));
  } finally {
    w.close();
  }
});

test('errors: rate limit, expired token, daily limit and AI failure show clear messages in the box', async () => {
  const errors = [
    ['RATE_LIMITED', 'GitHub rate limit reached', 'It resets at 10:00.'],
    ['GITHUB_AUTH', 'GitHub token expired', 'The server token is invalid.'],
    ['DAILY_LIMIT', 'Daily limit reached', 'You used all 20 analyses for today.'],
    ['AI_FAILED', 'The AI is unavailable', 'Try again later.'],
    ['BACKEND_UNREACHABLE', 'Backend not reachable', 'Check your connection.'],
  ];
  for (const [code, title, message] of errors) {
    const { w, $, clickDragon } = await open('https://github.com/expressjs/cors', (msg, cb) => cb({ ok: false, error: { code, message } }));
    try {
      clickDragon();
      await sleep(AFTER_FIRE);
      $('button.run').click();
      await sleep(5);
      assert.equal($('.error').getAttribute('role'), 'alert');
      assert.match($('.error').textContent, new RegExp(title));
      assert.match($('.error').textContent, new RegExp(message.replace(/\./g, '\\.')));
    } finally {
      w.close();
    }
  }
});

test('close: the × button and the Escape key close the box', async () => {
  const { w, $, clickDragon } = await open('https://github.com/expressjs/cors');
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    $('.close').click();
    assert.equal($('.box').hidden, true);
    clickDragon();
    await sleep(AFTER_FIRE);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal($('.box').hidden, true);
  } finally {
    w.close();
  }
});

test('minimize: hides the dragon for this session, a small button brings it back', async () => {
  const { w, $, clickDragon } = await open('https://github.com/expressjs/cors');
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    $('.mini').click();
    assert.equal($('.dock').hidden, true);
    assert.equal($('.box').hidden, true, 'the box closes too');
    assert.equal($('.restore').hidden, false);
    assert.equal(w.sessionStorage.getItem('gitAutopsy:minimized'), '1');
    $('.restore').click();
    assert.equal($('.dock').hidden, false);
    assert.equal(w.sessionStorage.getItem('gitAutopsy:minimized'), null);
  } finally {
    w.close();
  }
  const again = await open('https://github.com/expressjs/cors', () => {}, { session: { 'gitAutopsy:minimized': '1' } });
  try {
    assert.equal(again.$('.dock').hidden, true, 'stays minimized on the next page in the same session');
  } finally {
    again.w.close();
  }
});

test('drag: the dragon can be dragged to another corner (remembered), and dragging is not a click', async () => {
  const { w, $, pointer, store } = await open('https://github.com/expressjs/cors');
  try {
    w.innerWidth = 1400;
    w.innerHeight = 900;
    const f = $('.frame');
    pointer('pointerdown', f, { clientX: 1300, clientY: 800 });
    pointer('pointermove', f, { clientX: 900, clientY: 500 });
    pointer('pointermove', f, { clientX: 100, clientY: 100 });
    pointer('pointerup', f, { clientX: 100, clientY: 100 });
    assert.equal($('.dock').dataset.corner, 'tl');
    assert.equal($('.box').dataset.corner, 'tl', 'the box opens next to the dragon in its new corner');
    assert.equal(store.dragonCorner, 'tl');
    await sleep(AFTER_FIRE);
    assert.equal($('.box').hidden, true, 'a drag does not open the box');
  } finally {
    w.close();
  }
  const again = await open('https://github.com/expressjs/cors', () => {}, { storage: { dragonCorner: 'bl' } });
  try {
    assert.equal(again.$('.dock').dataset.corner, 'bl', 'saved corner is used on the next page');
  } finally {
    again.w.close();
  }
});

test('auto-run on open: off by default; when switched on, opening the box starts the analysis', async () => {
  const { w, $, sent, store, clickDragon } = await open('https://github.com/expressjs/cors', answer(result));
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    assert.equal(sent.length, 0, 'off by default');
    assert.equal($('.auto-run').checked, false);
    $('.icon-btn[title="Settings"]').click();
    assert.equal($('.settings').hidden, false);
    $('.auto-run').checked = true;
    $('.auto-run').dispatchEvent(new w.Event('change'));
    assert.equal(store.autoRun, true);
    $('.close').click();
    clickDragon();
    await sleep(AFTER_FIRE);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'GIT_AUTOPSY_RUN');
  } finally {
    w.close();
  }
});

test('reduced motion: still frame, no video playback, no fire on hover, box opens immediately', async () => {
  const { w, $, pointer, played, clickDragon } = await open('https://github.com/expressjs/cors', () => {}, { reducedMotion: true });
  try {
    assert.equal($('.dock').dataset.reducedMotion, 'true');
    assert.equal($('video.idle').hasAttribute('autoplay'), false);
    assert.equal(played.size, 0, 'no video ever plays');
    pointer('pointerenter', $('.frame'));
    assert.equal($('.dock').dataset.state, 'idle', 'no fire animation');
    clickDragon();
    await sleep(5);
    assert.equal($('.box').hidden, false, 'opens right away (no fire wait)');
  } finally {
    w.close();
  }
});

test('dark mode: the box follows GitHub\'s own color mode', async () => {
  const dark = await open('https://github.com/expressjs/cors', () => {}, { colorMode: 'dark' });
  const light = await open('https://github.com/expressjs/cors', () => {}, { colorMode: 'light' });
  try {
    assert.equal(dark.$('.wrap').dataset.theme, 'dark');
    assert.equal(light.$('.wrap').dataset.theme, 'light');
  } finally {
    dark.w.close();
    light.w.close();
  }
});

test('other pages: nothing injected; GitHub navigation adds/removes the dragon without reloads', async () => {
  const { w, api } = await open('https://github.com/settings/profile');
  try {
    assert.equal(w.document.getElementById('git-autopsy-root'), null, 'nothing on /settings');
    w.history.pushState({}, '', '/torvalds');
    w.document.dispatchEvent(new w.Event('turbo:load'));
    assert.ok(w.document.getElementById('git-autopsy-root'), 'appears on a profile');
    assert.equal(api.getPage().type, 'profile');
    w.history.pushState({}, '', '/marketplace');
    w.document.dispatchEvent(new w.Event('turbo:load'));
    assert.equal(w.document.getElementById('git-autopsy-root'), null, 'removed again on a non-repo page');
  } finally {
    w.close();
  }
});

test('navigating to another repo while the box is open shows that repo (fresh state)', async () => {
  const { w, $, clickDragon } = await open('https://github.com/expressjs/cors', answer(result));
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    $('button.run').click();
    await sleep(5);
    w.history.pushState({}, '', '/octocat/Hello-World');
    w.document.dispatchEvent(new w.Event('turbo:load'));
    assert.equal($('.target').textContent, 'octocat/Hello-World');
    assert.equal($('ol.roast'), null, 'no stale roast from the previous repo');
  } finally {
    w.close();
  }
});

test('delete cached result: asks the background and clears the shown result', async () => {
  const { w, $, sent, clickDragon } = await open('https://github.com/expressjs/cors', (msg, cb) => (msg.type === 'GIT_AUTOPSY_DELETE' ? cb({ ok: true, data: { deleted: 1 } }) : cb({ ok: true, data: result })));
  try {
    clickDragon();
    await sleep(AFTER_FIRE);
    $('button.run').click();
    await sleep(5);
    $('.delete-cache').click();
    await sleep(5);
    assert.equal(sent[1].type, 'GIT_AUTOPSY_DELETE');
    assert.equal($('ol.roast'), null);
    assert.match($('.box').textContent, /Cached result deleted/);
  } finally {
    w.close();
  }
});
