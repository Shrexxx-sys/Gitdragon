// Small wrapper around the GitHub REST API.
// - Adds the optional GITHUB_TOKEN.
// - Caches responses on disk (if cacheDir is set) and re-validates them with ETags.
//   GitHub does NOT count "304 Not Modified" answers against your rate limit, so this saves a lot.
// - Turns HTTP problems into clear AutopsyErrors.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Errors } = require('./errors');

const API = 'https://api.github.com';
const FRESH_MS = 10 * 60 * 1000; // re-use a cached answer without asking GitHub for 10 minutes

function createGithubClient({ token = '', cacheDir = '', fetchImpl = fetch, freshMs = FRESH_MS } = {}) {
  const memory = new Map();
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });

  function cacheFile(url) {
    return path.join(cacheDir, crypto.createHash('sha1').update(url).digest('hex') + '.json');
  }
  function readCache(url) {
    if (memory.has(url)) return memory.get(url);
    if (!cacheDir) return null;
    try {
      const entry = JSON.parse(fs.readFileSync(cacheFile(url), 'utf8'));
      memory.set(url, entry);
      return entry;
    } catch {
      return null;
    }
  }
  function writeCache(url, entry) {
    memory.set(url, entry);
    if (cacheDir) fs.writeFileSync(cacheFile(url), JSON.stringify(entry));
  }

  /**
   * GET a GitHub API path. Returns { status, data, headers }.
   * 2xx, 404 and 409 (empty repo) are returned normally so callers can decide what they mean.
   * Rate limits, network failures and other errors throw an AutopsyError.
   */
  async function get(apiPath, { accept = 'application/vnd.github+json' } = {}) {
    const url = apiPath.startsWith('http') ? apiPath : API + apiPath;
    const cached = readCache(url);
    if (cached && Date.now() - cached.savedAt < freshMs) return cached.response;

    const headers = { Accept: accept, 'User-Agent': 'git-autopsy', 'X-GitHub-Api-Version': '2022-11-28' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cached && cached.etag) headers['If-None-Match'] = cached.etag;

    let res;
    try {
      res = await fetchImpl(url, { headers });
    } catch (err) {
      throw Errors.network(err.cause?.code || err.message);
    }

    if (res.status === 304 && cached) {
      writeCache(url, { ...cached, savedAt: Date.now() });
      return cached.response;
    }

    const remaining = res.headers.get('x-ratelimit-remaining');
    if ((res.status === 403 || res.status === 429) && (remaining === '0' || res.headers.get('retry-after'))) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      throw Errors.rateLimited(reset ? new Date(reset * 1000) : null);
    }

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    const response = {
      status: res.status,
      data,
      headers: { link: res.headers.get('link') || '' },
    };

    if (res.ok || res.status === 404 || res.status === 409) {
      writeCache(url, { savedAt: Date.now(), etag: res.headers.get('etag') || '', response });
      return response;
    }
    if (res.status === 451) return { status: 404, data, headers: response.headers }; // blocked repo: treat as not found
    throw Errors.github(res.status, (data && data.message) || 'unknown error');
  }

  /** GraphQL needs a token (GitHub gives anonymous users 0 GraphQL requests). */
  async function graphql(query, variables) {
    if (!token) return null;
    const res = await fetchImpl(API + '/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'git-autopsy', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  return { get, graphql, hasToken: Boolean(token), fetchImpl };
}

/** Reads the number of the "last" page from a GitHub Link header (used to count commits cheaply). */
function lastPageFromLink(link) {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

module.exports = { createGithubClient, lastPageFromLink };
