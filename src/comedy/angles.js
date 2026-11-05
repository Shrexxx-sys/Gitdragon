// ANGLE DETECTOR (plain code, no AI).
// Scans the facts and finds the most roastable patterns, ranked by how unusual they are.
// Each angle becomes an EVIDENCE CARD:
//   { id, angle, fact, number, source_url, exact_quote, details, score }
//   - fact:        one plain sentence, only facts (no jokes)
//   - details:     the exact names/numbers/dates/quotes a joke must mention to count as "specific"
//   - score:       0-100, how unusual / roastable this is (higher = better material)
// There is ALWAYS at least one angle: if nothing stands out, "suspiciously_clean" jokes about that,
// and low-score "specific fallback" cards (exact commit message, exact date, exact number) are always added.

const { humanDays } = require('../facts/util');
const { PLACEHOLDER_NAME } = require('../facts/profileFacts');

const MAX_CARDS = 8;

function card(angle, score, fact, { number = null, quote = null, details = [], source }) {
  const d = [...details];
  if (number != null) d.push(String(number));
  if (quote) d.push(quote);
  return { angle, score: Math.max(0, Math.min(100, Math.round(score))), fact, number, source_url: source, exact_quote: quote, details: [...new Set(d.filter(Boolean).map(String))] };
}

function sourceFinder(result) {
  const map = Object.fromEntries(result.evidence.map((e) => [e.key, e.source]));
  return (key, fallback) => map[key] || fallback || result.url;
}

