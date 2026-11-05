// OFFLINE WRITER: builds { summary, roast } from facts with simple templates (no AI).
// Used when no AI key is configured, or when the AI keeps failing validation.
// Every line here only uses numbers/names that come straight from the facts.

const { humanDays } = require('./facts/util');

function sentence(text) {
  const t = String(text).replace(/\*\*|__/g, '').trim().replace(/\.+$/, '');
  return /[!?]$/.test(t) ? t : t + '.';
}

function quoteList(items) {
  return items.map((x) => `"${x}"`).join(', ');
}

// ---------------- repo ----------------

function repoSummary(f) {
  let what = f.description || (f.readme && f.readme.firstParagraph) || null;
  if (!what) what = f.isEmpty ? 'An empty repository with no code yet.' : `A ${f.primaryLanguage || 'code'} project with no description or README explanation.`;
  what = sentence(what);
  if (f.primaryLanguage && !what.includes(f.primaryLanguage)) what += ` Written mainly in ${f.primaryLanguage}.`;

  let how;
  const cmds = f.readme ? f.readme.commands : [];
  const manifests = f.tree ? f.tree.manifests : [];
  if (cmds.length) {
    how = `The README lists these commands: ${cmds.slice(0, 4).map((c) => `\`${c}\``).join(', ')}.`;
  } else if (f.packageScripts.length) {
    const main = ['start', 'dev', 'serve', 'build'].find((s) => f.packageScripts.includes(s));
    how = `Run \`npm install\`${main ? `, then \`npm run ${main}\`` : ''}. Available npm scripts: ${f.packageScripts.slice(0, 6).join(', ')}.`;
  } else if (manifests.includes('requirements.txt')) {
    how = 'Install dependencies with `pip install -r requirements.txt`, then run the entry-point file.';
  } else if (manifests.includes('Cargo.toml')) {
    how = 'Build and run with `cargo run`.';
  } else if (manifests.includes('go.mod')) {
    how = 'Build and run with `go run .` (or see the cmd/ folder).';
  } else if (manifests.includes('Dockerfile')) {
    how = 'There is a Dockerfile, so it can be built with `docker build .`.';
  } else {
    how = f.isEmpty ? 'Nothing to run yet.' : 'The README gives no run instructions.';
  }

  return { what_it_does: what, how_to_run: how, read_first: f.tree ? f.tree.readFirst : f.readme ? [f.readme.path] : [] };
}

function repoRoast(f) {
  const lines = [];
  const c = f.commits;
  const t = f.tree;

  if (f.isEmpty) {
    lines.push('Zero commits. This repository is a name and a dream.');
    lines.push('No code means no bugs. Technically the cleanest codebase on GitHub.');
    lines.push(`${f.stars} stars, ${f.forks} forks, 0 files. The audience is waiting, and so is the code.`);
  }
  if (f.archived) lines.push('Archived. Officially declared dead by its own author.');
  if (c && c.daysSinceLastCommit > 365) lines.push(`Last commit was on ${c.lastCommit}, ${humanDays(c.daysSinceLastCommit)} ago. This repo isn't resting, it's fossilized.`);
  if (c && c.largestGap && c.largestGap.days >= 60) lines.push(`It once went ${c.largestGap.days} days without a single commit (${c.largestGap.from} to ${c.largestGap.to}). That's not a break, that's a sabbatical.`);
  if (c && c.lazyCount >= 3) lines.push(`${c.lazyCount} of the last ${c.sampleSize} commit messages are masterpieces like ${quoteList(c.lazyExamples.slice(0, 3))}. Riveting storytelling.`);
  if (c && c.webUiCount >= 3) lines.push(`${c.webUiCount} commits use GitHub's default "Update file" message. Writing a commit message is optional, apparently.`);
  if (t && t.junk.length) lines.push(`Committed ${t.junk.map((j) => j.name).join(' and ')} to the repo. .gitignore was right there.`);
  if (c && c.botCount >= 10) lines.push(`${c.botCount} of the last ${c.sampleSize} commits were made by bots. The robots are doing the real work here.`);
  if (c && c.topAuthor && c.topAuthor.percent >= 50 && c.topAuthor.percent < 100 && c.authorsInSample > 1)
    lines.push(`${c.topAuthor.name} made ${c.topAuthor.percent}% of the last ${c.sampleSize} commits. Everyone else is just visiting.`);
  if (f.openIssuesAndPrs >= 100 && f.stars < 1000) lines.push(`${f.openIssuesAndPrs} open issues + PRs. The to-do list has its own to-do list.`);
  if (t && t.messyFileCount) lines.push(`Files like ${quoteList(t.messyFiles.slice(0, 2))}. Version control exists so you don't have to do this.`);
  if (!f.readme && !f.isEmpty) lines.push('No README. The code is the documentation, and the code is not talking.');
  if (f.readme && f.readme.words < 40) lines.push(`The README is ${f.readme.words} words long. Shorter than a decent commit message.`);
  if (f.readme && f.readme.words > 4000) lines.push(`The README is ${f.readme.words} words. That's not documentation, that's a novel.`);
  if (f.readme && f.readme.words >= 1500 && f.readme.words <= 4000) lines.push(`The README is ${f.readme.words} words. Someone really wants you to read the manual.`);
  // hasTests / hasCi are null when the file list was cut short (unknown), so only roast a confirmed "false".
  if (t && t.hasTests === false) lines.push('No test files found. Bold strategy: production is the test suite.');
  if (t && t.hasCi === false && t.fileCount > 5) lines.push('No CI config. Every merge is a trust fall.');
  if (!f.license && !f.isEmpty) lines.push('No license, so legally nobody is allowed to use this. Problem solved before it started.');
  if (!f.description && !f.isEmpty) lines.push('No description set. Pure mystery-box energy.');
  if (f.stars === 0 && !f.isEmpty) lines.push('0 stars. Not even a pity star from the author.');
  if (f.stars >= 1000 && f.openIssuesAndPrs >= 50) lines.push(`${f.stars} stars and ${f.openIssuesAndPrs} open issues + PRs. Fame comes with homework.`);
  if (c && c.total <= 5 && !f.isEmpty) lines.push(`${c.total} commit${c.total === 1 ? '' : 's'} in total. Blink and you miss the entire history.`);
  if (c && c.topAuthor && c.topAuthor.percent === 100 && c.sampleSize >= 10) lines.push(`${c.topAuthor.name} wrote 100% of the last ${c.sampleSize} commits. A one-person band.`);
  if (t && t.fileCount > 5000) lines.push(`${t.fileCount} files. Somewhere in there is the one that matters.`);

  // Always have at least 3 lines: add neutral fact-based jokes.
  const filler = [];
  if (f.languages.length) filler.push(`${f.languages[0].name} makes up ${f.languages[0].percent}% of the code. Commitment to one thing, at least.`);
  if (c) filler.push(`${c.total}${c.totalExact ? '' : '+'} commits over ${humanDays(f.ageDays)}. Every one of them was somebody's "quick fix".`);
  if (f.stars > 0 && !lines.some((l) => l.startsWith(`${f.stars} stars`))) filler.push(`${f.stars} stars and ${f.forks} forks. The internet has spoken, quietly.`);
  if (t) filler.push(`${t.fileCount} files across ${t.dirCount} folders. The folder structure is doing its best.`);
  filler.push(`Created on ${f.createdAt}. It has been ${humanDays(f.ageDays)} and the autopsy is only now being performed.`);
  for (const l of filler) if (lines.length < 4) lines.push(l);

  return lines.slice(0, 6);
}

