// Works out what kind of GitHub page a URL is: a repo, a profile, or neither.
// Loaded as a content script (sets window.GitAutopsyDetect) and also by Node tests (module.exports).
(function () {
  // First path segments that are GitHub features, not usernames.
  const RESERVED = new Set([
    'about', 'account', 'achievements', 'apps', 'auth', 'blog', 'business', 'case-studies', 'codespaces', 'collections',
    'contact', 'copilot', 'customer-stories', 'dashboard', 'discussions', 'education', 'enterprise', 'enterprises',
    'events', 'explore', 'features', 'git-guides', 'github-copilot', 'home', 'issues', 'join', 'login', 'logout',
    'marketplace', 'mobile', 'models', 'new', 'nonprofit', 'notifications', 'open-source', 'organizations', 'orgs',
    'partners', 'password_reset', 'premium-support', 'pricing', 'pulls', 'readme', 'repositories', 'resources',
    'search', 'security', 'sessions', 'settings', 'signup', 'site', 'solutions', 'sponsors', 'stars', 'team', 'teams',
    'topics', 'trending', 'users', 'watching', 'why-github',
  ]);
  const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
  const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
  const NONE = { type: 'none', key: 'none' };

  function detectPage(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return NONE;
    }
    if (url.hostname !== 'github.com') return NONE;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return NONE;

    const owner = decodeURIComponent(parts[0]);
    if (RESERVED.has(owner.toLowerCase()) || !OWNER_RE.test(owner)) return NONE;

    if (parts.length === 1) {
      return { type: 'profile', username: owner, key: 'profile:' + owner.toLowerCase(), label: owner };
    }

    const name = decodeURIComponent(parts[1]).replace(/\.git$/, '');
    if (!REPO_RE.test(name) || name === '.' || name === '..') return NONE;
    return { type: 'repo', owner, name, key: ('repo:' + owner + '/' + name).toLowerCase(), label: owner + '/' + name };
  }

  const api = { detectPage, RESERVED };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.GitAutopsyDetect = api;
})();
