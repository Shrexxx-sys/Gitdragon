// OFFLINE COMEDY: fact-based joke templates per angle, at three intensities. No AI.
// Used when no AI key is set, or the AI fails. Every template is filled with the exact names,
// numbers, dates and quotes from the evidence card, then run through the same checks as AI jokes.

const { humanDays } = require('../facts/util');
const { checkJoke, openingPattern, allowedNumbersFor } = require('./checks');

/** Stable choice per target: the same repo always gets the same punchline, different repos usually differ. */
function pick(f, options) {
  const key = f.name || f.login || '';
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

const q = (s) => `"${s}"`;
const list = (arr, n = 2) => arr.slice(0, n).map(q).join(' and ');
const s = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Each entry: (f, card) => { mild, medium, savage }. f = facts.
const REPO = {
  empty_repo: (f) => {
    const name = f.name.split('/')[1];
    return {
      mild: `${q(name)} has 0 commits since ${f.createdAt}. A placeholder for a placeholder.`,
      medium: `Created ${f.createdAt}, 0 commits since. ${q(name)} is a name tag at a party nobody came to.`,
      savage: `Cause of death for ${q(name)}: never born. Created ${f.createdAt}, 0 commits, a headstone with no body under it.`,
    };
  },
  empty_wait: (f) => ({
    mild: `${humanDays(f.ageDays)} since ${f.createdAt}, still nothing pushed. Patience is a virtue.`,
    medium: `Waiting since ${f.createdAt}: ${humanDays(f.ageDays)} of a reservation nobody showed up for.`,
    savage: `An empty plot, reserved ${f.createdAt} and left untouched for ${humanDays(f.ageDays)}.`,
  }),
  empty_promise: (f) => ({
    mild: `The description says ${q(f.description)}. The repo says nothing.`,
    medium: `Promised ${q(f.description)}, delivered 0 files. The brochure outlived the building.`,
    savage: `${q(f.description)}, says the description of a repository containing 0 files. The epitaph came first.`,
  }),
  abandoned: (f) => {
    const c = f.commits;
    const ago = humanDays(c.daysSinceLastCommit);
    return {
      mild: `Last seen ${c.lastCommit}, saying ${q(c.recentMessages[0])}. It has not spoken in ${ago}.`,
      medium: `Time of death ${c.lastCommit}, last words ${q(c.recentMessages[0])}. Nobody has claimed the body in ${ago}.`,
      savage: `Pronounced dead ${ago} ago, final words ${q(c.recentMessages[0])}. Bleak thing to carve on a headstone dated ${c.lastCommit}.`,
    };
  },
  committed_junk: (f) => {
    const names = f.tree.junk.map((j) => j.name).join(' and ');
    return {
      mild: `${names} made it into version control. The .gitignore was right there, unused.`,
      medium: `Shipped ${names} straight into the repo. Somewhere a .gitignore is filing a missing persons report.`,
      savage: `Committed ${names}. That's not a repository, it's a crime scene with a public URL.`,
    };
  },
  many_commits_no_docs: (f) => {
    const docs = f.readme ? `a ${f.readme.words}-word README` : 'no README';
    return {
      mild: `${f.commits.total} commits and ${docs}. The code knows what it does; it just won't say.`,
      medium: `${f.commits.total} commits documented by ${docs}. Every commit is a sentence nobody else will ever read.`,
      savage: `${f.commits.total} commits, ${docs}. The knowledge dies with the maintainer, as planned.`,
    };
  },
  burst_then_silence: (f) => {
    const b = f.commits.busiestDay;
    return {
      mild: `${b.date}: ${b.count} commits in one day, then ${b.after} more ever. Peaked early.`,
      medium: `On ${b.date} it got ${b.count} commits. After that, ${b.after}. One day of fire, then the long dark.`,
      savage: `${b.count} commits on ${b.date}, then ${b.after}. That's not a sprint, that's the last thing a project does before it flatlines.`,
    };
  },
  night_commits: (f) => {
    const t = f.commitTimes;
    return {
      mild: `Busiest hour: ${t.peakHour}:00. ${t.night} of ${t.sampled} commits landed between 1 and 5 AM, all of them confident.`,
      medium: `${t.night} of ${t.sampled} commits were pushed between 1 and 5 AM local time. The code review happened in a dream, and it shows.`,
      savage: `${t.night} of ${t.sampled} commits arrived between 1 and 5 AM. Nothing good is decided at that hour, and the diff proves it.`,
    };
  },
  final_final: (f) => {
    const m = f.commits.finalMessages;
    return {
      mild: `The history contains ${list(m)}. Final is a feeling, not a status.`,
      medium: `${list(m)}: each one swore it was the last. Each one lied with a straight face.`,
      savage: `Commit log features ${list(m)}. A project that keeps announcing its death and refusing to die.`,
    };
  },
  lazy_messages: (f) => {
    const c = f.commits;
    return {
      mild: `${c.lazyCount} of the last ${c.sampleSize} commit messages are things like ${list(c.lazyExamples)}. Brevity achieved, meaning not.`,
      medium: `Commit messages like ${list(c.lazyExamples)}, ${c.lazyCount} of the last ${c.sampleSize}. The history reads like a ransom note with the words cut out.`,
      savage: `${list(c.lazyExamples)}: ${c.lazyCount} of the last ${c.sampleSize} commits, each a confession too short to hold up in court.`,
    };
  },
  readme_only_title: (f) => ({
    mild: `The README is ${f.readme.words} words and they are mostly the project's name. It introduces itself, then leaves.`,
    medium: `A ${f.readme.words}-word README that just repeats the title. A tombstone with only the name filled in.`,
    savage: `README length: ${f.readme.words} words, all of them the repo's own name. The documentation equivalent of a shrug.`,
  }),
  no_readme: (f) => {
    const files = f.tree ? `${f.tree.fileCount} files` : f.name;
    return {
      mild: `No README across ${files}. The code is the documentation, and it has chosen silence.`,
      medium: `Zero README, ${files}. Visitors arrive, look around, and back out slowly.`,
      savage: `${files} and not one word of README. Abandoned on a doorstep with no note.`,
    };
  },
  todos_no_tests: (f) => ({
    mild: `${f.todoCount} TODO/FIXME comments and no tests. Plenty of plans, no one checking.`,
    medium: `${f.todoCount} TODOs, zero tests. A list of promises with nobody verifying any were kept.`,
    savage: `${f.todoCount} TODO/FIXME notes and not one test. A to-do list written by someone who never planned to return.`,
  }),
  todo_pile: (f) => ({
    mild: `${f.todoCount} TODO/FIXME comments. The backlog lives in the code now.`,
    medium: `${f.todoCount} TODO/FIXME matches. A will nobody intends to execute.`,
    savage: `Code search counts ${f.todoCount} TODO/FIXME. Every one a small grave for an idea.`,
  }),
  placeholder_name: (f) => {
    const name = f.name.split('/')[1];
    return {
      mild: `A repository named ${q(name)}. It was meant to be temporary, and it's still here.`,
      medium: `${q(name)}: a name picked by someone who planned to delete it the same afternoon.`,
      savage: `Naming the repo ${q(name)} was the most honest decision in its whole history.`,
    };
  },
  messy_files: (f) => {
    const names = f.tree.messyFiles.map((p) => p.split('/').pop());
    const shown = names.length > 1 ? list(names) : q(names[0]);
    return {
      mild: `Files named ${shown}. Version control was installed and then politely ignored.`,
      medium: `${shown} live side by side in the repo. Git was right there, watching.`,
      savage: `The repo keeps ${shown} like trophies. Version control, but make it a hoarder's garage.`,
    };
  },
  perfect_but_ignored: (f) => ({
    mild: `${f.readme.words}-word README, ${f.license} license, tests, CI, 0 stars. Everything except an audience.`,
    medium: `Tests, CI, a ${f.license} license and a ${f.readme.words}-word README, for 0 stars. A flawless funeral with no guests.`,
    savage: `0 stars for a repo with ${f.tree.testFileCount} test files and a ${f.license} license. Perfectly embalmed, never viewed.`,
  }),
  web_editor: (f) => ({
    mild: `${f.commits.webUiCount} commits use GitHub's default "Update" message. Edited in the browser, explained to no one.`,
    medium: `${f.commits.webUiCount} of the last ${f.commits.sampleSize} commits say "Update" something. Committed like a hit-and-run.`,
    savage: `${f.commits.webUiCount} default web-editor commits. Even the commit messages were outsourced to a button.`,
  }),
  bots_run_it: (f) => ({
    mild: `${f.commits.botCount} of the last ${f.commits.sampleSize} commits came from bots. The robots are carrying this one.`,
    medium: `Bots made ${f.commits.botCount} of the last ${f.commits.sampleSize} commits. The humans left; the machines kept the lights on.`,
    savage: `${f.commits.botCount} of ${f.commits.sampleSize} recent commits are bots. Life support, fully automated.`,
  }),
  archived: (f) => {
    const last = f.commits ? `, last commit ${f.commits.lastCommit}` : '';
    return {
      mild: `Archived${last}. Retired with dignity, mostly.`,
      medium: `Archived${last}. Officially embalmed and displayed under glass.`,
      savage: `Archived${last}: the author signed the death certificate personally.`,
    };
  },
  giant_file: (f) => ({
    mild: `${f.tree.largestFile.path} weighs ${f.tree.largestFile.kb} KB. Git did not sign up for this.`,
    medium: `${f.tree.largestFile.path} at ${f.tree.largestFile.kb} KB. Every clone pays the funeral costs.`,
    savage: `A ${f.tree.largestFile.kb} KB ${f.tree.largestFile.path} in version control. Bodies are usually buried, not committed.`,
  }),
  long_gap: (f) => {
    const g = f.commits.largestGap;
    return {
      mild: `${g.days} days without a commit, ${g.from} to ${g.to}. A long nap.`,
      medium: `Between ${g.from} and ${g.to}: ${g.days} days of nothing. Long enough for the dependencies to rot on their own.`,
      savage: `${g.days} days flatlined (${g.from} to ${g.to}), then a pulse. Medical science has questions.`,
    };
  },
  solo_act: (f) => ({
    mild: `${f.commits.topAuthor.name} wrote 100% of the last ${f.commits.sampleSize} commits. A one-person band.`,
    medium: `100% of the last ${f.commits.sampleSize} commits by ${f.commits.topAuthor.name}. Playing to an empty hall, every night.`,
    savage: `Sole author of the last ${f.commits.sampleSize} commits: ${f.commits.topAuthor.name}. No witnesses, no accomplices.`,
  }),
  issue_pile: (f) => ({
    mild: `${f.openIssuesAndPrs} open issues and PRs. ${pick(f, ['The inbox has an inbox.', 'Someone will get to them. Statistically, no.', 'A suggestion box with a landfill behind it.'])}`,
    medium: `${f.openIssuesAndPrs} open issues and pull requests. ${pick(f, ['Not a backlog anymore, a geological layer.', 'Each one a small grave nobody tends.', 'The waiting room has its own waiting room.'])}`,
    savage: `${f.openIssuesAndPrs} open issues and PRs, ${pick(f, ['aging like evidence nobody will process.', 'piled up like mail at a house where nobody lives anymore.', 'filed, stamped and left to decompose.'])}`,
  }),
  no_tests: (f) => ({
    mild: `${f.tree.fileCount} files, zero tests. Confidence is a strategy.`,
    medium: `Not one test among ${f.tree.fileCount} files. Every deploy is a coin flip with extra steps.`,
    savage: `${f.tree.fileCount} files and no tests. The users are the test suite and they did not consent.`,
  }),
  readme_novel: (f) => ({
    mild: `A ${f.readme.words}-word README. Bring snacks.`,
    medium: `The README runs ${f.readme.words} words. People have written shorter wills.`,
    savage: `${f.readme.words} words of README. The documentation will outlive the project, as documentation does.`,
  }),
  fork: (f) => ({
    mild: `A fork of ${f.parent}. Inherited the code, not the attention.`,
    medium: `Forked from ${f.parent}. All of the history, none of the visitors.`,
    savage: `A copy of ${f.parent}, kept in the attic like an heirloom nobody asked for.`,
  }),
  suspiciously_clean: (f, card) => ({
    mild: `${cap(card.details.join(', '))}. Nothing to roast, which is suspicious.`,
    medium: `${cap(card.details.join(', '))}. No crimes found, which is what a careful criminal would want.`,
    savage: `${cap(card.details.join(', '))}. A spotless record, the kind they always have before the investigation.`,
  }),
  latest_message: (f) => {
    const c = f.commits;
    return {
      mild: `Latest word from the repo, dated ${c.lastCommit}: ${q(c.recentMessages[0])}. ${pick(f, ['Gripping.', 'Noted for the record.', 'Somebody frame that.'])}`,
      medium: `Most recent testimony, ${c.lastCommit}: ${q(c.recentMessages[0])}. ${pick(f, ['The court will allow it.', 'Entered into evidence without objection.', 'The witness may step down.'])}`,
      savage: `Its newest commit message is ${q(c.recentMessages[0])}, entered ${c.lastCommit}. ${pick(f, ['Prosecution rests.', 'Read it at the funeral.', 'That is the whole statement to the press.'])}`,
    };
  },
  cadence: (f) => {
    const c = f.commits;
    const every = c.medianGapDays === 0 ? 'several a day' : c.medianGapDays === 1 ? 'one a day' : `one every ${c.medianGapDays} days`;
    return {
      mild: `${c.total} commits, typically ${every}. ${pick(f, ['Like clockwork nobody wound.', 'Steady as a dripping tap.', 'A metronome with commit access.'])}`,
      medium: `Typical pace: ${every}, kept up for ${c.total} commits. ${pick(f, ['Absurd precision for something nobody is timing.', 'The heartbeat of something that refuses to be finished.', 'Consistency is a virtue, and also a symptom.'])}`,
      savage: `${c.total} commits at ${every}. ${pick(f, ['A heartbeat monitor that refuses to flatline.', 'The machine keeps breathing whether or not anyone is in the room.', 'Nobody can stop it now, least of all the maintainers.'])}`,
    };
  },
  language_mix: (f) => {
    const l = f.languages[0];
    return {
      mild: `${l.name} is ${l.percent}% of the code. ${pick(f, ['Commitment, at least.', 'No identity crisis here.', 'One language, one vision, one point of failure.'])}`,
      medium: `${l.percent}% ${l.name}. ${pick(f, ['A monoculture, one bad dependency away from extinction.', 'Diversity was considered and rejected.', 'The other languages were not invited.'])}`,
      savage: `The code is ${l.percent}% ${l.name}, ${pick(f, ['the rest is witnesses.', 'the rest is crime scene tape.', 'and the remainder is filed under "misc".'])}`,
    };
  },
  stars_and_age: (f) => ({
    mild: `Since ${f.createdAt}: ${f.stars} stars, ${f.forks} forks. The market has spoken, softly.`,
    medium: `${f.stars} stars and ${f.forks} forks since ${f.createdAt}. The audience is exactly the size it deserves.`,
    savage: `Born ${f.createdAt}, ${f.stars} stars, ${f.forks} forks. The obituary will be short.`,
  }),
  largest_file: (f) => ({
    mild: `Heaviest file: ${f.tree.largestFile.path}, out of ${f.tree.fileCount}. It carries the team.`,
    medium: `Of ${f.tree.fileCount} files, ${f.tree.largestFile.path} is the biggest. Every repo has one load-bearing file.`,
    savage: `${f.tree.largestFile.path} is the largest of ${f.tree.fileCount} files. If this repo goes down, it goes down holding that one.`,
  }),
};

const PROFILE = {
  empty_profile: (f) => ({
    mild: `${humanDays(f.ageDays)} on GitHub, 0 public repositories. Keeping the options open.`,
    medium: `Joined ${f.createdAt}, 0 public repos since. An account in witness protection.`,
    savage: `0 public repos in ${humanDays(f.ageDays)}. A ghost with a username, haunting nothing.`,
  }),
  empty_audience: (f) => ({
    mild: `${f.followers} followers and 0 public repos. The audience is seated; the stage is empty.`,
    medium: `${f.followers} followers, waiting on 0 repositories. A premiere with no film.`,
    savage: `0 repos, ${f.followers} followers. A crowd gathered around a hole in the ground.`,
  }),
  empty_but_busy: (f) => ({
    mild: `${f.recentEvents} public events lately, 0 repos of their own. Busy elsewhere.`,
    medium: `${f.recentEvents} recent public events and 0 repositories. Active at every crime scene except their own.`,
    savage: `${f.recentEvents} events in about 90 days, 0 repos. A detective with no case file.`,
  }),
  fork_collector: (f) => ({
    mild: `${f.forks} forks, ${f.originals} originals. Collecting is a hobby too.`,
    medium: `${f.forkPercent}% forks: ${f.forks} copies of other people's work, ${f.originals} of their own. A museum curator who never paints.`,
    savage: `${f.forks} forks against ${f.originals} originals. The profile is mostly other people's code wearing a name tag.`,
  }),
  numbered_series: (f) => {
    const n = f.numberedSeries[0].names;
    const shown = n.slice(0, 3).map(q).join(', ');
    return {
      mild: `Repos named ${shown}. A series, apparently.`,
      medium: `${shown}: each sequel arrived with no sign the original worked.`,
      savage: `The ${shown} franchise. Every sequel is a reboot of a failure.`,
    };
  },
  tutorial_rerun: (f) => {
    const g = f.tutorialGroups[0];
    return {
      mild: `${g.count} repos look like the same ${g.tutorial}: ${list(g.repos)}. Practice makes practice.`,
      medium: `${g.count} copies of the ${g.tutorial} tutorial, including ${list(g.repos)}. Reincarnation, but no life learns anything.`,
      savage: `${list(g.repos)}: the same ${g.tutorial}, ${g.count} times. Groundhog Day with a package.json.`,
    };
  },
  placeholder_names: (f) => ({
    mild: `Repos called ${list(f.placeholderNames, 3)}. Naming can wait, forever.`,
    medium: `${list(f.placeholderNames, 3)}: named like evidence bags nobody labeled.`,
    savage: `A profile featuring ${list(f.placeholderNames, 3)}. The graveyard didn't even bother with names.`,
  }),
  empty_repos: (f) => ({
    mild: `${f.emptyRepoCount} empty repos. Reserved seating.`,
    medium: `${f.emptyRepoCount} repos with nothing in them. Headstones bought in advance, plots still vacant.`,
    savage: `${f.emptyRepoCount} completely empty repos: a cemetery of ideas that never drew a breath.`,
  }),
  gone_quiet: (f) => ({
    mild: `Last public activity ${f.lastActivity}, ${humanDays(f.daysSinceLastActivity)} ago. On a long break.`,
    medium: `Nothing public since ${f.lastActivity}. The profile is a memorial page with a follow button.`,
    savage: `Last seen ${f.lastActivity}, ${humanDays(f.daysSinceLastActivity)} ago. Search parties have been called off.`,
  }),
  creation_spree: (f) => ({
    mild: `${f.busiestYear.repos} new repos in ${f.busiestYear.year}. Busy year.`,
    medium: `${f.busiestYear.year}: ${f.busiestYear.repos} repos created. Starting things was the hobby; finishing them was optional.`,
    savage: `Spawned ${f.busiestYear.repos} repos in ${f.busiestYear.year}. A factory that only makes prototypes.`,
  }),
  no_descriptions: (f) => ({
    mild: `${f.noDescriptionCount} of ${f.originals} original repos have no description, like ${list(f.noDescriptionExamples)}.`,
    medium: `No description on ${f.noDescriptionCount} of ${f.originals} repos, including ${list(f.noDescriptionExamples)}. Unmarked graves, neatly arranged.`,
    savage: `${f.noDescriptionCount} undescribed repos, including ${list(f.noDescriptionExamples)}: unidentified bodies in the code morgue.`,
  }),
  missing_readmes: (f) => ({
    mild: `No README in ${list(f.missingReadme)}. Mystery as a feature.`,
    medium: `${list(f.missingReadme)} have no README. Each one opens like a door into an empty room.`,
    savage: `${f.missingReadme.length} of the ${f.readmeChecked} newest repos ship without a README. Abandoned at birth, no note left.`,
  }),
  perfect_but_ignored: (f) => ({
    mild: `${f.originals} original repos, all described and documented, 0 stars total. Tidy, and unseen.`,
    medium: `Every one of ${f.originals} repos has a description and a README. Total stars: 0. Immaculate, and completely unobserved.`,
    savage: `${f.originals} perfectly documented repos and 0 stars. A beautifully kept grave nobody visits.`,
  }),
  zero_stars: (f) => ({
    mild: `${f.zeroStarOriginals} of ${f.originals} original repos have 0 stars. Quiet work.`,
    medium: `${f.zeroStarOriginals} of ${f.originals} original repos sit at 0 stars. Built in public, witnessed by no one.`,
    savage: `0 stars on ${f.zeroStarOriginals} of ${f.originals} repos. The only visitor log is the author's own.`,
  }),
  long_silence: (f) => {
    const g = f.largestActivityGap;
    return {
      mild: `${g.days} quiet days between ${g.from} and ${g.to}. ${pick(f, ['A sabbatical.', 'Gone fishing, apparently.', 'The keyboard got a long rest.'])}`,
      medium: `From ${g.from} to ${g.to}, ${g.days} days of silence. ${pick(f, ['Long enough to be declared missing in most places.', 'Plants were watered by nobody.', 'The repos aged in the dark like cheese.'])}`,
      savage: `${g.days} days without a sign of life (${g.from} to ${g.to}). ${pick(f, ['The profile was legally a cold case.', 'Search teams found only stale branches.', 'The obituary was drafted and then, awkwardly, withdrawn.'])}`,
    };
  },
  star_giant: (f) => {
    const t = f.topRepos[0];
    return {
      mild: `${f.totalStars} total stars, ${t.stars} of them on ${t.name}. ${pick(f, ['Hard to argue with.', 'One hit carries the album.', 'The rest of the repos ride for free.'])}`,
      medium: `${t.name} holds ${t.stars} of ${f.totalStars} stars. ${pick(f, ['The other repos are understudies who never go on.', 'Every other repo lives in its shadow, rent-free.', 'One headliner, a hundred opening acts nobody stays for.'])}`,
      savage: `${f.totalStars} stars, and ${t.name} carries ${t.stars} of them. ${pick(f, ['Everything else is supporting cast with no lines.', 'The rest of the profile is a very long footnote.', 'Everything else is the B-side nobody flips to.'])}`,
    };
  },
  one_language: (f) => {
    const l = f.topLanguages[0];
    return {
      mild: `${l.count} of ${f.originals} original repos in ${l.name}. Loyal.`,
      medium: `${l.name}, ${l.count} of ${f.originals} times. Every problem gets the same answer, delivered with total confidence.`,
      savage: `${l.count} of ${f.originals} repos are ${l.name}. Not a stack, a life sentence.`,
    };
  },
  archive_wall: (f) => ({
    mild: `${f.archived} archived repos. Retired.`,
    medium: `${f.archived} repos in the archive. A private cemetery with public visiting hours.`,
    savage: `${f.archived} archived repos, each one embalmed by its own creator.`,
  }),
  nothing_pinned: (f) => ({
    mild: `${f.originals} original repos, none pinned. Hard to choose.`,
    medium: `Zero pinned out of ${f.originals} originals. Even the author won't vouch for any of them.`,
    savage: `${f.originals} originals and not one pinned. The witness refuses to identify any of them.`,
  }),
  suspiciously_clean: (f, card) => ({
    mild: `${cap(card.details.join(', '))}. Nothing to roast, which is suspicious.`,
    medium: `${cap(card.details.join(', '))}. A spotless record, which is how they all look before the investigation.`,
    savage: `${cap(card.details.join(', '))}. No body, no motive, no case. For now.`,
  }),
  top_repo: (f) => {
    const t = f.topRepos[0];
    return {
      mild: `Best-known work: ${t.name}, ${t.stars} stars.`,
      medium: `${t.name}, ${t.stars} stars. Everything else on the profile orbits it in silence.`,
      savage: `Peak achievement: ${t.name} at ${t.stars} stars. The rest of the profile is the director's cut nobody asked for.`,
    };
  },
  recent_focus: (f) => {
    const r = f.mostActiveRecentRepo;
    return {
      mild: `${r.events} of the ${f.recentEvents} recent public events are on ${r.repo}. Focused.`,
      medium: `${r.events} of ${f.recentEvents} recent events orbit ${r.repo}. Every road leads back to the same repo.`,
      savage: `${r.events} of the last ${f.recentEvents} events happened at ${r.repo}. Returning to the scene, as they do.`,
    };
  },
  language_habit: (f) => {
    const l = f.topLanguages[0];
    return {
      mild: `${l.name} in ${s(l.count, 'repo')}. A favorite.`,
      medium: `Found ${l.name}, moved in, ${s(l.count, 'repo')} later never left.`,
      savage: `${s(l.count, 'repo')} of ${l.name}. Habits form; this one set like concrete.`,
    };
  },
  account_age: (f) => ({
    mild: `Account opened ${f.createdAt}: ${s(f.publicRepos, 'public repo')} since.`,
    medium: `${s(f.publicRepos, 'public repo')} in ${humanDays(f.ageDays)} since ${f.createdAt}. The autopsy is overdue.`,
    savage: `Opened ${f.createdAt}, ${humanDays(f.ageDays)} ago, ${s(f.publicRepos, 'public repo')}. Time of death unclear; the body is still typing.`,
  }),
};

function cap(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const ORDER = { mild: ['mild', 'medium', 'savage'], medium: ['medium', 'savage', 'mild'], savage: ['savage', 'medium', 'mild'] };

/**
 * Builds 3-5 jokes from the cards, best cards first. Each joke passes the automatic checks
 * and no two share an opening pattern.
 * @returns [{ text, cards: [id] }]
 */
function offlineJokes(result, cards, { intensity = 'medium', max = 5, exclude = [] } = {}) {
  const templates = result.kind === 'repo' ? REPO : PROFILE;
  const allowed = allowedNumbersFor(result, cards);
  const used = new Set(exclude.map((j) => openingPattern(j.text)));
  const jokes = [];
  for (const card of cards) {
    if (jokes.length >= max) break;
    const make = templates[card.angle];
    if (!make) continue;
    let variants;
    try {
      variants = make(result.facts, card);
    } catch {
      continue; // a template that can't be filled for this data is skipped, never guessed
    }
    for (const level of ORDER[intensity] || ORDER.medium) {
      const joke = { text: variants[level], cards: [card.id] };
      const pattern = openingPattern(joke.text);
      if (used.has(pattern)) continue;
      if (checkJoke(joke, cards, allowed).length) continue;
      used.add(pattern);
      jokes.push(joke);
      break;
    }
  }
  return jokes;
}

module.exports = { offlineJokes, REPO_TEMPLATES: REPO, PROFILE_TEMPLATES: PROFILE };
