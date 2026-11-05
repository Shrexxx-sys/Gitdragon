// REAL-BROWSER CHECK: loads the extension into Chrome for Testing and opens real github.com pages.
// Verifies: the dragon videos actually play under GitHub's CSP, hover -> fire, click -> box,
// "Run Analysis" against a local backend, and nothing injected on non-repo/profile pages.
// Usage: npm run browser-check            (screenshots go to .cache/screenshots/)
//   EXT_DIR=<folder>       test another copy of the extension (e.g. the unzipped share zip)
//   BACKEND_URL=<url>      use that backend instead of starting a local one (e.g. the deployed one)
// Needs internet (github.com) and Chrome for Testing (once: npx puppeteer browsers install chrome).
// Without BACKEND_URL it starts its own local backend in offline mode on port 3999.

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { createApp } = require('../src/server');
const { createGithubClient } = require('../src/githubClient');

require('dotenv').config({ quiet: true });

const EXT = path.resolve(process.env.EXT_DIR || path.join(__dirname, '..', 'extension'));
const SHOTS = path.join(__dirname, '..', '.cache', 'screenshots');
const PORT = 3999;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

// Runs inside the page: reads the dragon's state from the shadow root.
function probe() {
  const host = document.getElementById('git-autopsy-root');
  if (!host) return { present: false };
  const root = host.shadowRoot;
  const dock = root.querySelector('.dock');
  const v = (sel) => {
    const e = root.querySelector(sel);
    return e ? { readyState: e.readyState, paused: e.paused, currentSrc: e.currentSrc, error: e.error ? e.error.code : null, time: e.currentTime, width: e.videoWidth } : null;
  };
  const box = root.querySelector('.box');
  return {
    present: true,
    state: dock && dock.dataset.state,
    corner: dock && dock.dataset.corner,
    idle: v('video.idle'),
    fire: v('video.fire'),
    boxOpen: box && !box.hidden,
    boxText: box ? box.textContent.slice(0, 4000) : '',
    roastCount: root.querySelectorAll('ol.roast li').length,
    theme: root.querySelector('.wrap').dataset.theme,
  };
}

(async () => {
  // local backend (offline AI so the check is fast and free), unless BACKEND_URL is given
  let server = null;
  let backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!backendUrl) {
    const gh = createGithubClient({ token: process.env.GITHUB_TOKEN || '', cacheDir: process.env.GITHUB_CACHE_DIR || '.cache' });
    server = createApp({ env: {}, gh, provider: null }).listen(PORT);
    backendUrl = `http://127.0.0.1:${PORT}`;
  }
  console.log(`Extension: ${EXT}\nBackend:   ${backendUrl}`);
  fs.mkdirSync(SHOTS, { recursive: true });
  if (!fs.existsSync(puppeteer.executablePath())) {
    console.error('Chrome for Testing is not installed yet. Run once:  npx puppeteer browsers install chrome');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--autoplay-policy=no-user-gesture-required', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900 },
  });
  try {
    // Point the extension at our local backend (via its service worker).
    const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('background.js'), { timeout: 15000 });
    const sw = await swTarget.worker();
    if (server || process.env.FORCE_BACKEND) await sw.evaluate((url) => chrome.storage.local.set({ backendUrl: url }), backendUrl);
    check('extension service worker loaded', true, swTarget.url().split('/')[2]);

    const page = await browser.newPage();
    const cspErrors = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to load/i.test(m.text())) cspErrors.push(m.text().slice(0, 200));
    });

    await page.goto('https://github.com/expressjs/cors', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('git-autopsy-root'), { timeout: 20000 });
    await page.waitForFunction(
      () => {
        const v = document.getElementById('git-autopsy-root').shadowRoot.querySelector('video.idle');
        return v && (v.readyState >= 2 || v.error);
      },
      { timeout: 20000 }
    ).catch(() => {});
    await sleep(1500);
    let s = await page.evaluate(probe);
    check('dragon injected on a repo page', s.present);
    check('idle video loads under GitHub CSP', s.idle && s.idle.readyState >= 2 && !s.idle.error, JSON.stringify({ readyState: s.idle && s.idle.readyState, error: s.idle && s.idle.error, src: s.idle && s.idle.currentSrc.split('/').pop() }));
    check('idle video is playing (looping, muted)', s.idle && !s.idle.paused && s.idle.time > 0, `t=${s.idle && s.idle.time.toFixed(2)}`);
    check('fire video preloaded', s.fire && s.fire.readyState >= 2, `readyState=${s.fire && s.fire.readyState}`);
    check('starts idle in the bottom-right corner', s.state === 'idle' && s.corner === 'br');
    check('no CSP violations reported', cspErrors.length === 0, cspErrors.join(' | '));
    await page.screenshot({ path: path.join(SHOTS, '1-idle.png') });

    // hover -> fire
    const frameBox = await page.evaluate(() => {
      const r = document.getElementById('git-autopsy-root').shadowRoot.querySelector('.frame').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(frameBox.x, frameBox.y);
    await sleep(500);
    s = await page.evaluate(probe);
    check('hover -> fire state, fire video playing', s.state === 'fire' && s.fire && !s.fire.paused, `t=${s.fire && s.fire.time.toFixed(2)}`);
    await page.screenshot({ path: path.join(SHOTS, '2-hover-fire.png') });
    await page.mouse.move(200, 400);
    await sleep(500);
    s = await page.evaluate(probe);
    check('leave -> back to idle', s.state === 'idle');

    // click -> fire, then box
    await page.mouse.click(frameBox.x, frameBox.y);
    await sleep(200);
    const during = await page.evaluate(probe);
    check('click -> breathes fire first (box not open yet)', during.state === 'fire' && !during.boxOpen);
    await sleep(1200);
    s = await page.evaluate(probe);
    check('box opens after the fire', s.boxOpen && /Run Analysis/.test(s.boxText));
    await page.screenshot({ path: path.join(SHOTS, '3-box.png') });

    // run analysis
    await page.evaluate(() => document.getElementById('git-autopsy-root').shadowRoot.querySelector('button.run').click());
    await page.waitForFunction(() => document.getElementById('git-autopsy-root').shadowRoot.querySelectorAll('ol.roast li').length > 0, { timeout: 60000 }).catch(() => {});
    s = await page.evaluate(probe);
    check('Run Analysis shows summary + roast', s.roastCount >= 3 && /What it does/.test(s.boxText), `${s.roastCount} jokes`);
    await page.mouse.move(200, 400);
    await sleep(400);
    await page.screenshot({ path: path.join(SHOTS, '4-result.png') });

    // GitHub navigation without reload: go to a profile via history (Turbo-style)
    await page.goto('https://github.com/settings', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1500);
    s = await page.evaluate(probe);
    check('nothing injected on a non-repo page (/settings or login)', !s.present, page.url());

    await page.goto('https://github.com/octocat', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('git-autopsy-root'), { timeout: 20000 }).catch(() => {});
    await sleep(1500);
    s = await page.evaluate(probe);
    check('dragon on a profile page', s.present && s.idle && s.idle.readyState >= 2);

    // reduced motion
    const rm = await browser.newPage();
    await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await rm.goto('https://github.com/expressjs/cors', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await rm.waitForFunction(() => document.getElementById('git-autopsy-root'), { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    s = await rm.evaluate(probe);
    check('reduced motion: still frame (video paused, not playing)', s.present && s.idle && s.idle.paused && s.idle.readyState >= 2);
  } finally {
    await browser.close();
    if (server) server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} browser checks passed. Screenshots: ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