// ---------------- profile ----------------

function profileSummary(f) {
  const who = f.name || f.login;
  const langs = f.topLanguages.map((l) => l.name);
  let what;
  if (f.isEmpty) what = `${who} has no public repositories yet.`;
  else {
    what = `${who} has ${f.originals} original public repos${f.forks ? ` and ${f.forks} forks` : ''}${langs.length ? `, mostly in ${langs.slice(0, 3).join(', ')}` : ''}.`;
    const best = f.topRepos[0];
    if (best && best.stars > 0) what += ` Best known for ${best.name} (${best.stars} stars)${best.description ? `: ${sentence(best.description)}` : '.'}`;
    if (f.bio) what += ` Bio: "${f.bio}"`;
  }
  return {
    what_they_build: what,
    main_languages: langs.length ? f.topLanguages.map((l) => `${l.name} (${l.count} repo${l.count === 1 ? '' : 's'})`).join(', ') : 'None detected.',
    notable_repos: f.topRepos.slice(0, 4).map((r) => `${r.name}: ${r.description || 'no description'}${r.stars ? ` (${r.stars} stars)` : ''}`),
  };
}

function profileRoast(f) {
  const lines = [];
  if (f.isEmpty) lines.push(`0 public repos in ${humanDays(f.ageDays)}. Lurking at a professional level.`);
  if (f.forkPercent >= 50 && f.forks >= 3) lines.push(`${f.forkPercent}% of the repos are forks. A collector, not a creator.`);
  if (f.placeholderNames.length) lines.push(`Repos named ${quoteList(f.placeholderNames.slice(0, 3))}. Naming things is hard, and it shows.`);
  if (f.originals >= 3 && f.noDescriptionCount / f.originals >= 0.4) lines.push(`${f.noDescriptionCount} of ${f.originals} original repos have no description. Mystery is a brand, I guess.`);
  if (f.missingReadme.length) lines.push(`${f.missingReadme.length} of the ${f.readmeChecked} most recent original repos ${f.missingReadme.length === 1 ? 'has' : 'have'} no README, including ${quoteList(f.missingReadme.slice(0, 2))}.`);
  if (f.daysSinceLastActivity != null && f.daysSinceLastActivity > 365) lines.push(`Last public activity: ${f.lastActivity}, ${humanDays(f.daysSinceLastActivity)} ago. The green squares have gone grey.`);
  if (f.largestActivityGap && f.largestActivityGap.days >= 180) lines.push(`Went quiet for ${f.largestActivityGap.days} days (${f.largestActivityGap.from} to ${f.largestActivityGap.to}). Touched grass, apparently.`);
  if (f.emptyRepoCount) lines.push(`${f.emptyRepoCount} original repo${f.emptyRepoCount === 1 ? ' is' : 's are'} completely empty. Ideas: 1, follow-through: 0.`);
  if (f.originals >= 5 && f.zeroStarOriginals / f.originals >= 0.8) lines.push(`${f.zeroStarOriginals} of ${f.originals} original repos have 0 stars. Building in private, but in public.`);
  if (f.busiestYear && f.busiestYear.repos >= 10) lines.push(`Created ${f.busiestYear.repos} repos in ${f.busiestYear.year}. Starting projects is the hobby; finishing them is optional.`);
  if (f.totalStars >= 10000) lines.push(`${f.totalStars} total stars. Hard to roast, so we'll just say: ${f.followers} followers is a lot of people waiting for bug fixes.`);
  if (!f.isEmpty && f.pinned && f.pinned.length === 0) lines.push('Nothing pinned. Even the author could not pick a favorite.');

  const filler = [];
  if (f.topLanguages.length) filler.push(`${f.topLanguages[0].name} in ${f.topLanguages[0].count} repos. Found a comfort zone and built a house in it.`);
  filler.push(`Account opened on ${f.createdAt}: ${humanDays(f.ageDays)} of commits, forks and "I'll finish it this weekend".`);
  if (f.followers || f.following) filler.push(`${f.followers} followers, following ${f.following}. Networking: in progress.`);
  if (f.originals) filler.push(`${f.totalStars} total stars across ${f.originals} original repos.`);
  for (const l of filler) if (lines.length < 4) lines.push(l);
  return lines.slice(0, 6);
}

function offlineWrite(result) {
  if (result.kind === 'repo') return { summary: repoSummary(result.facts), roast: repoRoast(result.facts) };
  return { summary: profileSummary(result.facts), roast: profileRoast(result.facts) };
}

module.exports = { offlineWrite };
