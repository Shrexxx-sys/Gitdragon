// The public share page: the roast + the dragon + the evidence behind each joke.
// Everything from the analysis is HTML-escaped. No scripts on the page at all.

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isGithubUrl = (u) => /^https:\/\/(api\.)?github\.com\/[^{}\s"'<>]*$/.test(u || '');

const STYLE = `
  :root { color-scheme: light dark; --bg:#fff; --fg:#1f2328; --muted:#59636e; --border:#d1d9e0; --card:#f6f8fa; --accent:#cf222e; --link:#0969da; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --border:#3d444d; --card:#151b23; --accent:#ff7b72; --link:#4493f8; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif; }
  main { max-width:760px; margin:0 auto; padding:32px 20px 48px; }
  .head { display:flex; gap:20px; align-items:center; }
  video { width:120px; height:120px; border-radius:50%; border:3px solid var(--border); background:#fff; object-fit:contain; flex:none; }
  .kicker { color:var(--accent); font-weight:700; letter-spacing:.08em; font-size:13px; }
  h1 { margin:4px 0; font-size:28px; word-break:break-all; }
  .muted { color:var(--muted); font-size:14px; }
  ol { padding-left:22px; }
  li { margin:0 0 18px; font-size:18px; }
  .ev { display:block; margin-top:6px; padding:8px 10px; font-size:14px; color:var(--muted); background:var(--card); border-left:3px solid var(--accent); border-radius:6px; }
  a { color:var(--link); text-decoration:none; }
  details { border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin-top:24px; }
  summary { cursor:pointer; font-weight:600; }
  .row { padding:6px 0; border-top:1px solid var(--border); font-size:14px; }
  .row:first-of-type { border-top:none; }
`;

function renderSharePage(d, baseUrl) {
  const cards = Object.fromEntries((d.cards || []).map((c) => [c.id, c]));
  const jokes = (d.jokes || (d.roast || []).map((text) => ({ text, cards: [] })))
    .map((j) => {
      const evidence = (j.cards || [])
        .map((id) => cards[id])
        .filter(Boolean)
        .map((c) => `<span class="ev">Evidence: ${esc(c.fact)}${isGithubUrl(c.source_url) ? ` <a href="${esc(c.source_url)}" rel="noopener noreferrer">source</a>` : ''}</span>`)
        .join('');
      return `<li>${esc(j.text)}${evidence}</li>`;
    })
    .join('\n');
  const evidenceRows = (d.evidence || [])
    .map((e) => `<div class="row"><strong>${esc(e.label)}:</strong> ${esc(e.value)}${isGithubUrl(e.source) ? ` <a href="${esc(e.source)}" rel="noopener noreferrer">source</a>` : ''}</div>`)
    .join('\n');
  const title = `Git Autopsy: ${d.target}`;
  const first = (d.jokes && d.jokes[0] && d.jokes[0].text) || (d.roast && d.roast[0]) || '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(first)}">
<meta name="twitter:card" content="summary">
<style>${STYLE}</style>
</head>
<body>
<main>
  <div class="head">
    <video src="${esc(baseUrl)}/mascot/dragon-fire.mp4" autoplay muted loop playsinline aria-hidden="true"></video>
    <div>
      <div class="kicker">GIT AUTOPSY</div>
      <h1><a href="${esc(d.url)}" rel="noopener noreferrer">${esc(d.target)}</a></h1>
      <div class="muted">${d.kind === 'repo' ? 'Repository' : 'Profile'} · intensity: ${esc(d.intensity || 'medium')} · analysed ${esc(String(d.analysedAt || '').slice(0, 10))}</div>
    </div>
  </div>
  <ol>
${jokes}
  </ol>
  <p class="muted">Every line is built on facts measured from the public GitHub API. Click a source to check it.</p>
  <details><summary>All ${(d.evidence || []).length} facts</summary>
${evidenceRows}
  </details>
</main>
</body>
</html>`;
}

function renderShareMissing() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Git Autopsy</title><style>${STYLE}</style></head>
<body><main><h1>This autopsy has expired</h1><p class="muted">Shared results are kept for a limited time, or the owner deleted it. Run a new one with the Git Autopsy extension.</p></main></body></html>`;
}

module.exports = { renderSharePage, renderShareMissing, esc };