// ------------------------------------------------------------------ repo
function repoAngles(result) {
  const f = result.facts;
  const c = f.commits;
  const t = f.tree;
  const rd = f.readme;
  const src = sourceFinder(result);
  const short = f.name.split('/')[1];
  const A = [];

  if (f.isEmpty) {
    A.push(card('empty_repo', 95, `${f.name} has 0 commits. It was created on ${f.createdAt} and nothing was ever pushed.`, { number: 0, details: [f.createdAt, short], source: src('commit_count') }));
    A.push(card('empty_wait', 70, `${humanDays(f.ageDays)} have passed since ${f.createdAt} without a single push.`, { details: [humanDays(f.ageDays), f.createdAt], source: src('created') }));
    if (f.description) A.push(card('empty_promise', 75, `The description promises "${f.description}", and the repo contains 0 files.`, { quote: f.description, source: src('description') }));
  }
  if (c && c.daysSinceLastCommit >= 365) {
    const years = c.daysSinceLastCommit / 365;
    A.push(
      card('abandoned', 55 + years * 8, `Last commit on ${c.lastCommit} (${humanDays(c.daysSinceLastCommit)} ago). The final commit message was "${c.recentMessages[0]}".`, {
        number: c.lastCommit,
        quote: c.recentMessages[0],
        details: [humanDays(c.daysSinceLastCommit)],
        source: src('last_commit'),
      })
    );
  }
  if (t && t.junk.length) {
    const hasEnv = t.junk.some((j) => j.name === '.env');
    A.push(card('committed_junk', hasEnv ? 92 : 85, `The repo contains ${t.junk.map((j) => `${j.name} (${j.count} file${j.count === 1 ? '' : 's'})`).join(' and ')}, which normally should never be committed.`, { details: t.junk.map((j) => j.name), source: src('committed_junk') }));
  }
  if (c && c.totalExact && c.total >= 1000 && (!rd || rd.words < 150)) {
    A.push(card('many_commits_no_docs', 80, `${c.total} commits, and the README is ${rd ? `${rd.words} words long` : 'missing'}.`, { number: c.total, details: rd ? [String(rd.words)] : ['no README'], source: src('commit_count') }));
  }
  if (c && c.busiestDay && c.busiestDay.count >= 15 && c.busiestDay.count >= c.sampleSize * 0.25 && c.busiestDay.after <= 3) {
    A.push(
      card('burst_then_silence', 78, `${c.busiestDay.count} commits on ${c.busiestDay.date}, then only ${c.busiestDay.after} commit${c.busiestDay.after === 1 ? '' : 's'} after that day.`, {
        number: c.busiestDay.count,
        details: [c.busiestDay.date],
        source: src('busiest_day'),
      })
    );
  }
  if (f.commitTimes && f.commitTimes.sampled >= 8 && f.commitTimes.nightPercent >= 20) {
    const ct = f.commitTimes;
    A.push(card('night_commits', 50 + ct.nightPercent * 0.5, `${ct.night} of ${ct.sampled} commits were made between 1 AM and 5 AM in the author's own timezone. Busiest hour: ${ct.peakHour}:00.`, { number: ct.night, details: [`${ct.peakHour}:00`, String(ct.sampled)], source: src('commit_hours') }));
  }
  if (c && c.finalMessages.length >= 2) {
    A.push(card('final_final', 82, `Commit messages include ${c.finalMessages.map((m) => `"${m}"`).join(', ')}.`, { quote: c.finalMessages[0], details: c.finalMessages, source: src('final_messages') }));
  }
  if (c && c.lazyCount >= 2) {
    const share = c.lazyCount / c.sampleSize;
    A.push(
      card('lazy_messages', 45 + share * 50, `${c.lazyCount} of the last ${c.sampleSize} commit messages are low-effort, like ${c.lazyExamples.map((m) => `"${m}"`).join(', ')}.`, {
        number: c.lazyCount,
        quote: c.lazyExamples[0],
        details: c.lazyExamples,
        source: src('lazy_messages'),
      })
    );
  }
  if (rd && rd.onlyTitle) {
    A.push(card('readme_only_title', 75, `The README (${rd.words} words) only repeats the project name: "${(rd.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 80)}".`, { number: rd.words, quote: (rd.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 80), source: src('readme') }));
  } else if (!rd && !f.isEmpty) {
    A.push(card('no_readme', 60, `${f.name} has no README at all${t ? ` across ${t.fileCount} files` : ''}.`, { details: t ? [String(t.fileCount)] : [short], source: src('readme') }));
  }
  if (f.todoCount != null && f.todoCount >= 5 && t && t.hasTests === false) {
    A.push(card('todos_no_tests', 80, `GitHub code search finds ${f.todoCount} TODO/FIXME matches, and there are no test files.`, { number: f.todoCount, source: src('todos') }));
  } else if (f.todoCount != null && f.todoCount >= 25) {
    A.push(card('todo_pile', 50, `GitHub code search finds ${f.todoCount} TODO/FIXME matches.`, { number: f.todoCount, source: src('todos') }));
  }
  if (PLACEHOLDER_NAME.test(short)) {
    A.push(card('placeholder_name', 66, `The repository is literally named "${short}".`, { quote: short, source: src('name') }));
  }
  // In big codebases names like "partial_copy.c" are real function names, not leftovers: small repos only.
  if (t && t.messyFileCount && t.fileCount <= 500) {
    A.push(card('messy_files', 60 + Math.min(20, t.messyFileCount * 3), `${t.messyFileCount} file${t.messyFileCount === 1 ? ' has' : 's have'} names like ${t.messyFiles.slice(0, 3).map((x) => `"${x.split('/').pop()}"`).join(', ')}.`, { quote: t.messyFiles[0].split('/').pop(), details: t.messyFiles.map((x) => x.split('/').pop()), source: src('messy_names') }));
  }
  if (rd && rd.words >= 300 && f.license && t && t.hasTests && t.hasCi && f.stars === 0) {
    A.push(card('perfect_but_ignored', 72, `README of ${rd.words} words, a ${f.license} license, ${t.testFileCount} test files, CI configured, and 0 stars.`, { number: rd.words, details: [f.license, String(t.testFileCount), '0 stars'], source: src('stars') }));
  }
  if (c && c.webUiCount >= 5) {
    A.push(card('web_editor', 52, `${c.webUiCount} of the last ${c.sampleSize} commits use GitHub's default web-editor messages like "Update README.md".`, { number: c.webUiCount, source: src('web_ui_commits') }));
  }
  if (c && c.botCount >= Math.max(10, c.sampleSize * 0.3)) {
    A.push(card('bots_run_it', 55, `${c.botCount} of the last ${c.sampleSize} commits were made by bots.`, { number: c.botCount, source: src('bot_commits') }));
  }
  if (f.archived) {
    A.push(card('archived', 58, `${f.name} is archived (read-only)${c ? `; last commit ${c.lastCommit}` : ''}.`, { details: c ? [c.lastCommit] : [short], source: src('archived') }));
  }
  if (t && t.largestFile && t.largestFile.kb >= 5000) {
    A.push(card('giant_file', 50, `The largest file is ${t.largestFile.path} at ${t.largestFile.kb} KB.`, { number: t.largestFile.kb, quote: t.largestFile.path, source: src('largest_file') }));
  }
  if (c && c.largestGap && c.largestGap.days >= 180) {
    A.push(card('long_gap', 40 + Math.min(25, c.largestGap.days / 40), `Once went ${c.largestGap.days} days without a commit (${c.largestGap.from} to ${c.largestGap.to}).`, { number: c.largestGap.days, details: [c.largestGap.from, c.largestGap.to], source: src('largest_gap') }));
  }
  if (c && c.topAuthor && c.topAuthor.percent === 100 && c.sampleSize >= 20) {
    A.push(card('solo_act', 38, `${c.topAuthor.name} made 100% of the last ${c.sampleSize} commits.`, { number: c.sampleSize, quote: c.topAuthor.name, source: src('top_author') }));
  }
  if (f.openIssuesAndPrs >= 100) {
    A.push(card('issue_pile', 35 + Math.min(20, Math.log10(f.openIssuesAndPrs) * 5), `${f.openIssuesAndPrs} open issues and pull requests.`, { number: f.openIssuesAndPrs, source: src('open_issues') }));
  }
  if (t && t.hasTests === false && t.fileCount > 10 && !A.some((a) => a.angle === 'todos_no_tests')) {
    A.push(card('no_tests', 35, `${t.fileCount} files and not one of them is a test.`, { number: t.fileCount, source: src('tests') }));
  }
  if (rd && rd.words > 4000) {
    A.push(card('readme_novel', 40, `The README is ${rd.words} words long.`, { number: rd.words, source: src('readme') }));
  }
  if (f.isFork) {
    A.push(card('fork', 30, `This is a fork of ${f.parent || 'another repository'}.`, { quote: f.parent, details: [f.parent || 'fork'], source: src('fork_of') }));
  }

  // "Absence of a pattern" angle: nothing scored high, so the joke is how clean it is.
  if (!f.isEmpty && Math.max(0, ...A.map((a) => a.score)) < 45) {
    const good = [];
    if (rd) good.push(`a ${rd.words}-word README`);
    if (f.license) good.push(`a ${f.license} license`);
    if (t && t.hasTests) good.push(`${t.testFileCount} test files`);
    if (t && t.hasCi) good.push(`CI (${t.ciFiles[0]})`);
    if (c) good.push(`a commit every ${c.medianGapDays} day${c.medianGapDays === 1 ? '' : 's'} (median)`);
    A.push(card('suspiciously_clean', 48, `Nothing obviously wrong: ${good.join(', ')}.`, { details: good, source: src('readme') }));
  }

  // Specific fallbacks: always true, always about THIS repo.
  if (c && c.recentMessages[0]) {
    A.push(card('latest_message', 18, `The most recent commit message, on ${c.lastCommit}, is "${c.recentMessages[0]}".`, { quote: c.recentMessages[0], details: [c.lastCommit], source: src('recent_messages') }));
  }
  if (c && c.medianGapDays != null && c.sampleSize >= 10) {
    A.push(card('cadence', 14, `The typical gap between commits is ${c.medianGapDays} day${c.medianGapDays === 1 ? '' : 's'}, across ${c.total} commits.`, { number: c.total, details: [`${c.medianGapDays} day`], source: src('median_gap') }));
  }
  if (f.languages.length) {
    const l = f.languages[0];
    A.push(card('language_mix', 12, `${l.name} is ${l.percent}% of the code${f.languages[1] ? `, ${f.languages[1].name} ${f.languages[1].percent}%` : ''}.`, { number: `${l.percent}%`, details: [l.name], source: src('languages') }));
  }
  A.push(card('stars_and_age', 11, `${f.stars} stars and ${f.forks} forks since ${f.createdAt}.`, { number: f.stars, details: [f.createdAt, String(f.forks)], source: src('stars') }));
  if (t && t.largestFile) {
    A.push(card('largest_file', 10, `The largest file is ${t.largestFile.path} (${t.largestFile.kb} KB) out of ${t.fileCount} files.`, { quote: t.largestFile.path, details: [String(t.fileCount)], source: src('largest_file') }));
  }
  return A;
}

