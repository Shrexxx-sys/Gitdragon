// Content script: the Git Autopsy dragon + analysis box on github.com.
// - Shows the dragon (dragon.js) only on repo and profile pages; nothing is injected anywhere else.
// - Hover = fire. Click = fire, then the analysis box opens next to the dragon.
// - Follows GitHub's "no full reload" navigation (Turbo events + a URL watcher).
// - Asks background.js to run the analysis; renders summary, roast, "Why this joke?" and evidence.
// Everything lives in a Shadow DOM, and data is inserted with textContent only (never innerHTML).

(function () {
  if (window.__gitAutopsyLoaded) return;
  window.__gitAutopsyLoaded = true;

  const detectPage = globalThis.GitAutopsyDetect.detectPage;
  const Dragon = globalThis.GitAutopsyDragon;

  const SUMMARY_LABELS = {
    what_it_does: 'What it does',
    how_to_run: 'How to run it',
    read_first: 'Read these files first',
    what_they_build: 'What they build',
    main_languages: 'Main languages',
    notable_repos: 'Notable repos',
  };
  const INTENSITIES = [
    ['mild', 'Mild'],
    ['medium', 'Medium'],
    ['savage', 'Savage'],
  ];
  const ERROR_TITLES = {
    NOT_FOUND: 'Not found (or private)',
    RATE_LIMITED: 'GitHub rate limit reached',
    GITHUB_AUTH: 'GitHub token expired',
    DAILY_LIMIT: 'Daily limit reached',
    AI_FAILED: 'The AI is unavailable',
    NETWORK_ERROR: 'Network problem',
    BACKEND_UNREACHABLE: 'Backend not reachable',
    TIMEOUT: 'Timed out',
    BAD_INPUT: 'Invalid name',
  };

  const BOX_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap { font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --border: #d1d9e0; --card: #f6f8fa; --accent: #cf222e; --link: #0969da; }
    .wrap[data-theme="dark"] { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --border: #3d444d; --card: #151b23; --accent: #ff7b72; --link: #4493f8; }
    .box { position: fixed; z-index: 2147483001; width: 390px; max-width: calc(100vw - 32px); max-height: min(72vh, 680px);
      background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,.28); display: flex; flex-direction: column; overflow: hidden;
      transform-origin: bottom right; animation: pop .16s ease-out; }
    .box[hidden] { display: none; }
    @keyframes pop { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .box { animation: none; } }
    .box[data-corner="br"] { right: 20px; bottom: 146px; transform-origin: bottom right; }
    .box[data-corner="bl"] { left: 20px; bottom: 146px; transform-origin: bottom left; }
    .box[data-corner="tr"] { right: 20px; top: 202px; transform-origin: top right; }
    .box[data-corner="tl"] { left: 20px; top: 202px; transform-origin: top left; }
    header { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
    header h1 { font-size: 15px; margin: 0; flex: 1; }
    .icon-btn { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; }
    .icon-btn:hover { background: var(--card); color: var(--fg); }
    .settings { padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--card); font-size: 13px; }
    .settings[hidden] { display: none; }
    .settings label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .body { padding: 12px; overflow-y: auto; flex: 1; }
    .target { font-weight: 600; word-break: break-all; }
    .kind { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted);
      border: 1px solid var(--border); border-radius: 10px; padding: 1px 8px; margin-left: 6px; }
    .actions { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
    button.run { flex: 1; background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 9px 12px;
      font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; }
    button.run:disabled { opacity: .6; cursor: wait; }
    button.secondary { background: var(--card); color: var(--fg); border: 1px solid var(--border); border-radius: 6px;
      padding: 7px 10px; cursor: pointer; font-family: inherit; font-size: 13px; }
    .muted { color: var(--muted); font-size: 12px; }
    .error { background: rgba(207,34,46,.1); border: 1px solid var(--accent); border-radius: 6px; padding: 10px; margin: 10px 0; }
    .error strong { color: var(--accent); display: block; margin-bottom: 2px; }
    .notice { background: var(--card); border: 1px solid var(--border); border-left: 3px solid #d29922; border-radius: 6px;
      padding: 8px 10px; margin: 8px 0; font-size: 13px; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin: 16px 0 8px; }
    .field { margin-bottom: 10px; }
    .field .label { font-weight: 600; font-size: 13px; }
    .field ul { margin: 4px 0 0; padding-left: 18px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: var(--card); padding: 1px 4px; border-radius: 4px; }
    ol.roast { padding-left: 20px; margin: 0; }
    ol.roast li { margin-bottom: 8px; }
    details { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; }
    summary { cursor: pointer; font-weight: 600; }
    .ev { border-top: 1px solid var(--border); padding: 6px 0; font-size: 12px; }
    .ev:first-of-type { border-top: none; }
    .ev .k { color: var(--muted); }
    .ev .v { word-break: break-word; }
    a { color: var(--link); text-decoration: none; }
    .ev a, .card a { font-size: 11px; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -2px; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--card); border-radius: 6px; }
    .intensity { display: flex; margin-top: 10px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .intensity .seg { flex: 1; background: var(--card); color: var(--fg); border: none; border-right: 1px solid var(--border);
      padding: 6px 0; cursor: pointer; font-family: inherit; font-size: 13px; }
    .intensity .seg:last-child { border-right: none; }
    .intensity .seg.active { background: var(--accent); color: #fff; font-weight: 600; }
    .why-btn { background: none; border: none; color: var(--link); cursor: pointer; padding: 2px 0; font-size: 12px; font-family: inherit; }
    .why { margin: 4px 0 2px; }
    .why[hidden] { display: none; }
    .card { background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 6px;
      padding: 6px 8px; font-size: 12px; margin-bottom: 4px; }
    .card-angle { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin-bottom: 2px; }
    .share-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .toast { font-size: 12px; color: var(--muted); margin-top: 6px; }
  `;

  // ---------- tiny DOM helpers ----------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children || [])) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
  }

  /** Renders text where `backticks` become <code>, safely. */
  function richText(text) {
    const span = el('span');
    String(text).split(/(`[^`]+`)/).forEach((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) span.appendChild(el('code', { text: part.slice(1, -1) }));
      else if (part) span.appendChild(document.createTextNode(part));
    });
    return span;
  }

  const isGithubUrl = (u) => /^https:\/\/(api\.)?github\.com\/[^{}\s]*$/.test(u || '');

  // chrome.* may be missing (tests) or gone (extension reloaded while the tab stayed open).
  function storageGet(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (v) => resolve(v || {}));
      } catch {
        resolve({});
      }
    });
  }
  function storageSet(obj) {
    try {
      chrome.storage.local.set(obj);
    } catch {
      /* ignore */
    }
  }
  function extUrl(path) {
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return path;
    }
  }
  function sessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function sessionSet(key, value) {
    try {
      if (value == null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  const reducedMotion = (() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  })();

  // ---------- build everything once (attached to the page only on repo/profile pages) ----------
  const host = el('div', { id: 'git-autopsy-root' });
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(el('style', { text: Dragon.DRAGON_CSS + BOX_CSS }));
  const wrap = el('div', { class: 'wrap' });
  shadow.appendChild(wrap);

  const box = el('section', { class: 'box', role: 'dialog', 'aria-label': 'Git Autopsy analysis', hidden: '' });
  const settingsBtn = el('button', { class: 'icon-btn', title: 'Settings', 'aria-label': 'Settings', text: '⚙' });
  const closeBtn = el('button', { class: 'icon-btn close', title: 'Close', 'aria-label': 'Close', text: '×' });
  const autoRunBox = el('input', { type: 'checkbox', class: 'auto-run' });
  const settings = el('div', { class: 'settings', hidden: '' }, [el('label', {}, [autoRunBox, 'Auto-run the analysis when I open the box'])]);
  const body = el('div', { class: 'body' });
  box.appendChild(el('header', {}, [el('h1', { text: 'Git Autopsy' }), settingsBtn, closeBtn]));
  box.appendChild(settings);
  box.appendChild(body);
  wrap.appendChild(box);

  const dragon = Dragon.createDragon({
    root: wrap,
    getUrl: extUrl,
    reducedMotion,
    corner: 'br',
    onClick: () => (isOpen() ? closeBox() : openBox()),
    onCornerChange: (corner) => {
      box.dataset.corner = corner;
      storageSet({ dragonCorner: corner });
    },
    onMinimize: (minimized) => {
      sessionSet('gitAutopsy:minimized', minimized ? '1' : null);
      if (minimized) closeBox();
    },
  });
  box.dataset.corner = dragon.getCorner();
  if (sessionGet('gitAutopsy:minimized') === '1') dragon.minimize();

  // ---------- state ----------
  let page = { type: 'none', key: 'none' };
  let intensity = 'medium';
  let autoRun = false;
  let opening = false;
  const states = {}; // "pageKey|intensity" -> { status: 'idle'|'loading'|'done'|'error', data, error }

  storageGet(['intensity', 'autoRun', 'dragonCorner']).then((v) => {
    if (INTENSITIES.some(([k]) => k === v.intensity)) intensity = v.intensity;
    autoRun = v.autoRun === true;
    autoRunBox.checked = autoRun;
    if (v.dragonCorner) {
      dragon.setCorner(v.dragonCorner);
      box.dataset.corner = dragon.getCorner();
    }
    render();
  });

  const stateKey = () => `${page.key}|${intensity}`;
  function stateFor(key) {
    if (!states[key]) states[key] = { status: 'idle' };
    return states[key];
  }

  // ---------- theme: follow GitHub's own setting (data-color-mode), not just the OS ----------
  function applyTheme() {
    const html = document.documentElement;
    const mode = html.getAttribute('data-color-mode');
    let osDark = false;
    try {
      osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      /* ignore */
    }
    wrap.dataset.theme = mode === 'dark' || ((mode === 'auto' || !mode) && osDark) ? 'dark' : 'light';
  }
  applyTheme();
  try {
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
  } catch {
    /* ignore */
  }

  // ---------- open / close ----------
  const isOpen = () => !box.hidden;

  async function openBox() {
    if (opening || isOpen()) return;
    opening = true;
    await dragon.breatheFire(); // fire first, then the box
    opening = false;
    if (page.type === 'none') return;
    box.hidden = false;
    render();
    if (autoRun && stateFor(stateKey()).status === 'idle') run(false);
  }

  function closeBox() {
    box.hidden = true;
    settings.hidden = true;
  }

  closeBtn.addEventListener('click', closeBox);
  settingsBtn.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
  });
  autoRunBox.addEventListener('change', () => {
    autoRun = autoRunBox.checked;
    storageSet({ autoRun });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeBox();
  });

  function setIntensity(value) {
    intensity = value;
    storageSet({ intensity: value });
    render();
  }

  // ---------- talk to the background worker ----------
  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (resp) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr || !resp) resolve({ ok: false, error: { code: 'EXTENSION_ERROR', message: (lastErr && lastErr.message) || 'No answer from the extension. Try reloading the page.' } });
          else resolve(resp);
        });
      } catch {
        resolve({ ok: false, error: { code: 'EXTENSION_RELOADED', message: 'The extension was updated. Please refresh this page.' } });
      }
    });
  }

  async function run(fresh) {
    const target = page;
    const key = stateKey();
    const st = stateFor(key);
    st.status = 'loading';
    st.error = null;
    render();
    const resp = await send({ type: 'GIT_AUTOPSY_RUN', page: target, fresh: Boolean(fresh), intensity });
    if (resp.ok) {
      st.status = 'done';
      st.data = resp.data;
    } else {
      st.status = 'error';
      st.error = resp.error;
    }
    if (stateKey() === key) render(); // the user may have navigated away or changed intensity meanwhile
  }

  async function deleteCached() {
    const key = stateKey();
    const resp = await send({ type: 'GIT_AUTOPSY_DELETE', page });
    for (const k of Object.keys(states)) if (k.startsWith(page.key + '|')) delete states[k];
    if (stateKey() === key) {
      render();
      body.appendChild(el('div', { class: 'toast', text: resp.ok ? 'Cached result deleted. The next run starts fresh.' : `Could not delete: ${(resp.error && resp.error.message) || 'unknown error'}` }));
    }
  }

  // ---------- render ----------
  function render() {
    body.textContent = '';
    if (page.type === 'none') return;
    const st = stateFor(stateKey());
    body.appendChild(el('div', {}, [el('span', { class: 'target', text: page.label }), el('span', { class: 'kind', text: page.type === 'repo' ? 'repository' : 'profile' })]));

    const seg = el('div', { class: 'intensity', role: 'radiogroup', 'aria-label': 'Roast intensity' });
    for (const [value, label] of INTENSITIES) {
      const b = el('button', { class: 'seg' + (value === intensity ? ' active' : ''), role: 'radio', 'aria-checked': String(value === intensity), 'data-intensity': value, text: label, onclick: () => setIntensity(value) });
      if (st.status === 'loading') b.disabled = true;
      seg.appendChild(b);
    }
    body.appendChild(seg);

    const runBtn = el('button', { class: 'run', text: st.status === 'done' ? 'Run Analysis again' : 'Run Analysis', onclick: () => run(st.status === 'done') });
    if (st.status === 'loading') runBtn.disabled = true;
    body.appendChild(el('div', { class: 'actions' }, [runBtn]));

    if (st.status === 'idle') {
      body.appendChild(el('p', { class: 'muted', text: 'Collects real facts from the GitHub API, then writes a summary and a roast built only on those facts.' }));
    }
    if (st.status === 'loading') {
      body.appendChild(el('div', { class: 'loading' }, [el('span', { class: 'spinner' }), el('span', { text: 'The dragon is reading every commit. This takes a few seconds…' })]));
    }
    if (st.status === 'error') {
      const e = st.error || {};
      body.appendChild(el('div', { class: 'error', role: 'alert' }, [el('strong', { text: ERROR_TITLES[e.code] || 'Something went wrong' }), el('div', { text: e.message || 'Unknown error.' })]));
    }
    if (st.status === 'done' && st.data) renderResult(st.data);
  }

  function renderResult(d) {
    for (const n of d.notices || []) body.appendChild(el('div', { class: 'notice', text: n }));

    body.appendChild(el('h2', { text: 'Summary' }));
    for (const [key, value] of Object.entries(d.summary || {})) {
      const field = el('div', { class: 'field' }, [el('div', { class: 'label', text: SUMMARY_LABELS[key] || key })]);
      if (Array.isArray(value)) {
        field.appendChild(el('ul', {}, value.length ? value.map((v) => el('li', {}, [key === 'read_first' ? el('code', { text: v }) : richText(v)])) : [el('li', { text: 'none' })]));
      } else {
        field.appendChild(el('div', {}, [richText(value)]));
      }
      body.appendChild(field);
    }

    body.appendChild(el('h2', { text: `The Autopsy${d.intensity ? ` · ${d.intensity}` : ''}` }));
    const jokes = d.jokes || (d.roast || []).map((text) => ({ text, cards: [] }));
    const cardsById = Object.fromEntries((d.cards || []).map((c) => [c.id, c]));
    body.appendChild(el('ol', { class: 'roast' }, jokes.map((j) => renderJoke(j, cardsById))));

    body.appendChild(el('h2', { text: 'Evidence' }));
    const details = el('details', {}, [el('summary', { text: `${(d.evidence || []).length} facts measured by code (click to check)` })]);
    for (const e of d.evidence || []) {
      const row = el('div', { class: 'ev' }, [el('div', { class: 'k', text: e.label }), el('div', { class: 'v', text: e.value })]);
      if (isGithubUrl(e.source)) row.appendChild(el('a', { href: e.source, target: '_blank', rel: 'noopener noreferrer', text: 'source ↗' }));
      else if (e.source) row.appendChild(el('div', { class: 'muted', text: 'source: ' + e.source }));
      details.appendChild(row);
    }
    body.appendChild(details);

    const shareRow = el('div', { class: 'share-row' }, [
      el('button', { class: 'secondary share-img', text: 'Download share image', onclick: () => downloadShareImage(d) }),
    ]);
    if (d.shareUrl) shareRow.appendChild(el('button', { class: 'secondary share-link', text: 'Copy share link', onclick: () => copyShareLink(d.shareUrl) }));
    shareRow.appendChild(el('button', { class: 'secondary delete-cache', text: 'Delete cached result', onclick: deleteCached }));
    body.appendChild(shareRow);

    body.appendChild(el('p', { class: 'muted', text: `Written by: ${d.generatedBy}${d.cached ? ' · cached result' : ''} · analysed ${new Date(d.analysedAt).toLocaleString()}` }));
  }

  /** One roast line + a "Why this joke?" toggle that reveals the evidence card(s) behind it. */
  function renderJoke(joke, cardsById) {
    const li = el('li', {}, [el('div', { class: 'joke', text: joke.text })]);
    const cards = (joke.cards || []).map((id) => cardsById[id]).filter(Boolean);
    if (!cards.length) return li;
    const why = el('div', { class: 'why', hidden: '' });
    for (const c of cards) {
      const card = el('div', { class: 'card' }, [el('div', { class: 'card-angle', text: c.angle.replace(/_/g, ' ') }), el('div', { text: c.fact })]);
      if (c.exact_quote) card.appendChild(el('div', { class: 'muted', text: `Exact quote: "${c.exact_quote}"` }));
      if (c.number != null) card.appendChild(el('div', { class: 'muted', text: `Key number: ${c.number}` }));
      if (isGithubUrl(c.source_url)) card.appendChild(el('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', text: 'check the source ↗' }));
      why.appendChild(card);
    }
    const btn = el('button', { class: 'why-btn', 'aria-expanded': 'false', text: 'Why this joke?' });
    btn.addEventListener('click', () => {
      const show = why.hidden;
      why.hidden = !show;
      btn.setAttribute('aria-expanded', String(show));
      btn.textContent = show ? 'Hide evidence' : 'Why this joke?';
    });
    li.appendChild(btn);
    li.appendChild(why);
    return li;
  }

  // ---------- share ----------
  function toast(text) {
    const t = el('div', { class: 'toast', text });
    body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  async function copyShareLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast('Share link copied.');
    } catch {
      toast(`Share link: ${url}`);
    }
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  /** Builds a 1200x630 PNG: dragon + target + roast lines + the evidence each line is built on. */
  function buildShareCanvas(d, withDragon = true) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 1200, 630);
    // dragon (current idle frame); if the browser won't allow it, draw a plain ring instead
    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 110, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#222';
    ctx.fillRect(40, 40, 140, 140);
    if (withDragon) {
      try {
        ctx.drawImage(dragon.videos.idle, 40, 40, 140, 140);
      } catch {
        /* not loaded yet */
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#ff7b72';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(110, 110, 70, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ff7b72';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('GIT AUTOPSY', 210, 80);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(String(d.target).slice(0, 48), 210, 128);
    ctx.fillStyle = '#9198a1';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${d.kind === 'repo' ? 'Repository' : 'Profile'} · intensity: ${d.intensity || 'medium'}`, 210, 162);

    const cardsById = Object.fromEntries((d.cards || []).map((c) => [c.id, c]));
    let y = 230;
    for (const j of (d.jokes || []).slice(0, 4)) {
      ctx.fillStyle = '#e6edf3';
      ctx.font = '24px sans-serif';
      for (const line of wrapText(ctx, j.text, 1100).slice(0, 2)) {
        ctx.fillText(line, 50, y);
        y += 30;
      }
      const card = cardsById[(j.cards || [])[0]];
      if (card) {
        ctx.fillStyle = '#9198a1';
        ctx.font = '16px sans-serif';
        ctx.fillText(`evidence: ${wrapText(ctx, card.fact, 1080)[0]}`, 50, y);
        y += 34;
      }
      if (y > 580) break;
    }
    ctx.fillStyle = '#9198a1';
    ctx.font = '16px sans-serif';
    ctx.fillText('Every joke is built on facts from the public GitHub API.', 50, 612);
    return canvas;
  }

  function downloadShareImage(d) {
    const canvas = buildShareCanvas(d);
    if (!canvas) return toast('Could not create the image in this browser.');
    const save = (blob) => {
      if (!blob) return toast('Could not create the image.');
      const a = el('a', { href: URL.createObjectURL(blob), download: `git-autopsy-${String(d.target).replace(/[^\w.-]+/g, '-')}.png` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Image downloaded.');
    };
    try {
      canvas.toBlob(save, 'image/png');
    } catch {
      // A video frame from another origin can "taint" the canvas: redraw without the dragon.
      try {
        buildShareCanvas(d, false).toBlob(save, 'image/png');
      } catch {
        toast('Could not create the image in this browser.');
      }
    }
  }

  // ---------- show only on repo / profile pages; follow GitHub navigation ----------
  function mount() {
    if (!host.isConnected) document.documentElement.appendChild(host);
  }
  function unmount() {
    closeBox();
    if (host.isConnected) host.remove();
  }

  let lastHref = null;
  function onLocationChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    const next = detectPage(location.href);
    if (next.key === page.key) return;
    page = next;
    if (page.type === 'none') {
      unmount();
      return;
    }
    mount();
    render();
  }

  ['turbo:load', 'turbo:render', 'pjax:end'].forEach((evt) => document.addEventListener(evt, onLocationChange));
  window.addEventListener('popstate', onLocationChange);
  setInterval(onLocationChange, 700); // safety net for any navigation we missed
  onLocationChange();

  // Exposed only so automated tests can drive and inspect it.
  window.__gitAutopsy = { onLocationChange, getPage: () => page, shadow, dragon, isOpen, openBox, closeBox, buildShareCanvas };
})();
