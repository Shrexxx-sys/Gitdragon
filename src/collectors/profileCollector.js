// Collects RAW data about one GitHub user (or organization) from the GitHub API.
// Analysis happens in src/facts/profileFacts.js.

const { Errors } = require('../errors');

const MAX_REPO_PAGES = 3; // up to 300 repos, most recently pushed first

/**
 * Pinned repos are not in the REST API. With a token we try GraphQL first.
 * Some tokens (e.g. fine-grained ones) get an empty list from GraphQL, so if it finds nothing
 * we also read the public profile page.
 */
async function getPinned(gh, username) {
  try {
    if (gh.hasToken) {
      const fromGraphql = await getPinnedGraphql(gh, username).catch(() => null);
      if (fromGraphql && fromGraphql.length) return fromGraphql;
    }
    const res = await gh.fetchImpl(`https://github.com/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'git-autopsy', Accept: 'text/html' },
    });
    if (!res.ok) return null;
    return parsePinnedFromHtml(await res.text());
  } catch {
    return null; // pinned repos are a "nice to have": never fail the whole autopsy for them
  }
}

async function getPinnedGraphql(gh, username) {
  const query = `query($login:String!){ repositoryOwner(login:$login){ ... on ProfileOwner { pinnedItems(first:6, types:REPOSITORY){ nodes { ... on Repository { nameWithOwner } } } } } }`;
  const json = await gh.graphql(query, { login: username });
  const nodes = json?.data?.repositoryOwner?.pinnedItems?.nodes;
  return Array.isArray(nodes) ? nodes.map((n) => n.nameWithOwner).filter(Boolean) : null;
}

/** Pulls "owner/repo" links out of the "Pinned" block of a GitHub profile page. */
function parsePinnedFromHtml(html) {
  const start = html.indexOf('js-pinned-items-reorder-container');
  if (start === -1) return [];
  const block = html.slice(start, start + 60000);
  const names = [];
  const re = /<a[^>]+href="\/([A-Za-z0-9-]+\/[A-Za-z0-9._-]+)"[^>]*>\s*<span[^>]*class="repo"/g;
  let m;
  while ((m = re.exec(block)) && names.length < 6) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

async function collectProfile(gh, username, { readmeSample = gh.hasToken ? 8 : 4 } = {}) {
  const userRes = await gh.get(`/users/${username}`);
  if (userRes.status === 404) throw Errors.notFound(`GitHub user ${username}`);
  const user = userRes.data;
  const login = user.login;
  const isOrg = user.type === 'Organization';

  const repos = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const path = isOrg
      ? `/orgs/${login}/repos?per_page=100&sort=pushed&type=public&page=${page}`
      : `/users/${login}/repos?per_page=100&sort=pushed&type=owner&page=${page}`;
    const res = await gh.get(path);
    if (res.status !== 200 || !Array.isArray(res.data)) break;
    repos.push(...res.data);
    if (res.data.length < 100) break;
  }

  const [eventsRes, pinned] = await Promise.all([
    gh.get(`/users/${login}/events/public?per_page=100`),
    getPinned(gh, login),
  ]);

  // Check README presence for a few of the most recently pushed original (non-fork, non-empty) repos.
  const sample = repos.filter((r) => !r.fork && r.size > 0).slice(0, readmeSample);
  const readmeChecks = await Promise.all(
    sample.map(async (r) => {
      const res = await gh.get(`/repos/${r.full_name}/readme`);
      return { name: r.name, hasReadme: res.status === 200 };
    })
  );

  return {
    fetchedAt: new Date().toISOString(),
    user: {
      login,
      name: user.name,
      type: user.type,
      bio: user.bio,
      company: user.company,
      location: user.location,
      blog: user.blog,
      html_url: user.html_url,
      created_at: user.created_at,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      public_gists: user.public_gists,
    },
    repos: repos.map((r) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      fork: r.fork,
      archived: r.archived,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      size: r.size,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      topics: r.topics || [],
    })),
    events: Array.isArray(eventsRes.data)
      ? eventsRes.data.map((e) => ({ type: e.type, repo: e.repo?.name || null, created_at: e.created_at }))
      : [],
    pinned,
    readmeChecks,
  };
}

module.exports = { collectProfile, parsePinnedFromHtml };
