// FACTS ENGINE for repositories. Pure code, no AI, no network.
// Input: the raw bundle from collectors/repoCollector.js
// Output: { kind, target, facts, evidence, context, notices }
//   facts    = structured numbers/lists (used by tests and the offline writer)
//   evidence = rows shown in the panel, each with a `source` URL you can open to check it
//   context  = extra text for the AI (README excerpt) so the summary is accurate

const { daysBetween, day, median, humanDays, largestGap, gapsInDays, pct, ev, plural } = require('./util');

const LAZY_MESSAGE = /^(update|updates|updated|fix|fixed|fixes|wip|changes|change|commit|stuff|asdf+|test|testing|minor|misc|done|final|oops|temp|tmp|edit|edits|save|bug ?fix|small fix|cleanup|work|working|progress|more|again|\.+|-+|\?+|!+|[a-z]{1,3})\.?!?$/i;
const WEB_UI_MESSAGE = /^(Update|Create|Delete|Rename) \S+$|^Add files via upload$/;

const CI_PATTERNS = [
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /^\.travis\.yml$/,
  /^\.gitlab-ci\.yml$/,
  /^\.circleci\/config\.yml$/,
  /^Jenkinsfile$/,
  /^azure-pipelines\.yml$/,
  /^bitbucket-pipelines\.yml$/,
  /^appveyor\.yml$/,
  /^\.drone\.yml$/,
];
const TEST_DIR = /(^|\/)(test|tests|__tests__|spec|specs|testing|e2e)\//i;
const TEST_FILE = /([._-](test|spec)\.[a-z0-9]+$)|((^|\/)test_[^/]+\.py$)|(_test\.go$)|(Tests?\.(java|kt|cs|swift)$)/i;
const MANIFESTS = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'environment.yml', 'Cargo.toml', 'go.mod',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile', 'composer.json', 'Makefile', 'CMakeLists.txt', 'Dockerfile',
  'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml', 'pubspec.yaml', 'mix.exs', 'Package.swift', 'deno.json',
];
const ENTRY_POINT = /^(src\/|app\/|lib\/|cmd\/[^/]+\/)?(main|index|app|server|cli|__main__|manage|run|bot|lib)\.(py|js|mjs|ts|jsx|tsx|go|rs|java|rb|php|c|cpp|cs|kt|swift|dart)$/i;
const JUNK = [
  { re: /(^|\/)node_modules\//, name: 'node_modules/' },
  { re: /(^|\/)\.env$/, name: '.env' },
  { re: /(^|\/)__pycache__\//, name: '__pycache__/' },
  { re: /\.pyc$/, name: '.pyc files' },
  { re: /(^|\/)\.DS_Store$/, name: '.DS_Store' },
  { re: /(^|\/)(venv|\.venv)\//, name: 'venv/' },
];
const MESSY_NAME = /(^|[ _\-.(])(copy|final|old|backup|bak|untitled|temp|tmp)([ _\-.)0-9]|$)/i;
const RUN_COMMAND = /^(?:\$\s*)?(npm|npx|yarn|pnpm|bun|node|deno|pip3?|python3?|py|poetry|pipenv|uv|conda|cargo|go|make|cmake|docker(?:-compose)?|mvn|gradle|\.\/gradlew|java|dotnet|bundle|rails|ruby|gem|composer|php|flutter|dart|swift|brew|git clone|mix|stack|cabal|julia|Rscript|streamlit|uvicorn|flask|gunicorn|django-admin|\.\/[\w.-]+)(\s|$)/;

function firstLine(msg) {
  return String(msg || '').split('\n')[0].trim();
}

/** Turns README markdown into plain-ish text we can show / give to the AI. */
function cleanMarkdown(text) {
  return String(text || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images / badges
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/[ \t]+/g, ' ');
}

function analyzeReadme(readme) {
  if (!readme) return null;
  const text = readme.text;
  const headings = [];
  const commands = [];
  let inCode = false;
  let firstParagraph = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      if (RUN_COMMAND.test(line) && line.length <= 120 && !commands.includes(line.replace(/^\$\s*/, ''))) {
        commands.push(line.replace(/^\$\s*/, ''));
      }
      continue;
    }
    const h = line.match(/^#{1,3}\s+(.+)/);
    if (h) {
      const heading = cleanMarkdown(h[1]).replace(/[#*`_]/g, '').trim();
      if (heading && headings.length < 12) headings.push(heading);
      continue;
    }
    if (!firstParagraph) {
      const plain = cleanMarkdown(line).replace(/[*_`>]/g, '').trim();
      if (plain.length >= 30 && !/^[|\-=]/.test(plain)) firstParagraph = plain.slice(0, 300);
    }
  }

  const words = cleanMarkdown(text).split(/\s+/).filter(Boolean).length;
  return {
    path: readme.path,
    chars: readme.size,
    words,
    headings,
    commands: commands.slice(0, 8),
    firstParagraph,
    excerpt: cleanMarkdown(text).replace(/\n{3,}/g, '\n\n').trim().slice(0, 2500),
  };
}

function analyzeTree(tree, repo, packageJson, readme) {
  if (!tree) return null;
  const blobs = tree.entries.filter((e) => e.type === 'blob');
  const dirs = tree.entries.filter((e) => e.type === 'tree');
  const paths = blobs.map((b) => b.path);

  const topLevel = tree.entries
    .filter((e) => !e.path.includes('/'))
    .map((e) => (e.type === 'tree' ? e.path + '/' : e.path))
    .slice(0, 25);

  const extCounts = {};
  for (const p of paths) {
    const base = p.split('/').pop();
    const ext = base.includes('.') && !base.startsWith('.') ? base.split('.').pop().toLowerCase() : '(none)';
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }
  const fileTypes = Object.entries(extCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ext, n]) => ({ ext, count: n }));

  const isCodeFile = (p) => !/(^|\/)\.[^/]+$/.test(p) && !/\.(md|txt|ya?ml|json|lock)$/i.test(p);
  const testPaths = paths.filter((p) => (TEST_DIR.test(p) && isCodeFile(p)) || TEST_FILE.test(p));
  const ciFiles = paths.filter((p) => CI_PATTERNS.some((re) => re.test(p)));
  const licenseFile = paths.find((p) => /^(LICENSE|LICENCE|COPYING)(\.[a-z]+)?$/i.test(p)) || null;
  const manifests = MANIFESTS.filter((m) => paths.includes(m));
  for (const p of paths) if (!p.includes('/') && /\.(csproj|sln)$/.test(p)) manifests.push(p);

  const entryPoints = paths.filter((p) => ENTRY_POINT.test(p));
  if (packageJson && packageJson.main) {
    const main = packageJson.main.replace(/^\.\//, '');
    if (paths.includes(main) && !entryPoints.includes(main)) entryPoints.unshift(main);
  }

  const junk = [];
  for (const j of JUNK) {
    const count = paths.filter((p) => j.re.test(p)).length;
    if (count) junk.push({ name: j.name, count });
  }

  const messyFiles = paths.filter((p) => MESSY_NAME.test(p.split('/').pop().replace(/\.[^.]+$/, '')));

  let largest = null;
  for (const b of blobs) if (!largest || b.size > largest.size) largest = b;

  // "Read these first": README, the main manifest, then entry points.
  const readFirst = [];
  if (readme) readFirst.push(readme.path);
  if (manifests.length) readFirst.push(manifests[0]);
  for (const e of entryPoints.slice(0, 3)) if (!readFirst.includes(e)) readFirst.push(e);

  return {
    fileCount: blobs.length,
    dirCount: dirs.length,
    truncated: tree.truncated,
    topLevel,
    fileTypes,
    hasTests: testPaths.length > 0,
    testFileCount: testPaths.length,
    testExamples: testPaths.slice(0, 3),
    hasCi: ciFiles.length > 0,
    ciFiles: ciFiles.slice(0, 5),
    licenseFile,
    manifests,
    entryPoints: entryPoints.slice(0, 5),
    junk,
    messyFiles: messyFiles.slice(0, 5),
    messyFileCount: messyFiles.length,
    largestFile: largest ? { path: largest.path, kb: Math.round(largest.size / 1024) } : null,
    readFirst: readFirst.slice(0, 5),
  };
}

function analyzeCommits(raw, now) {
  const commits = raw.commits;
  if (!commits.length) return null;
  const dates = commits.map((c) => c.date).filter(Boolean);
  const newest = dates.reduce((a, b) => (a > b ? a : b));
  const oldest = dates.reduce((a, b) => (a < b ? a : b));
  const gaps = gapsInDays(dates);
  const gap = largestGap(dates);

  const authorCounts = {};
  for (const c of commits) authorCounts[c.author] = (authorCounts[c.author] || 0) + 1;
  const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];

  const messages = commits.map((c) => firstLine(c.message));
  const lazy = messages.filter((m) => LAZY_MESSAGE.test(m));
  const webUi = messages.filter((m) => WEB_UI_MESSAGE.test(m));
  const avgLen = Math.round(messages.reduce((s, m) => s + m.length, 0) / messages.length);

  return {
    total: raw.commitCount,
    totalExact: raw.commitCountExact,
    sampleSize: commits.length,
    lastCommit: day(newest),
    daysSinceLastCommit: daysBetween(newest, now),
    sampleOldest: day(oldest),
    largestGap: gap,
    medianGapDays: median(gaps),
    authorsInSample: Object.keys(authorCounts).length,
    topAuthor: topAuthor ? { name: topAuthor[0], commits: topAuthor[1], percent: pct(topAuthor[1], commits.length) } : null,
    lazyCount: lazy.length,
    lazyExamples: [...new Set(lazy)].slice(0, 4),
    webUiCount: webUi.length,
    avgMessageLength: avgLen,
    recentMessages: messages.slice(0, 10).map((m) => m.slice(0, 100)),
  };
}

function languagePercents(languages) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, percent: pct(bytes, total) }))
    .filter((l) => l.percent >= 1)
    .slice(0, 8);
}

function computeRepoFacts(raw, now = new Date()) {
  const r = raw.repo;
  const api = `https://api.github.com/repos/${r.full_name}`;
  const commits = analyzeCommits(raw, now);
  const readme = analyzeReadme(raw.readme);
  const tree = analyzeTree(raw.tree, r, raw.packageJson, raw.readme);
  const languages = languagePercents(raw.languages);
  const ageDays = daysBetween(r.created_at, now);
  const scripts = raw.packageJson ? Object.keys(raw.packageJson.scripts) : [];

  const facts = {
    name: r.full_name,
    url: r.html_url,
    description: r.description,
    homepage: r.homepage || null,
    topics: r.topics,
    isFork: r.fork,
    parent: r.parent,
    archived: r.archived,
    isEmpty: raw.isEmpty,
    createdAt: day(r.created_at),
    ageDays,
    pushedAt: day(r.pushed_at),
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count,
    openIssuesAndPrs: r.open_issues_count,
    license: r.license && r.license !== 'NOASSERTION' ? r.license : tree && tree.licenseFile ? 'present (unrecognized type)' : null,
    languages,
    primaryLanguage: languages[0] ? languages[0].name : r.language || null,
    commits,
    readme,
    tree,
    packageScripts: scripts,
  };

  // ---------- evidence rows (what the panel shows) ----------
  const E = [];
  E.push(ev('name', 'Repository', r.full_name, api));
  E.push(ev('description', 'Description', r.description || 'no description set', api));
  if (r.topics.length) E.push(ev('topics', 'Topics', r.topics.join(', '), api));
  E.push(ev('created', 'Created on', `${day(r.created_at)} (${humanDays(ageDays)} ago)`, api));
  E.push(ev('stars', 'Stars', r.stargazers_count, api));
  E.push(ev('forks', 'Forks', r.forks_count, api));
  if (r.subscribers_count != null) E.push(ev('watchers', 'Watchers', r.subscribers_count, api));
  E.push(ev('open_issues', 'Open issues + pull requests (GitHub counts them together)', r.open_issues_count, api));
  if (r.archived) E.push(ev('archived', 'Archived (read-only)', 'yes', api));
  if (r.fork) E.push(ev('fork_of', 'Fork of', r.parent || 'another repository', api));
  E.push(ev('license', 'License', facts.license || 'no license', api + '/license'));
  E.push(
    ev('languages', 'Languages (by bytes of code)', languages.length ? languages.map((l) => `${l.name} ${l.percent}%`).join(', ') : 'none detected', api + '/languages')
  );

  if (raw.isEmpty) {
    E.push(ev('commit_count', 'Total commits', 0, api + '/commits'));
  } else if (commits) {
    E.push(ev('commit_count', 'Total commits', `${commits.total}${commits.totalExact ? '' : '+'}`, api + '/commits'));
    E.push(ev('last_commit', 'Last commit', `${commits.lastCommit} (${humanDays(commits.daysSinceLastCommit)} ago)`, api + '/commits'));
    E.push(
      ev('commit_sample', 'Commits analysed for patterns', `latest ${commits.sampleSize} (from ${commits.sampleOldest} to ${commits.lastCommit})`, api + '/commits?per_page=100')
    );
    if (commits.largestGap)
      E.push(
        ev('largest_gap', 'Longest gap between commits (in that sample)', `${commits.largestGap.days} days (${commits.largestGap.from} to ${commits.largestGap.to})`, api + '/commits?per_page=100')
      );
    if (commits.medianGapDays != null) E.push(ev('median_gap', 'Typical (median) gap between commits', `${commits.medianGapDays} days`, api + '/commits?per_page=100'));
    E.push(ev('authors', 'Different authors in that sample', commits.authorsInSample, api + '/commits?per_page=100'));
    if (commits.topAuthor)
      E.push(ev('top_author', 'Most frequent author in that sample', `${commits.topAuthor.name} (${commits.topAuthor.percent}% of commits)`, api + '/commits?per_page=100'));
    E.push(
      ev('lazy_messages', 'Low-effort commit messages (like "update", "fix", "wip")', `${commits.lazyCount} of ${commits.sampleSize}${commits.lazyExamples.length ? ` e.g. ${commits.lazyExamples.map((m) => `"${m}"`).join(', ')}` : ''}`, api + '/commits?per_page=100')
    );
    if (commits.webUiCount) E.push(ev('web_ui_commits', 'Default GitHub web-editor messages (like "Update README.md")', `${commits.webUiCount} of ${commits.sampleSize}`, api + '/commits?per_page=100'));
    E.push(ev('recent_messages', 'Most recent commit messages', commits.recentMessages.map((m) => `"${m}"`).join(' | '), api + '/commits?per_page=100'));
  }

  if (readme) {
    E.push(ev('readme', 'README', `${readme.path}: ${readme.words} words, ${readme.chars} characters`, api + '/readme'));
    if (readme.headings.length) E.push(ev('readme_headings', 'README section headings', readme.headings.join(' | '), api + '/readme'));
    E.push(ev('run_commands', 'Commands found in README code blocks', readme.commands.length ? readme.commands.join(' ; ') : 'none found', api + '/readme'));
  } else {
    E.push(ev('readme', 'README', 'missing', api + '/readme'));
  }
  if (scripts.length) E.push(ev('package_scripts', 'npm scripts in package.json', scripts.slice(0, 10).join(', '), api + '/contents/package.json'));

  if (tree) {
    const treeSrc = `${api}/git/trees/${r.default_branch}?recursive=1`;
    E.push(ev('file_count', 'Files', `${tree.fileCount}${tree.truncated ? '+ (GitHub cut the list short: huge repo)' : ''} in ${tree.dirCount} folders`, treeSrc));
    E.push(ev('top_level', 'Top-level files and folders', tree.topLevel.join(', '), treeSrc));
    E.push(ev('file_types', 'Most common file types', tree.fileTypes.map((f) => `.${f.ext} (${f.count})`).join(', '), treeSrc));
    E.push(ev('tests', 'Tests', tree.hasTests ? `yes: ${plural(tree.testFileCount, 'test-looking file')}, e.g. ${tree.testExamples.join(', ')}` : 'no test files found', treeSrc));
    E.push(ev('ci', 'CI (automatic checks)', tree.hasCi ? `yes: ${tree.ciFiles.join(', ')}` : 'no CI config found', treeSrc));
    E.push(ev('manifests', 'Project/build files', tree.manifests.length ? tree.manifests.join(', ') : 'none found', treeSrc));
    if (tree.entryPoints.length) E.push(ev('entry_points', 'Likely entry-point files', tree.entryPoints.join(', '), treeSrc));
    E.push(ev('read_first', 'Suggested files to read first', tree.readFirst.join(', ') || 'none', treeSrc));
    if (tree.junk.length) E.push(ev('committed_junk', 'Files that usually should NOT be committed', tree.junk.map((j) => `${j.name} (${j.count})`).join(', '), treeSrc));
    if (tree.messyFileCount)
      E.push(ev('messy_names', 'Files with names like "copy", "final", "old", "backup"', `${tree.messyFileCount}, e.g. ${tree.messyFiles.join(', ')}`, treeSrc));
    if (tree.largestFile) E.push(ev('largest_file', 'Largest file', `${tree.largestFile.path} (${tree.largestFile.kb} KB)`, treeSrc));
  }

  const notices = [];
  if (raw.isEmpty) notices.push('This repository is empty: it has no commits yet.');
  if (r.archived) notices.push('This repository is archived (read-only).');
  if (r.fork) notices.push(`This is a fork${r.parent ? ` of ${r.parent}` : ''}. Commit history may mostly belong to the original project.`);
  if (tree && tree.truncated) notices.push('This repository is huge. GitHub only returned part of the file list, so file counts are a minimum.');

  return {
    kind: 'repo',
    target: r.full_name,
    url: r.html_url,
    facts,
    evidence: E,
    context: {
      readmeExcerpt: readme ? readme.excerpt : '',
      readmeFirstParagraph: readme ? readme.firstParagraph : null,
    },
    notices,
  };
}

module.exports = { computeRepoFacts, analyzeReadme, analyzeTree, analyzeCommits, LAZY_MESSAGE, WEB_UI_MESSAGE };
