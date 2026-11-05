// SERVICE: one analysis request, with caching, daily limits and graceful AI fallback.
//
//   1. Ask GitHub for the target's "last updated" marker (1 cheap request: repo pushed_at / profile updated_at).
//   2. Cache key = version : kind : target : intensity : marker. Cache hit -> return it (no AI call, no quota used).
//   3. Count this install's analyses today (anonymous, hashed).
//        over HARD limit  -> friendly DAILY_LIMIT error
//        over AI limit    -> still analyse, but with the offline roast (protects the free AI quota)
//   4. Run the analysis. If the AI is out of quota or fails, the writer already fell back to the
//      offline roast; we add a notice that says so.
//   5. Store full-quality results (AI-written, or no AI configured) with an expiry, plus a share link.

const { repoAutopsy, profileAutopsy } = require('./autopsy');
const { sha, today, shareIdFor } = require('./store');
const { Errors } = require('./errors');

const CACHE_VERSION = 'v3'; // bump when the analysis format changes, so old cache entries are ignored

function config(env) {
  return {
    ttlSeconds: Number(env.CACHE_TTL_HOURS || 168) * 3600, // 7 days
    aiDailyLimit: Number(env.AI_DAILY_LIMIT || 20), // AI-written analyses per install per day
    hardDailyLimit: Number(env.HARD_DAILY_LIMIT || 150), // any analyses per install per day
    salt: env.HASH_SALT || 'git-autopsy-local-salt',
  };
}

/** Never let a cache/store hiccup break an analysis. */
async function safe(promise, label) {
  try {
    return await promise;
  } catch (err) {
    console.error(`[store] ${label} failed: ${err.message}`);
    return null;
  }
}

async function getMarker(gh, kind, { owner, name, username }) {
  if (kind === 'repo') {
    const res = await gh.get(`/repos/${owner}/${name}`);
    if (res.status === 404) throw Errors.notFound(`Repository ${owner}/${name}`);
    return { target: res.data.full_name.toLowerCase(), marker: res.data.pushed_at || res.data.updated_at || 'none' };
  }
  const res = await gh.get(`/users/${username}`);
  if (res.status === 404) throw Errors.notFound(`GitHub user ${username}`);
  return { target: res.data.login.toLowerCase(), marker: res.data.updated_at || 'none' };
}

/** The anonymous identity used for daily limits: salted hash of the install ID (or of the IP as a fallback). */
function clientHash(salt, { installId, ip }) {
  const id = installId && /^[A-Za-z0-9-]{8,64}$/.test(installId) ? `install:${installId}` : `ip:${ip || 'unknown'}`;
  return sha(`${salt}|${id}`).slice(0, 32);
}

const OFFLINE_NOTE = 'so this roast comes from the built-in offline writer (still built only on facts)';

function createService({ gh, providers, store, env = process.env }) {
  const cfg = config(env);
  const hasAI = Boolean(providers.summary || providers.humor);

  /**
   * @param req { kind, owner, name, username, intensity, fresh, installId, ip, publicUrl }
   */
  async function analyze(req) {
    const { kind, intensity, fresh } = req;
    const { target, marker } = await getMarker(gh, kind, req);
    const key = `${CACHE_VERSION}:${kind}:${target}:${intensity}:${marker}`;

    if (!fresh) {
      const hit = await safe(store.getResult(key), 'getResult');
      if (hit) return { ...hit, cached: true };
    }

    const used = (await safe(store.incrementUsage(clientHash(cfg.salt, req), today()), 'incrementUsage')) || 0;
    if (used > cfg.hardDailyLimit) throw Errors.dailyLimit(cfg.hardDailyLimit);
    const aiAllowed = used <= cfg.aiDailyLimit;

    const run = kind === 'repo' ? repoAutopsy : profileAutopsy;
    const data = await run({
      gh,
      providers: aiAllowed ? providers : { summary: null, humor: null },
      owner: req.owner,
      name: req.name,
      username: req.username,
      intensity,
    });

    const warnings = data.aiWarnings || [];
    delete data.aiWarnings; // internal detail: logged, never sent to users or stored
    if (warnings.length) console.warn(`[ai] ${target}: ${warnings.join(' / ').slice(0, 500)}`);

    let aiFellBack = false;
    if (hasAI && !aiAllowed) {
      data.notices.unshift(`You've used today's ${cfg.aiDailyLimit} AI-written analyses, ${OFFLINE_NOTE}. AI roasts are back tomorrow.`);
      data.aiStatus = 'daily_limit';
    } else if (hasAI && /offline templates/.test(data.generatedBy)) {
      aiFellBack = true;
      const quota = warnings.some((w) => /\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(w));
      data.notices.unshift(quota ? `The free AI quota is used up right now, ${OFFLINE_NOTE}.` : `The AI didn't answer properly, ${OFFLINE_NOTE}.`);
      data.aiStatus = quota ? 'quota' : 'failed';
    } else {
      data.aiStatus = hasAI ? 'ok' : 'offline';
    }
    if (gh.tokenInvalid) data.notices.push("The server's GitHub token has expired, so it's using GitHub's lower public limit until the owner replaces it.");

    // Only cache full-quality answers, so a temporary fallback doesn't get stuck in the cache.
    if (!aiFellBack && (aiAllowed || !hasAI)) {
      if (req.publicUrl) data.shareUrl = `${req.publicUrl}/share/${shareIdFor(key)}`;
      const stored = await safe(store.putResult(key, { kind, target, intensity, marker }, data, cfg.ttlSeconds), 'putResult');
      if (!stored) delete data.shareUrl; // the link would lead nowhere
    }
    return data;
  }

  async function deleteCached(kind, target) {
    return (await safe(store.deleteTarget(kind, target.toLowerCase()), 'deleteTarget')) || 0;
  }

  return { analyze, deleteCached, config: cfg, hasAI };
}

module.exports = { createService, clientHash, CACHE_VERSION };
