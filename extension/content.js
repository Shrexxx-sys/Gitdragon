// Content script: injects the Git Autopsy side panel into github.com pages.
// - Detects repo / profile / other pages (pageDetect.js)
// - Follows GitHub's "no full reload" navigation (Turbo events + a URL watcher)
// - Asks background.js to run the autopsy, then renders summary, roast and evidence
// All data is inserted with textContent (never innerHTML), so nothing from GitHub can inject code.

(function () {
  if (window.__gitAutopsyLoaded) return;
  window.__gitAutopsyLoaded = true;

  const detectPage = globalThis.GitAutopsyDetect.detectPage;

  const SUMMARY_LABELS = {
    what_it_does: 'What it does',
    how_to_run: 'How to run it',
    read_first: 'Read these files first',
    what_they_build: 'What they build',
    main_languages: 'Main languages',
    notable_repos: 'Notable repos',
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap { font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --border: #d1d9e0; --card: #f6f8fa; --accent: #cf222e; --link: #0969da; }
    @media (prefers-color-scheme: dark) {
      .wrap { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --border: #3d444d; --card: #151b23; --accent: #ff7b72; --link: #4493f8; }
    }
    .tab { position: fixed; right: 0; top: 40%; z-index: 2147483000; background: var(--accent); color: #fff;
      border: none; border-radius: 8px 0 0 8px; padding: 10px 8px; cursor: pointer; writing-mode: vertical-rl;
      font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1; letter-spacing: .5px; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
    .tab[hidden] { display: none; }
    .panel { position: fixed; top: 0; right: 0; width: 400px; max-width: 100vw; height: 100vh; z-index: 2147483001;
      background: var(--bg); color: var(--fg); border-left: 1px solid var(--border); box-shadow: -4px 0 16px rgba(0,0,0,.18);
      display: flex; flex-direction: column; transform: translateX(105%); transition: transform .2s ease; }
    .panel.open { transform: translateX(0); }
    header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    header h1 { font-size: 16px; margin: 0; flex: 1; }
    .close { background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; line-height: 1; }
    .body { padding: 14px; overflow-y: auto; flex: 1; }
    .target { font-weight: 600; word-break: break-all; }
    .kind { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted);
      border: 1px solid var(--border); border-radius: 10px; padding: 1px 8px; margin-left: 6px; }
    .actions { display: flex; gap: 8px; margin: 12px 0; }
    button.run { flex: 1; background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 9px 12px;
      font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; }
    button.run:disabled { opacity: .6; cursor: wait; }
    button.secondary { background: var(--card); color: var(--fg); border: 1px solid var(--border); border-radius: 6px;
      padding: 8px 10px; cursor: pointer; font-family: inherit; font-size: 13px; }
    .muted { color: var(--muted); font-size: 12px; }
    .error { background: rgba(207,34,46,.1); border: 1px solid var(--accent); border-radius: 6px; padding: 10px; margin: 10px 0; }
    .error strong { color: var(--accent); }
    .notice { background: var(--card); border: 1px solid var(--border); border-left: 3px solid #d29922; border-radius: 6px;
      padding: 8px 10px; margin: 8px 0; font-size: 13px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin: 18px 0 8px; }
    .field { margin-bottom: 10px; }
    .field .label { font-weight: 600; font-size: 13px; }
    .field ul { margin: 4px 0 0; padding-left: 18px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: var(--card);
      padding: 1px 4px; border-radius: 4px; }
    ol.roast { padding-left: 20px; margin: 0; }
    ol.roast li { margin-bottom: 8px; }
    details { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; }
    summary { cursor: pointer; font-weight: 600; }
    .ev { border-top: 1px solid var(--border); padding: 6px 0; font-size: 12px; }
    .ev:first-of-type { border-top: none; }
    .ev .k { color: var(--muted); }
    .ev .v { word-break: break-word; }
    .ev a { color: var(--link); text-decoration: none; font-size: 11px; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite; vertical-align: -2px; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
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
    .card a { color: var(--link); text-decoration: none; font-size: 11px; }
  `;

  // ---------- tiny DOM helper ----------
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

  // ---------- build the panel once ----------
  const host = el('div', { id: 'git-autopsy-root' });
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(el('style', { text: CSS }));
  const wrap = el('div', { class: 'wrap' });
  const tab = el('button', { class: 'tab', title: 'Open Git Autopsy', text: 'AUTOPSY' });
  const panel = el('aside', { class: 'panel', 'aria-label': 'Git Autopsy' });
  const body = el('div', { class: 'body' });
  panel.appendChild(
    el('header', {}, [el('h1', { text: 'Git Autopsy' }), el('button', { class: 'close', title: 'Close', text: '×', onclick: () => setOpen(false) })])
  );
  panel.appendChild(body);
  wrap.appendChild(tab);
  wrap.appendChild(panel);
  shadow.appendChild(wrap);
  document.documentElement.appendChild(host);

  tab.addEventListener('click', () => setOpen(true));

  // ---------- state ----------
  let page = { type: 'none', key: 'none' };
  let open = false;
  const states = {}; // "pageKey|intensity" -> { status: 'idle'|'loading'|'done'|'error', data, error }
  const INTENSITIES = [
    ['mild', 'Mild'],
    ['medium', 'Medium'],
    ['savage', 'Savage'],
  ];
  let intensity = 'medium';
  // Remember the chosen intensity between pages (chrome.storage may be missing in tests).
  try {
    chrome.storage.local.get('intensity', (v) => {
      if (v && INTENSITIES.some(([k]) => k === v.intensity)) {
        intensity = v.intensity;
        render();
      }
    });
  } catch {
    /* no storage: keep the default */
  }

  function setIntensity(value) {
    intensity = value;
    try {
      chrome.storage.local.set({ intensity: value });
    } catch {
      /* ignore */
    }
    render();
  }

  const stateKey = () => `${page.key}|${intensity}`;

  function setOpen(value) {
    open = value;
    panel.classList.toggle('open', open);
    tab.hidden = open || page.type === 'none';
  }

  function stateFor(key) {
    if (!states[key]) states[key] = { status: 'idle' };
    return states[key];
  }

  // ---------- run ----------
  function run(fresh) {
    const target = page;
    const key = stateKey();
    const st = stateFor(key);
    st.status = 'loading';
    st.error = null;
    render();
    try {
      chrome.runtime.sendMessage({ type: 'GIT_AUTOPSY_RUN', page: target, fresh: Boolean(fresh), intensity }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr || !resp) {
          st.status = 'error';
          st.error = { code: 'EXTENSION_ERROR', message: (lastErr && lastErr.message) || 'No answer from the extension background worker. Try reloading the page.' };
        } else if (resp.ok) {
          st.status = 'done';
          st.data = resp.data;
        } else {
          st.status = 'error';
          st.error = resp.error;
        }
        if (stateKey() === key) render(); // user may have navigated away or switched intensity meanwhile
      });
    } catch (err) {
      // Happens if the extension was reloaded while this tab stayed open.
      st.status = 'error';
      st.error = { code: 'EXTENSION_RELOADED', message: 'The extension was updated. Please refresh this page.' };
      render();
    }
  }

  // ---------- render ----------
  function render() {
    body.textContent = '';
    if (page.type === 'none') {
      body.appendChild(el('p', { text: 'Open a GitHub repository or a user profile to run an autopsy.' }));
      return;
    }
    const st = stateFor(stateKey());
    body.appendChild(
      el('div', {}, [el('span', { class: 'target', text: page.label }), el('span', { class: 'kind', text: page.type === 'repo' ? 'repository' : 'profile' })])
    );

    // Intensity selector (each intensity keeps its own result).
    const seg = el('div', { class: 'intensity', role: 'radiogroup', 'aria-label': 'Roast intensity' });
    for (const [value, label] of INTENSITIES) {
      const b = el('button', { class: 'seg' + (value === intensity ? ' active' : ''), role: 'radio', 'aria-checked': String(value === intensity), 'data-intensity': value, text: label, onclick: () => setIntensity(value) });
      if (st.status === 'loading') b.disabled = true;
      seg.appendChild(b);
    }
    body.appendChild(seg);

    const runBtn = el('button', { class: 'run', onclick: () => run(false) }, st.status === 'loading' ? [el('span', { class: 'spinner' }), 'Examining…'] : 'Run Autopsy');
    if (st.status === 'loading') runBtn.disabled = true;
    const actions = el('div', { class: 'actions' }, [runBtn]);
    if (st.status === 'done') {
      runBtn.textContent = 'Run Autopsy';
      actions.appendChild(el('button', { class: 'secondary', title: 'Ignore cached results and fetch again', text: 'Refresh', onclick: () => run(true) }));
    }
    body.appendChild(actions);

    if (st.status === 'idle') {
      body.appendChild(el('p', { class: 'muted', text: 'Collects real facts from the GitHub API, then writes a summary and a roast based only on those facts.' }));
    }
    if (st.status === 'loading') {
      body.appendChild(el('p', { class: 'muted', text: 'Collecting facts from GitHub and writing the report. This can take a few seconds.' }));
    }
    if (st.status === 'error') {
      const e = st.error || {};
      body.appendChild(el('div', { class: 'error' }, [el('strong', { text: errorTitle(e.code) }), el('div', { text: e.message || 'Unknown error.' })]));
    }
    if (st.status === 'done' && st.data) renderResult(st.data);
  }

  function errorTitle(code) {
    return (
      {
        NOT_FOUND: 'Not found (or private)',
        RATE_LIMITED: 'GitHub rate limit reached',
        NETWORK_ERROR: 'Network problem',
        BACKEND_UNREACHABLE: 'Backend not running',
        TIMEOUT: 'Timed out',
        BAD_INPUT: 'Invalid name',
      }[code] || 'Something went wrong'
    );
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
      if (/^https:\/\/(api\.)?github\.com\/[^{}\s]*$/.test(e.source)) {
        row.appendChild(el('a', { href: e.source, target: '_blank', rel: 'noopener noreferrer', text: 'source ↗' }));
      } else if (e.source) {
        row.appendChild(el('div', { class: 'muted', text: 'source: ' + e.source }));
      }
      details.appendChild(row);
    }
    body.appendChild(details);

    body.appendChild(
      el('p', { class: 'muted', text: `Written by: ${d.generatedBy}${d.cached ? ' · cached result' : ''} · analysed ${new Date(d.analysedAt).toLocaleString()}` })
    );
  }

  /** One roast line + a "Why this joke?" toggle that reveals the evidence card(s) behind it. */
  function renderJoke(joke, cardsById) {
    const li = el('li', {}, [el('div', { class: 'joke', text: joke.text })]);
    const cards = (joke.cards || []).map((id) => cardsById[id]).filter(Boolean);
    if (!cards.length) return li;
    const why = el('div', { class: 'why', hidden: '' });
    for (const c of cards) {
      const box = el('div', { class: 'card' }, [
        el('div', { class: 'card-angle', text: c.angle.replace(/_/g, ' ') }),
        el('div', { text: c.fact }),
      ]);
      if (c.exact_quote) box.appendChild(el('div', { class: 'muted', text: `Exact quote: "${c.exact_quote}"` }));
      if (c.number != null) box.appendChild(el('div', { class: 'muted', text: `Key number: ${c.number}` }));
      if (/^https:\/\/(api\.)?github\.com\/[^{}\s]*$/.test(c.source_url || '')) {
        box.appendChild(el('a', { href: c.source_url, target: '_blank', rel: 'noopener noreferrer', text: 'check the source ↗' }));
      }
      why.appendChild(box);
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

  // ---------- follow GitHub navigation (it changes pages without full reloads) ----------
  let lastHref = null;
  function onLocationChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    const next = detectPage(location.href);
    if (next.key !== page.key) {
      page = next;
      render();
    }
    tab.hidden = open || page.type === 'none';
  }

  ['turbo:load', 'turbo:render', 'pjax:end'].forEach((evt) => document.addEventListener(evt, onLocationChange));
  window.addEventListener('popstate', onLocationChange);
  setInterval(onLocationChange, 700); // safety net for any navigation we missed

  onLocationChange();
  setOpen(false);

  // Exposed only so automated tests can trigger checks.
  window.__gitAutopsy = { onLocationChange, getPage: () => page, shadow };
})();
