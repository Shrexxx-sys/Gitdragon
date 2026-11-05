// Collects RAW data about one repository from the GitHub API.
// No analysis here: that happens in src/facts/repoFacts.js (pure functions, easy to test).

const { Errors } = require('../errors');
const { lastPageFromLink } = require('../githubClient');

const MAX_README_CHARS = 30000;
const MAX_TREE_ENTRIES = 20000;

function decodeBase64(content) {
  return Buffer.from(content || '', 'base64').toString('utf8');
}

/**
 * Pulls the "Date: Tue, 7 Apr 2026 02:33:03 +0530" lines out of a git patch.
 * Returns [{ hour, offset }] = the LOCAL hour the author committed at, and their UTC offset.
 * Only these lines are kept: nothing else from the patch (like emails) is stored.
 */
function parsePatchDates(text) {
  const out = [];
  const re = /^Date: \w{3}, \d{1,2} \w{3} \d{4} (\d{2}):\d{2}:\d{2} ([+-]\d{4})$/gm;
  let m;
  while ((m = re.exec(text))) out.push({ hour: Number(m[1]), offset: m[2] });
  return out;
}

/** Local commit hours for the sampled commits, from ONE compare .patch request. null if unavailable. */
async function getCommitTimes(gh, fullName, commits) {
  if (commits.length < 2 || !gh.getText) return null;
  const newest = commits[0].sha;
  const oldest = commits[commits.length - 1].sha;
  const url = `https://github.com/${fullName}/compare/${oldest}...${newest}.patch`;
  const kept = await gh.getText(url, { keep: (t) => (t.match(/^Date: .+$/gm) || []).join('\n') });
  if (!kept) return null;
  const dates = parsePatchDates(kept);
  return dates.length ? dates : null;
}

/** Number of TODO/FIXME matches via GitHub code search (needs a token). null if unavailable. */
async function countTodos(gh, fullName, tree) {
  if (!gh.hasToken || !tree) return null;
  try {
    const res = await gh.get(`/search/code?q=TODO+OR+FIXME+repo:${fullName}&per_page=1`);
    return res.status === 200 && res.data && typeof res.data.total_count === 'number' ? res.data.total_count : null;
  } catch {
    return null; // code search has its own strict limit: never fail the autopsy over it
  }
}

async function collectRepo(gh, owner, name) {
  const repoRes = await gh.get(`/repos/${owner}/${name}`);
  if (repoRes.status === 404) throw Errors.notFound(`Repository ${owner}/${name}`);
  const repo = repoRes.data;
  const base = `/repos/${repo.full_name}`; // canonical name (handles renamed repos)

  const [langRes, commitsRes, readmeRes, treeRes] = await Promise.all([
    gh.get(`${base}/languages`),
    gh.get(`${base}/commits?per_page=100`),
    gh.get(`${base}/readme`),
    gh.get(`${base}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`),
  ]);

  // 409 = "Git Repository is empty". 404 can also happen for a brand-new empty repo.
  const isEmpty = commitsRes.status === 409 || (commitsRes.status === 404 && repo.size === 0);
  const rawCommits = !isEmpty && Array.isArray(commitsRes.data) ? commitsRes.data : [];
  const commits = rawCommits.map((c) => ({
    sha: c.sha,
    message: (c.commit && c.commit.message) || '',
    date: (c.commit && (c.commit.committer?.date || c.commit.author?.date)) || null,
    author: c.author?.login || c.commit?.author?.name || 'unknown',
  }));

  // Count all commits cheaply: ask for 1 commit per page and read the "last page" number.
  let commitCount = commits.length;
  let commitCountExact = true;
  if (commits.length === 100) {
    const countRes = await gh.get(`${base}/commits?per_page=1`);
    const last = lastPageFromLink(countRes.headers.link);
    if (last) commitCount = last;
    else commitCountExact = false;
  }

  let readme = null;
  if (readmeRes.status === 200 && readmeRes.data) {
    const text = decodeBase64(readmeRes.data.content);
    readme = { path: readmeRes.data.path, size: text.length, text: text.slice(0, MAX_README_CHARS) };
  }

  let tree = null;
  if (treeRes.status === 200 && treeRes.data && Array.isArray(treeRes.data.tree)) {
    tree = {
      truncated: Boolean(treeRes.data.truncated) || treeRes.data.tree.length > MAX_TREE_ENTRIES,
      entries: treeRes.data.tree.slice(0, MAX_TREE_ENTRIES).map((e) => ({ path: e.path, type: e.type, size: e.size || 0 })),
    };
  }

  // package.json tells us the real "how to run" scripts for JavaScript projects.
  let packageJson = null;
  if (tree && tree.entries.some((e) => e.path === 'package.json' && e.type === 'blob')) {
    const pkgRes = await gh.get(`${base}/contents/package.json`);
    if (pkgRes.status === 200 && pkgRes.data && pkgRes.data.content) {
      try {
        const pkg = JSON.parse(decodeBase64(pkgRes.data.content));
        packageJson = { name: pkg.name || null, main: pkg.main || null, scripts: pkg.scripts || {} };
      } catch {
        packageJson = null; // invalid package.json: just skip it
      }
    }
  }

  const [commitTimes, todoCount] = await Promise.all([
    getCommitTimes(gh, repo.full_name, commits),
    countTodos(gh, repo.full_name, tree),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    commitTimes,
    todoCount,
    repo: {
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      homepage: repo.homepage,
      topics: repo.topics || [],
      fork: repo.fork,
      parent: repo.parent ? repo.parent.full_name : null,
      archived: repo.archived,
      created_at: repo.created_at,
      pushed_at: repo.pushed_at,
      size: repo.size,
      default_branch: repo.default_branch,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      subscribers_count: repo.subscribers_count ?? null,
      open_issues_count: repo.open_issues_count,
      license: repo.license ? repo.license.spdx_id || repo.license.name : null,
      language: repo.language,
    },
    languages: langRes.status === 200 && langRes.data ? langRes.data : {},
    isEmpty,
    commits,
    commitCount,
    commitCountExact,
    readme,
    tree,
    packageJson,
  };
}

module.exports = { collectRepo, parsePatchDates };
