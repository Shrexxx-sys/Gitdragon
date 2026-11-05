// END-TO-END SMOKE TEST of the backend the extension talks to.
//   BACKEND_URL=https://your-app.vercel.app npm run e2e   -> tests the deployed backend
//   npm run e2e                                           -> local simulation: serves api/index.js
//                                                            (the exact Vercel entry point) with your .env
// Checks: health, a repo + a profile analysis (real GitHub, real AI if configured), cache hit,
// share page, 404 handling, cache delete, and that no secrets leak into responses.

require('dotenv').config({ quiet: true });
const http = require('http');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function main() {
  let base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  let server = null;
  if (!base) {
    // Vercel calls the exported app as (req, res): a plain http server does the same thing.
    const handler = require('../api/index.js');
    server = http.createServer(handler);
    await new Promise((r) => server.listen(0, r));
    base = `http://127.0.0.1:${server.address().port}`;
    console.log(`Local simulation of the Vercel function at ${base}`);
  } else {
    console.log(`Testing deployed backend ${base}`);
  }
  const installId = `e2e-${Date.now()}`;
  const get = async (path, opts = {}) => {
    const t = Date.now();
    const res = await fetch(base + path, { headers: { 'X-Install-Id': installId }, ...opts, signal: AbortSignal.timeout(120000) });
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* html */
    }
    return { status: res.status, body, text, ms: Date.now() - t };
  };
  const secrets = [process.env.GITHUB_TOKEN, process.env.GEMINI_API_KEY, process.env.GROQ_API_KEY, process.env.OPENROUTER_API_KEY, process.env.SUPABASE_SERVICE_KEY].filter((s) => s && s.length > 8);
  const leaks = (text) => secrets.some((s) => text.includes(s));

  try {
    const h = await get('/health');
    check('health', h.status === 200 && h.body.ok === true, `ai=${h.body.ai}, store=${h.body.store}, token=${h.body.githubToken}`);
    check('health shows no secrets', !leaks(h.text));

    const r1 = await get('/repo/expressjs/cors?intensity=savage&fresh=1');
    const d = r1.body;
    check('repo analysis', r1.status === 200 && d.summary && d.roast.length >= 3 && d.evidence.length > 10, `${r1.ms} ms, ${d.roast && d.roast.length} jokes, by ${d.generatedBy}`);
    check('every joke has an evidence card', Array.isArray(d.jokes) && d.jokes.every((j) => j.cards.length && j.cards.every((id) => d.cards.some((c) => c.id === id))));
    check('response has no secrets', !leaks(r1.text));
    if (d.roast) d.roast.forEach((l, i) => console.log(`      ${i + 1}. ${l}`));

    const r2 = await get('/repo/expressjs/cors?intensity=savage');
    check('second request is a cache hit (no AI call)', r2.body.cached === true, `${r2.ms} ms`);

    if (d.shareUrl) {
      const share = await fetch(d.shareUrl);
      check('share page works', share.status === 200 && (await share.text()).includes('expressjs/cors'), d.shareUrl);
    } else check('share page works', false, 'no shareUrl in the result');

    const p = await get('/profile/ghost?intensity=medium');
    check('profile analysis (empty account)', p.status === 200 && p.body.roast.length >= 3, `${p.ms} ms`);

    const nf = await get('/repo/octocat/this-repo-does-not-exist-e2e');
    check('missing repo -> clear 404', nf.status === 404 && nf.body.error.code === 'NOT_FOUND');

    const bad = await get('/repo/expressjs/cors?intensity=nuclear');
    check('bad input -> 400', bad.status === 400);

    const del = await get('/cache/repo/expressjs/cors', { method: 'DELETE', headers: { 'X-Install-Id': installId } });
    check('delete cached result', del.status === 200 && del.body.deleted >= 1, `deleted ${del.body.deleted}`);
  } finally {
    if (server) server.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} end-to-end checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
