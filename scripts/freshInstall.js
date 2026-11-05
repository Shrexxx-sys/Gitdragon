// FRESH-INSTALL TEST: follows ONLY the README, in an empty folder, like a newcomer would.
//   1. git clone (the committed code)        4. npm start  -> /health answers
//   2. npm install                           5. npm run package -> the share zip
//   3. cp .env.example .env (no keys); npm test
//   6. unzip it and load it in a real Chrome (like a friend): hover, click, Run Analysis
// Usage: npm run fresh-install   (needs internet; step 6 needs Chrome for Testing, see browser-check)

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 3123;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  return ok;
}

function run(cmd, args, cwd, extraEnv = {}, timeout = 600000) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', timeout, env: { ...process.env, ...extraEnv } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

async function waitFor(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-autopsy-fresh-'));
  const app = path.join(dir, 'Gitdragon');
  console.log(`Fresh folder: ${dir}`);
  let server = null;
  try {
    // A clean environment: none of this machine's keys or settings leak into the test.
    const clean = { GITHUB_TOKEN: '', GEMINI_API_KEY: '', GROQ_API_KEY: '', OPENROUTER_API_KEY: '', AI_PROVIDER: '', SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' };

    const clone = run('git', ['clone', '--quiet', ROOT, app], dir);
    if (!check('1. git clone', clone.code === 0, clone.out.trim().slice(0, 200))) return;
    check('   no .env, .cache or node_modules in the clone', !fs.existsSync(path.join(app, '.env')) && !fs.existsSync(path.join(app, '.cache')) && !fs.existsSync(path.join(app, 'node_modules')));

    const install = run('npm', ['install', '--no-audit', '--no-fund'], app, clean);
    if (!check('2. npm install', install.code === 0, install.out.trim().split('\n').pop())) return;

    fs.copyFileSync(path.join(app, '.env.example'), path.join(app, '.env'));
    check('3. cp .env.example .env', fs.existsSync(path.join(app, '.env')));

    const tests = run('npm', ['test'], app, clean);
    const summary = (tests.out.match(/# (tests|pass|fail) \d+/g) || []).join(', ');
    check('   npm test', tests.code === 0, summary);

    server = spawn(process.execPath, ['src/index.js'], { cwd: app, env: { ...process.env, ...clean, PORT: String(PORT) }, stdio: 'ignore' });
    const health = await waitFor(`http://127.0.0.1:${PORT}/health`, 20000);
    check('4. npm start -> /health', Boolean(health && health.ok), health ? `ai=${health.ai}, store=${health.store}` : 'no answer');

    const pkg = run('npm', ['run', 'package', '--', '--backend', `http://127.0.0.1:${PORT}`], app, clean);
    const zipPath = path.join(app, 'dist', 'git-autopsy-extension.zip');
    if (!check('5. npm run package -> zip', pkg.code === 0 && fs.existsSync(zipPath), `${fs.existsSync(zipPath) ? (fs.statSync(zipPath).size / 1024).toFixed(0) + ' KB' : 'missing'}`)) return;

    // Unzip with the clone's own reader, into a folder a friend would pick in "Load unpacked".
    const { readZip } = require(path.join(app, 'scripts', 'package.js'));
    const unzipped = path.join(dir, 'unzipped-extension');
    for (const [name, data] of Object.entries(readZip(fs.readFileSync(zipPath)))) {
      fs.mkdirSync(path.dirname(path.join(unzipped, name)), { recursive: true });
      fs.writeFileSync(path.join(unzipped, name), data);
    }
    check('   unzipped extension has a manifest', fs.existsSync(path.join(unzipped, 'manifest.json')));

    // 6. the friend's experience, in a real browser (uses this repo's Chrome for Testing)
    const browser = run(process.execPath, [path.join(ROOT, 'scripts', 'browserCheck.js')], ROOT, { EXT_DIR: unzipped, BACKEND_URL: `http://127.0.0.1:${PORT}` }, 300000);
    const line = (browser.out.match(/\d+\/\d+ browser checks passed/) || ['no result'])[0];
    if (/Chrome for Testing is not installed/.test(browser.out)) check('6. friend installs the zip in Chrome', false, 'skipped: run `npx puppeteer browsers install chrome` first');
    else check('6. friend installs the zip in Chrome: hover, click, Run Analysis', browser.code === 0, line);
    if (browser.code !== 0) console.log(browser.out.split('\n').filter((l) => l.startsWith('FAIL')).join('\n'));
  } finally {
    if (server) server.kill();
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* Windows may keep a file locked for a moment; it's in the temp folder anyway */
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} fresh-install checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
