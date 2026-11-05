// STORE: finished analyses (cache + share links) and daily usage counters.
//   - Supabase (free tier) when SUPABASE_URL + SUPABASE_SERVICE_KEY are set (production)
//   - in memory otherwise (local dev and tests)
// Supabase is used through its plain REST API (PostgREST), so no extra library is needed.
// Table definitions: supabase/schema.sql
//
// Privacy: we store only public GitHub data (the analysis) and a SALTED HASH of the anonymous
// install ID for daily counts. No names, emails, IPs or raw install IDs are stored.

const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const today = (now = new Date()) => now.toISOString().slice(0, 10);

/** Share IDs are short, unguessable-enough hashes of the cache key. */
function shareIdFor(key) {
  return sha(key).slice(0, 16);
}

// ---------------------------------------------------------------- memory
function memoryStore() {
  const results = new Map(); // key -> { meta, data, shareId, expiresAt }
  const usage = new Map(); // `${hash}|${day}` -> count
  return {
    kind: 'memory',
    async getResult(key) {
      const r = results.get(key);
      if (!r) return null;
      if (r.expiresAt <= Date.now()) {
        results.delete(key);
        return null;
      }
      return r.data;
    },
    async putResult(key, meta, data, ttlSeconds) {
      results.set(key, { meta, data, shareId: shareIdFor(key), expiresAt: Date.now() + ttlSeconds * 1000 });
      return shareIdFor(key);
    },
    async getShare(shareId) {
      for (const r of results.values()) if (r.shareId === shareId && r.expiresAt > Date.now()) return r.data;
      return null;
    },
    async deleteTarget(kind, target) {
      let n = 0;
      for (const [k, r] of results) {
        if (r.meta.kind === kind && r.meta.target === target) {
          results.delete(k);
          n++;
        }
      }
      return n;
    },
    async incrementUsage(installHash, day = today()) {
      const k = `${installHash}|${day}`;
      const n = (usage.get(k) || 0) + 1;
      usage.set(k, n);
      return n;
    },
  };
}

// ---------------------------------------------------------------- supabase
function supabaseStore({ url, serviceKey, fetchImpl = fetch }) {
  const base = url.replace(/\/$/, '') + '/rest/v1';
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  async function call(path, { method = 'GET', body, prefer } = {}) {
    const res = await fetchImpl(base + path, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${method} ${path.split('?')[0]} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  }
  const q = encodeURIComponent;

  return {
    kind: 'supabase',
    async getResult(key) {
      const rows = await call(`/autopsy_cache?select=data&key=eq.${q(key)}&expires_at=gt.${q(new Date().toISOString())}&limit=1`);
      return rows && rows[0] ? rows[0].data : null;
    },
    async putResult(key, meta, data, ttlSeconds) {
      const shareId = shareIdFor(key);
      await call('/autopsy_cache?on_conflict=key', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: [{ key, kind: meta.kind, target: meta.target, intensity: meta.intensity, marker: meta.marker, share_id: shareId, data, expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString() }],
      });
      // Housekeeping on ~2% of writes: drop expired rows so the free tier stays small.
      if (Math.random() < 0.02) call(`/autopsy_cache?expires_at=lt.${q(new Date().toISOString())}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
      return shareId;
    },
    async getShare(shareId) {
      const rows = await call(`/autopsy_cache?select=data&share_id=eq.${q(shareId)}&expires_at=gt.${q(new Date().toISOString())}&limit=1`);
      return rows && rows[0] ? rows[0].data : null;
    },
    async deleteTarget(kind, target) {
      const rows = await call(`/autopsy_cache?kind=eq.${q(kind)}&target=eq.${q(target)}`, { method: 'DELETE', prefer: 'return=representation' });
      return Array.isArray(rows) ? rows.length : 0;
    },
    async incrementUsage(installHash, day = today()) {
      const n = await call('/rpc/increment_usage', { method: 'POST', body: { p_install: installHash, p_day: day } });
      return Number(n) || 0;
    },
  };
}

/** Picks the store from env. */
function createStore(env = process.env, opts = {}) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) return supabaseStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY, ...opts });
  return memoryStore();
}

module.exports = { createStore, memoryStore, supabaseStore, shareIdFor, sha, today };
