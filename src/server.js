// Express app (runs locally with `npm start`, and on Vercel via api/index.js).
//   GET    /repo/:owner/:name?intensity=      analysis of a repository
//   GET    /profile/:username?intensity=      analysis of a profile
//   DELETE /cache/repo/:owner/:name           delete cached analyses of a repo (privacy / refresh)
//   DELETE /cache/profile/:username           delete cached analyses of a profile
//   GET    /share/:id                         public share page for a cached analysis
//   GET    /health                            status (AI, token, store, limits)
// Errors always come back as JSON: { error: { code, message } } so the box can show them.
// The AI key and GitHub token live ONLY here (environment variables), never in the extension.

const path = require('path');
const express = require('express');
const cors = require('cors');
const { createGithubClient } = require('./githubClient');
const { getProvider, withDiskCache } = require('./aiProvider');
const { createService } = require('./service');
const { createStore } = require('./store');
const { AutopsyError, Errors } = require('./errors');
const { INTENSITIES } = require('./comedy/comedyWriter');
const { loadCalibration } = require('./comedy/calibration');
const { renderSharePage, renderShareMissing } = require('./sharePage');

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const MASCOT_DIR = path.join(__dirname, '..', 'extension', 'mascot');

const describe = (p) => (p ? `${p.name} (${p.model})` : 'offline templates');

/**
 * @param provider  optional: one provider (or null) used for both summary and humor (tests use this)
 * @param providers optional: { summary, humor }
 * @param store     optional: a store from store.js (default: Supabase if configured, else memory)
 */
function createApp({ env = process.env, gh, provider, providers, store } = {}) {
  gh = gh || createGithubClient({ token: env.GITHUB_TOKEN || '', cacheDir: env.GITHUB_CACHE_DIR || '' });
  if (!providers) {
    providers =
      provider !== undefined
        ? { summary: provider, humor: provider }
        : { summary: withDiskCache(getProvider(env, 'summary'), env.AI_CACHE_DIR), humor: withDiskCache(getProvider(env, 'humor'), env.AI_CACHE_DIR) };
  }
  store = store || createStore(env);
  const service = createService({ gh, providers, store, env });

  const app = express();
  app.set('trust proxy', true); // behind Vercel's proxy: correct protocol/host for share links
  app.use(cors({ exposedHeaders: [] })); // the extension calls us from its background worker
  app.disable('x-powered-by');

  function status() {
    const cal = loadCalibration();
    return {
      ai: describe(providers.summary),
      humorAi: describe(providers.humor),
      githubToken: gh.hasToken ? 'set' : gh.tokenInvalid ? 'EXPIRED (using public limit)' : 'not set',
      store: store.kind,
      limits: { aiPerInstallPerDay: service.config.aiDailyLimit, analysesPerInstallPerDay: service.config.hardDailyLimit, cacheHours: service.config.ttlSeconds / 3600 },
      calibration: cal.missing ? 'missing' : cal.placeholder ? 'placeholder examples (edit calibration.md)' : `${cal.examples.length} examples`,
    };
  }

  const publicUrl = (req) => (env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  app.get('/', (req, res) => {
    res.json({ name: 'Git Autopsy backend', status: 'running', try: ['/health', '/repo/expressjs/cors?intensity=savage', '/profile/octocat'], ...status() });
  });

  app.get('/health', (req, res) => res.json({ ok: true, ...status() }));

  function intensityOf(req) {
    const value = String(req.query.intensity || 'medium').toLowerCase();
    if (!INTENSITIES.includes(value)) throw Errors.badInput(`Intensity must be one of: ${INTENSITIES.join(', ')}.`);
    return value;
  }

  const clientInfo = (req) => ({ installId: req.get('x-install-id') || '', ip: req.ip, publicUrl: publicUrl(req), fresh: req.query.fresh === '1' });

  app.get('/repo/:owner/:name', async (req, res, next) => {
    try {
      const { owner, name } = req.params;
      if (!OWNER_RE.test(owner) || !REPO_RE.test(name)) throw Errors.badInput('That does not look like a valid GitHub owner/repository name.');
      res.json(await service.analyze({ kind: 'repo', owner, name, intensity: intensityOf(req), ...clientInfo(req) }));
    } catch (err) {
      next(err);
    }
  });

  app.get('/profile/:username', async (req, res, next) => {
    try {
      const { username } = req.params;
      if (!OWNER_RE.test(username)) throw Errors.badInput('That does not look like a valid GitHub username.');
      res.json(await service.analyze({ kind: 'profile', username, intensity: intensityOf(req), ...clientInfo(req) }));
    } catch (err) {
      next(err);
    }
  });

  app.delete('/cache/repo/:owner/:name', async (req, res, next) => {
    try {
      const { owner, name } = req.params;
      if (!OWNER_RE.test(owner) || !REPO_RE.test(name)) throw Errors.badInput('That does not look like a valid GitHub owner/repository name.');
      res.json({ deleted: await service.deleteCached('repo', `${owner}/${name}`) });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/cache/profile/:username', async (req, res, next) => {
    try {
      if (!OWNER_RE.test(req.params.username)) throw Errors.badInput('That does not look like a valid GitHub username.');
      res.json({ deleted: await service.deleteCached('profile', req.params.username) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/share/:id', async (req, res) => {
    const id = String(req.params.id);
    let data = null;
    if (/^[a-f0-9]{16}$/.test(id)) {
      try {
        data = await store.getShare(id);
      } catch (err) {
        console.error(`[store] getShare failed: ${err.message}`);
      }
    }
    res.set('Content-Security-Policy', "default-src 'none'; media-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:");
    res.status(data ? 200 : 404).type('html').send(data ? renderSharePage(data, publicUrl(req)) : renderShareMissing());
  });

  // The dragon video for share pages.
  app.use('/mascot', express.static(MASCOT_DIR, { maxAge: '7d', index: false }));

  app.use((req, res) => res.status(404).json({ error: { code: 'NO_ROUTE', message: 'Unknown endpoint. Use /repo/:owner/:name or /profile/:username.' } }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AutopsyError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong inside Git Autopsy: ' + err.message } });
  });

  return app;
}

module.exports = { createApp };
