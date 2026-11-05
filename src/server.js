// Express app with two endpoints:
//   GET /repo/:owner/:name
//   GET /profile/:username
// Errors always come back as JSON: { error: { code, message } } so the panel can show them.

const express = require('express');
const cors = require('cors');
const { createGithubClient } = require('./githubClient');
const { getProvider, withDiskCache } = require('./aiProvider');
const { repoAutopsy, profileAutopsy } = require('./autopsy');
const { AutopsyError, Errors } = require('./errors');
const { INTENSITIES } = require('./comedy/comedyWriter');
const { loadCalibration } = require('./comedy/calibration');

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const RESULT_TTL_MS = 10 * 60 * 1000;

const describe = (p) => (p ? `${p.name} (${p.model})` : 'offline templates');

/**
 * @param provider  optional: one provider (or null) used for both summary and humor (tests use this)
 * @param providers optional: { summary, humor }
 */
function createApp({ env = process.env, gh, provider, providers } = {}) {
  gh = gh || createGithubClient({ token: env.GITHUB_TOKEN || '', cacheDir: env.GITHUB_CACHE_DIR || '' });
  if (!providers) {
    providers =
      provider !== undefined
        ? { summary: provider, humor: provider }
        : { summary: withDiskCache(getProvider(env, 'summary'), env.AI_CACHE_DIR), humor: withDiskCache(getProvider(env, 'humor'), env.AI_CACHE_DIR) };
  }
  const results = new Map(); // finished autopsies, so re-opening the panel is instant

  const app = express();
  app.use(cors()); // the extension calls us from its background worker
  app.disable('x-powered-by');

  function status() {
    const cal = loadCalibration();
    return {
      ai: describe(providers.summary),
      humorAi: describe(providers.humor),
      githubToken: gh.hasToken,
      calibration: cal.missing ? 'missing' : cal.placeholder ? 'placeholder examples (edit calibration.md)' : `${cal.examples.length} examples`,
    };
  }

  app.get('/', (req, res) => {
    res.json({ name: 'Git Autopsy backend', status: 'running', try: ['/health', '/repo/expressjs/cors?intensity=savage', '/profile/octocat'], ...status() });
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true, ...status() });
  });

  function intensityOf(req) {
    const value = String(req.query.intensity || 'medium').toLowerCase();
    if (!INTENSITIES.includes(value)) throw Errors.badInput(`Intensity must be one of: ${INTENSITIES.join(', ')}.`);
    return value;
  }

  async function cached(key, fresh, run) {
    const hit = results.get(key);
    if (!fresh && hit && Date.now() - hit.at < RESULT_TTL_MS) return { ...hit.data, cached: true };
    const data = await run();
    results.set(key, { at: Date.now(), data });
    return data;
  }

  app.get('/repo/:owner/:name', async (req, res, next) => {
    try {
      const { owner, name } = req.params;
      if (!OWNER_RE.test(owner) || !REPO_RE.test(name)) throw Errors.badInput('That does not look like a valid GitHub owner/repository name.');
      const intensity = intensityOf(req);
      const data = await cached(`repo:${owner}/${name}:${intensity}`.toLowerCase(), req.query.fresh === '1', () => repoAutopsy({ gh, providers, owner, name, intensity }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get('/profile/:username', async (req, res, next) => {
    try {
      const { username } = req.params;
      if (!OWNER_RE.test(username)) throw Errors.badInput('That does not look like a valid GitHub username.');
      const intensity = intensityOf(req);
      const data = await cached(`profile:${username}:${intensity}`.toLowerCase(), req.query.fresh === '1', () => profileAutopsy({ gh, providers, username, intensity }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

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