// ------------------------------------------------------------------ profile
function profileAngles(result) {
  const f = result.facts;
  const src = sourceFinder(result);
  const A = [];
  const reposSrc = src('analysed');

  if (f.isEmpty) {
    A.push(card('empty_profile', 95, `${f.login} has 0 public repositories after ${humanDays(f.ageDays)} on GitHub (account created ${f.createdAt}).`, { number: 0, details: [humanDays(f.ageDays), f.createdAt], source: src('public_repos') }));
    A.push(card('empty_audience', 72, `${f.followers} followers, 0 public repositories.`, { number: f.followers, details: [`${f.followers} followers`], source: src('followers') }));
    if (f.recentEvents > 0) A.push(card('empty_but_busy', 66, `${f.recentEvents} public events in the last ~90 days, and still 0 repositories of their own.`, { number: f.recentEvents, source: src('recent_events') }));
  }
  if (f.forks >= 5 && f.forkPercent >= 50) {
    A.push(card('fork_collector', 60 + f.forkPercent * 0.3, `${f.forks} forks and ${f.originals} original repos (${f.forkPercent}% forks).`, { number: f.forks, details: [String(f.originals), `${f.forkPercent}%`], source: src('originals_forks') }));
  }
  if (f.numberedSeries.length && f.numberedSeries[0].count >= 2) {
    const s = f.numberedSeries[0];
    A.push(card('numbered_series', 70 + Math.min(15, s.count * 3), `Repos named ${s.names.map((n) => `"${n}"`).join(', ')}.`, { quote: s.names[s.names.length - 1], details: s.names, source: src('numbered_series', reposSrc) }));
  }
  if (f.tutorialGroups.length) {
    const g = f.tutorialGroups[0];
    A.push(card('tutorial_rerun', 68 + Math.min(20, g.count * 4), `${g.count} repos look like the same ${g.tutorial} tutorial: ${g.repos.map((n) => `"${n}"`).join(', ')}.`, { number: g.count, details: g.repos, source: reposSrc }));
  }
  if (f.placeholderNames.length && !A.some((a) => a.angle === 'numbered_series')) {
    A.push(card('placeholder_names', 64, `Repos with placeholder names: ${f.placeholderNames.slice(0, 4).map((n) => `"${n}"`).join(', ')}.`, { quote: f.placeholderNames[0], details: f.placeholderNames, source: src('placeholder_names', reposSrc) }));
  }
  if (f.emptyRepoCount >= 2) {
    A.push(card('empty_repos', 62, `${f.emptyRepoCount} original repos are completely empty (size 0).`, { number: f.emptyRepoCount, source: src('empty_repos', reposSrc) }));
  }
  if (f.daysSinceLastActivity != null && f.daysSinceLastActivity >= 365 && !f.isEmpty) {
    A.push(card('gone_quiet', 55 + Math.min(30, (f.daysSinceLastActivity / 365) * 6), `Last public activity on ${f.lastActivity} (${humanDays(f.daysSinceLastActivity)} ago).`, { number: f.lastActivity, details: [humanDays(f.daysSinceLastActivity)], source: src('last_activity') }));
  }
  if (f.busiestYear && f.busiestYear.repos >= 10) {
    A.push(card('creation_spree', 50, `Created ${f.busiestYear.repos} original repos in ${f.busiestYear.year}.`, { number: f.busiestYear.repos, details: [f.busiestYear.year], source: src('busiest_year', reposSrc) }));
  }
  if (f.originals >= 4 && f.noDescriptionCount / f.originals >= 0.5) {
    A.push(card('no_descriptions', 52, `${f.noDescriptionCount} of ${f.originals} original repos have no description, e.g. ${f.noDescriptionExamples.slice(0, 3).map((n) => `"${n}"`).join(', ')}.`, { number: f.noDescriptionCount, details: f.noDescriptionExamples, source: src('no_description', reposSrc) }));
  }
  if (f.missingReadme.length >= 2) {
    A.push(card('missing_readmes', 48, `${f.missingReadme.length} of the ${f.readmeChecked} most recently pushed original repos have no README: ${f.missingReadme.map((n) => `"${n}"`).join(', ')}.`, { number: f.missingReadme.length, details: f.missingReadme, source: src('missing_readme') }));
  }
  if (f.allDescribed && f.allReadmesPresent && f.originals >= 3 && f.totalStars === 0) {
    A.push(card('perfect_but_ignored', 74, `All ${f.originals} original repos have descriptions and the checked ones all have READMEs. Total stars: 0.`, { number: f.originals, details: ['0'], source: src('total_stars', reposSrc) }));
  }
  if (f.originals >= 5 && f.zeroStarOriginals / f.originals >= 0.8) {
    A.push(card('zero_stars', 42, `${f.zeroStarOriginals} of ${f.originals} original repos have 0 stars.`, { number: f.zeroStarOriginals, details: [String(f.originals)], source: src('zero_stars', reposSrc) }));
  }
  if (f.largestActivityGap && f.largestActivityGap.days >= 365) {
    A.push(card('long_silence', 45, `A ${f.largestActivityGap.days}-day stretch with no visible activity (${f.largestActivityGap.from} to ${f.largestActivityGap.to}).`, { number: f.largestActivityGap.days, details: [f.largestActivityGap.from, f.largestActivityGap.to], source: src('activity_gap') }));
  }
  if (f.totalStars >= 10000) {
    const top = f.topRepos[0];
    A.push(card('star_giant', 40, `${f.totalStars} total stars; ${top.name} alone has ${top.stars}.`, { number: f.totalStars, details: [top.name, String(top.stars)], source: src('top_repos', reposSrc) }));
  }
  if (f.topLanguages.length && f.originals >= 5 && f.topLanguages[0].count / f.originals >= 0.85) {
    const l = f.topLanguages[0];
    A.push(card('one_language', 36, `${l.count} of ${f.originals} original repos are ${l.name}.`, { number: l.count, details: [l.name], source: src('top_languages', reposSrc) }));
  }
  if (f.archived >= 5) {
    A.push(card('archive_wall', 34, `${f.archived} archived repos.`, { number: f.archived, source: src('archived', reposSrc) }));
  }
  if (!f.isEmpty && f.pinned && f.pinned.length === 0) {
    A.push(card('nothing_pinned', 24, `${f.login} has ${f.originals} original repos and none of them pinned.`, { number: f.originals, details: ['none pinned'], source: src('pinned') }));
  }

  if (!f.isEmpty && Math.max(0, ...A.map((a) => a.score)) < 45) {
    const good = [`${f.originals} original repos`];
    if (f.allDescribed) good.push('every one with a description');
    if (f.daysSinceLastActivity != null && f.daysSinceLastActivity < 30) good.push(`active ${humanDays(f.daysSinceLastActivity)} ago`);
    if (f.topLanguages[0]) good.push(`mostly ${f.topLanguages[0].name}`);
    A.push(card('suspiciously_clean', 48, `Nothing obviously wrong: ${good.join(', ')}.`, { details: good, source: reposSrc }));
  }

  // Specific fallbacks.
  if (f.topRepos[0] && !A.some((a) => a.angle === 'star_giant')) {
    const r = f.topRepos[0];
    A.push(card('top_repo', 16, `The most-starred original repo is ${r.name} with ${r.stars} stars${r.description ? `: "${r.description}"` : ''}.`, { quote: r.name, details: [String(r.stars)], source: src('top_repos', reposSrc) }));
  }
  if (f.mostActiveRecentRepo) {
    A.push(card('recent_focus', 14, `${f.mostActiveRecentRepo.events} of the ${f.recentEvents} recent public events are on ${f.mostActiveRecentRepo.repo}.`, { quote: f.mostActiveRecentRepo.repo, details: [String(f.mostActiveRecentRepo.events)], source: src('most_active_recent') }));
  }
  if (f.topLanguages[0]) {
    A.push(card('language_habit', 12, `${f.topLanguages[0].name} in ${f.topLanguages[0].count} original repo${f.topLanguages[0].count === 1 ? '' : 's'}.`, { number: f.topLanguages[0].count, details: [f.topLanguages[0].name], source: src('top_languages', reposSrc) }));
  }
  A.push(card('account_age', 10, `Account created on ${f.createdAt} (${humanDays(f.ageDays)} ago), ${f.publicRepos} public repos.`, { number: f.publicRepos, details: [f.createdAt, humanDays(f.ageDays)], source: src('account_age') }));
  return A;
}

/** Returns the top evidence cards, best first, with ids C1, C2, ... */
function detectAngles(result, { max = MAX_CARDS } = {}) {
  const all = result.kind === 'repo' ? repoAngles(result) : profileAngles(result);
  const seen = new Set();
  return all
    .filter((a) => (seen.has(a.angle) ? false : seen.add(a.angle)))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((a, i) => ({ id: `C${i + 1}`, ...a }));
}

module.exports = { detectAngles };
