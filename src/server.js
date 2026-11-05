// Express app with two endpoints:
//   GET /repo/:owner/:name
//   GET /profile/:username
// Errors always come back as JSON: { error: { code, message } } so the panel can show them.

const express = require('express');
const cors = require('cors');
const { createGithubClient } = require('./githubClient');
const { getProvider } = require('./aiProvider');
const { repoAutopsy, profileAutopsy } = require('./autopsy');
const { AutopsyError, Errors } = require('./errors');

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const RESULT_TTL_MS = 10 * 60 * 1000;

function createApp({ env = process.env, gh, provider } = {}) {
  gh = gh || createGithubClient({ token: env.GITHUB_TOKEN || '', cacheDir: env.GITHUB_CACHE_DIR || '' });
  provider = provider === undefined ? getProvider(env) : provider;
  const results = new Map(); // finished autopsies, so re-opening the panel is instant

  const app = express();
  app.use(cors()); // the extension calls us from its background worker
  app.disable('x-powered-by');

  app.get('/', (req, res) => {
    res.json({
      name: 'Git Autopsy backend',
      status: 'running',
      try: ['/health', '/repo/expressjs/cors', '/profile/octocat'],
      ai: provider ? `${provider.name} (${provider.model})` : 'offline templates',
      githubToken: gh.hasToken,
    });
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true, ai: provider ? `${provider.name} (${provider.model})` : 'offline templates', githubToken: gh.hasToken });
  });

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
      const data = await cached(`repo:${owner}/${name}`.toLowerCase(), req.query.fresh === '1', () => repoAutopsy({ gh, provider, owner, name }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get('/profile/:username', async (req, res, next) => {
    try {
      const { username } = req.params;
      if (!OWNER_RE.test(username)) throw Errors.badInput('That does not look like a valid GitHub username.');
      const data = await cached(`profile:${username}`.toLowerCase(), req.query.fresh === '1', () => profileAutopsy({ gh, provider, username }));
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
