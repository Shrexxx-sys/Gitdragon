// Builders for FAKE facts results (no GitHub needed). Start from a healthy, boring repo/profile
// and override only what a test needs. Shapes match computeRepoFacts / computeProfileFacts.

function baseRepoFacts() {
  return {
    name: 'dev/widget',
    url: 'https://github.com/dev/widget',
    description: 'A small widget library',
    homepage: null,
    topics: [],
    isFork: false,
    parent: null,
    archived: false,
    isEmpty: false,
    createdAt: '2022-01-10',
    ageDays: 1000,
    pushedAt: '2026-10-01',
    stars: 12,
    forks: 2,
    watchers: 1,
    openIssuesAndPrs: 3,
    license: 'MIT',
    languages: [{ name: 'JavaScript', percent: 88 }, { name: 'CSS', percent: 12 }],
    primaryLanguage: 'JavaScript',
    commits: {
      total: 140,
      totalExact: true,
      sampleSize: 100,
      lastCommit: '2026-10-01',
      daysSinceLastCommit: 20,
      sampleOldest: '2024-01-01',
      largestGap: { days: 30, from: '2025-01-01', to: '2025-01-31' },
      medianGapDays: 3,
      authorsInSample: 3,
      topAuthor: { name: 'dev', commits: 70, percent: 70 },
      lazyCount: 0,
      lazyExamples: [],
      botCount: 0,
      webUiCount: 0,
      avgMessageLength: 40,
      recentMessages: ['Add keyboard support to the dropdown', 'Fix focus ring color'],
      busiestDay: { date: '2025-03-03', count: 4, after: 90 },
      finalMessages: [],
    },
    readme: { path: 'README.md', chars: 4000, words: 600, headings: ['widget', 'Install'], commands: ['npm install widget'], firstParagraph: 'A small widget library.', excerpt: 'widget A small widget library ...', onlyTitle: false },
    tree: {
      fileCount: 40,
      dirCount: 6,
      truncated: false,
      topLevel: ['src/', 'test/', 'README.md', 'package.json'],
      fileTypes: [{ ext: 'js', count: 30 }],
      hasTests: true,
      testFileCount: 8,
      testExamples: ['test/a.test.js'],
      hasCi: true,
      ciFiles: ['.github/workflows/ci.yml'],
      licenseFile: 'LICENSE',
      manifests: ['package.json'],
      entryPoints: ['src/index.js'],
      junk: [],
      messyFiles: [],
      messyFileCount: 0,
      largestFile: { path: 'src/index.js', kb: 12 },
      readFirst: ['README.md', 'package.json', 'src/index.js'],
    },
    packageScripts: ['test', 'build'],
    commitTimes: { sampled: 60, night: 2, nightPercent: 3, peakHour: 14, peakCount: 9 },
    todoCount: 2,
  };
}

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v;
  }
  return out;
}

function repoResult(over = {}) {
  const facts = merge(baseRepoFacts(), over);
  return { kind: 'repo', target: facts.name, url: facts.url, facts, evidence: [], context: {}, notices: [] };
}

function baseProfileFacts() {
  return {
    login: 'dev',
    name: 'Dev',
    type: 'User',
    bio: null,
    url: 'https://github.com/dev',
    createdAt: '2019-05-01',
    ageDays: 2700,
    followers: 10,
    following: 5,
    publicRepos: 12,
    analysedRepos: 12,
    analysedAll: true,
    originals: 10,
    forks: 2,
    forkPercent: 17,
    archived: 0,
    totalStars: 40,
    topRepos: [{ name: 'widget', stars: 25, language: 'JavaScript', description: 'A small widget library' }],
    topLanguages: [{ name: 'JavaScript', count: 6 }, { name: 'Python', count: 3 }],
    noDescriptionCount: 1,
    noDescriptionExamples: ['scratch'],
    placeholderNames: [],
    emptyRepoCount: 0,
    zeroStarOriginals: 4,
    readmeChecked: 4,
    missingReadme: [],
    lastActivity: '2026-10-20',
    daysSinceLastActivity: 10,
    largestActivityGap: { days: 60, from: '2024-01-01', to: '2024-03-01' },
    createdPerYear: { 2024: 4, 2025: 6 },
    busiestYear: { year: '2025', repos: 6 },
    recentEvents: 30,
    recentEventTypes: { PushEvent: 30 },
    mostActiveRecentRepo: { repo: 'dev/widget', events: 20 },
    pinned: ['dev/widget'],
    isEmpty: false,
    tutorialGroups: [],
    numberedSeries: [],
    allDescribed: false,
    allReadmesPresent: true,
    forksCount: 2,
  };
}

function profileResult(over = {}) {
  const facts = merge(baseProfileFacts(), over);
  return { kind: 'profile', target: facts.login, url: facts.url, facts, evidence: [], context: {}, notices: [] };
}

module.exports = { repoResult, profileResult };
