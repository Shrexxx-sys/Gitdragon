// FACTS ENGINE for user / organization profiles. Pure code, no AI, no network.
// Input: raw bundle from collectors/profileCollector.js
// Output: { kind, target, facts, evidence, context, notices }

const { daysBetween, day, humanDays, largestGap, pct, ev, plural } = require('./util');

const PLACEHOLDER_NAME = /^(test|tests|testing|test-?repo\d*|test\d*|untitled|untitled-?\d*|demo|demo\d*|temp|tmp|new-?repo(sitory)?|my-?repo|repo\d*|project\d*|my-?project|hello-?world|helloworld|first-?(repo|project)?|my-?first-?\w*|practice|sample|example|asdf+|abc|xyz|foo|bar|playground|sandbox|learning|learn-?\w*|copy|.*-copy|.*-test)$/i;

function computeProfileFacts(raw, now = new Date()) {
  const u = raw.user;
  const api = `https://api.github.com/users/${u.login}`;
  const reposSrc = u.type === 'Organization' ? `https://api.github.com/orgs/${u.login}/repos` : `${api}/repos`;
  const repos = raw.repos;
  const originals = repos.filter((r) => !r.fork);
  const forks = repos.filter((r) => r.fork);
  const ageDays = daysBetween(u.created_at, now);

  // Languages: count original repos by their main language.
  const langCounts = {};
  for (const r of originals) if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const totalStars = originals.reduce((s, r) => s + r.stargazers_count, 0);
  const byStars = [...originals].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const topRepos = byStars.slice(0, 6).map((r) => ({
    name: r.name,
    stars: r.stargazers_count,
    language: r.language,
    description: r.description ? r.description.slice(0, 140) : null,
  }));

  const noDescription = originals.filter((r) => !r.description || !r.description.trim());
  const placeholders = repos.filter((r) => PLACEHOLDER_NAME.test(r.name));
  const emptyRepos = originals.filter((r) => r.size === 0);
  const archived = repos.filter((r) => r.archived);
  const zeroStarOriginals = originals.filter((r) => r.stargazers_count === 0);

  const missingReadme = raw.readmeChecks.filter((c) => !c.hasReadme).map((c) => c.name);

  // Activity: we only know repo creation dates, last-push dates and the last ~90 days of public events.
  const activityDates = [
    ...repos.map((r) => r.created_at),
    ...repos.map((r) => r.pushed_at),
    ...raw.events.map((e) => e.created_at),
  ].filter(Boolean);
  const lastActivity = activityDates.length ? activityDates.reduce((a, b) => (a > b ? a : b)) : null;
  const gap = largestGap(activityDates);

  const createdPerYear = {};
  for (const r of originals) {
    const y = r.created_at.slice(0, 4);
    createdPerYear[y] = (createdPerYear[y] || 0) + 1;
  }
  const busiestYear = Object.entries(createdPerYear).sort((a, b) => b[1] - a[1])[0] || null;

  const eventTypes = {};
  for (const e of raw.events) eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
  const eventRepoCounts = {};
  for (const e of raw.events) if (e.repo) eventRepoCounts[e.repo] = (eventRepoCounts[e.repo] || 0) + 1;
  const mostActiveRecentRepo = Object.entries(eventRepoCounts).sort((a, b) => b[1] - a[1])[0] || null;
  const oldestEvent = raw.events.length ? raw.events[raw.events.length - 1].created_at : null;

  const analysedAll = repos.length >= u.public_repos;

  const facts = {
    login: u.login,
    name: u.name,
    type: u.type,
    bio: u.bio,
    url: u.html_url,
    createdAt: day(u.created_at),
    ageDays,
    followers: u.followers,
    following: u.following,
    publicRepos: u.public_repos,
    analysedRepos: repos.length,
    analysedAll,
    originals: originals.length,
    forks: forks.length,
    forkPercent: pct(forks.length, repos.length),
    archived: archived.length,
    totalStars,
    topRepos,
    topLanguages,
    noDescriptionCount: noDescription.length,
    noDescriptionExamples: noDescription.slice(0, 5).map((r) => r.name),
    placeholderNames: placeholders.map((r) => r.name).slice(0, 8),
    emptyRepoCount: emptyRepos.length,
    zeroStarOriginals: zeroStarOriginals.length,
    readmeChecked: raw.readmeChecks.length,
    missingReadme,
    lastActivity: day(lastActivity),
    daysSinceLastActivity: lastActivity ? daysBetween(lastActivity, now) : null,
    largestActivityGap: gap,
    createdPerYear,
    busiestYear: busiestYear ? { year: busiestYear[0], repos: busiestYear[1] } : null,
    recentEvents: raw.events.length,
    recentEventTypes: eventTypes,
    mostActiveRecentRepo: mostActiveRecentRepo ? { repo: mostActiveRecentRepo[0], events: mostActiveRecentRepo[1] } : null,
    pinned: raw.pinned,
    isEmpty: repos.length === 0,
  };

  // ---------- evidence rows ----------
  const E = [];
  E.push(ev('login', u.type === 'Organization' ? 'Organization' : 'User', `${u.login}${u.name ? ` (${u.name})` : ''}`, api));
  if (u.bio) E.push(ev('bio', 'Bio', u.bio, api));
  E.push(ev('account_age', 'Account created', `${day(u.created_at)} (${humanDays(ageDays)} ago)`, api));
  E.push(ev('followers', 'Followers / following', `${u.followers} / ${u.following}`, api));
  E.push(ev('public_repos', 'Public repositories', u.public_repos, api));
  E.push(ev('analysed', 'Repositories analysed', analysedAll ? `all ${repos.length}` : `${repos.length} most recently pushed (of ${u.public_repos})`, reposSrc));
  if (repos.length) {
    E.push(ev('originals_forks', 'Original repos vs forks', `${originals.length} original, ${forks.length} forks (${pct(forks.length, repos.length)}% forks)`, reposSrc));
    E.push(ev('total_stars', 'Total stars on original repos', totalStars, reposSrc));
    if (topRepos.length)
      E.push(ev('top_repos', 'Most-starred original repos', topRepos.map((r) => `${r.name} (${r.stars} stars${r.language ? `, ${r.language}` : ''})`).join(', '), reposSrc));
    E.push(ev('top_languages', 'Main languages (count of original repos)', topLanguages.length ? topLanguages.map((l) => `${l.name} (${l.count})`).join(', ') : 'none detected', reposSrc));
    E.push(
      ev('no_description', 'Original repos with no description', `${noDescription.length} of ${originals.length}${noDescription.length ? `, e.g. ${facts.noDescriptionExamples.join(', ')}` : ''}`, reposSrc)
    );
    E.push(ev('zero_stars', 'Original repos with 0 stars', `${zeroStarOriginals.length} of ${originals.length}`, reposSrc));
    if (placeholders.length) E.push(ev('placeholder_names', 'Repos with placeholder names (like "test", "untitled", "demo")', facts.placeholderNames.join(', '), reposSrc));
    if (emptyRepos.length) E.push(ev('empty_repos', 'Empty original repos (size 0)', emptyRepos.length, reposSrc));
    if (archived.length) E.push(ev('archived', 'Archived repos', archived.length, reposSrc));
    if (raw.readmeChecks.length)
      E.push(
        ev('missing_readme', 'README check (most recently pushed original repos)', `${missingReadme.length} of ${raw.readmeChecks.length} checked have no README${missingReadme.length ? `: ${missingReadme.join(', ')}` : ''}`, 'https://api.github.com/repos/{owner}/{repo}/readme')
      );
    if (busiestYear) E.push(ev('busiest_year', 'Year with the most new original repos', `${busiestYear[0]} (${busiestYear[1]} repos)`, reposSrc));
  }
  E.push(ev('last_activity', 'Last public activity', lastActivity ? `${day(lastActivity)} (${humanDays(facts.daysSinceLastActivity)} ago)` : 'none', reposSrc));
  if (gap)
    E.push(ev('activity_gap', 'Longest quiet period (based on repo create/push dates and recent events)', `${gap.days} days (${gap.from} to ${gap.to})`, reposSrc));
  E.push(
    ev(
      'recent_events',
      'Public events in the last ~90 days',
      raw.events.length
        ? `${raw.events.length}${oldestEvent ? ` since ${day(oldestEvent)}` : ''}: ${Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `${t.replace(/Event$/, '')} ${n}`).join(', ')}`
        : 'none',
      `${api}/events/public`
    )
  );
  if (mostActiveRecentRepo) E.push(ev('most_active_recent', 'Most active repo recently (by events)', `${mostActiveRecentRepo[0]} (${plural(mostActiveRecentRepo[1], 'event')})`, `${api}/events/public`));
  E.push(ev('pinned', 'Pinned repos', raw.pinned == null ? 'could not be read' : raw.pinned.length ? raw.pinned.join(', ') : 'none pinned', u.html_url));

  const notices = [];
  if (!repos.length) notices.push(`${u.login} has no public repositories yet, so there is not much to examine.`);
  if (!analysedAll && repos.length) notices.push(`This account has ${u.public_repos} public repos. Only the ${repos.length} most recently pushed were analysed.`);

  return {
    kind: 'profile',
    target: u.login,
    url: u.html_url,
    facts,
    evidence: E,
    context: {},
    notices,
  };
}

module.exports = { computeProfileFacts, PLACEHOLDER_NAME };
