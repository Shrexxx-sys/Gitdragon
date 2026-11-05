# Git Autopsy: comedy report

Generated 2026-11-05T09:31:55.273Z · models: `gemini:gemini-3.6-flash` vs `gemini:gemini-3.5-flash-lite` · calibration: **PLACEHOLDER examples** (replace them in calibration.md)

Each target lists its **evidence cards** (facts measured by code, ranked by how roastable they are), then the jokes each model kept. The `[C1]` tags show which card a joke is built on. "Checks" = the automatic checks (evidence reference, specific detail, banned phrases, LIMIT topics, invented numbers, length, unique openings).

## 1. Repo: [torvalds/linux](https://github.com/torvalds/linux), huge, very active · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | todo_pile | 50 | GitHub code search finds 472 TODO/FIXME matches. ([source](https://github.com/search?q=repo%3Atorvalds%2Flinux+TODO+OR+FIXME&type=code)) |
| C2 | latest_message | 18 | The most recent commit message, on 2026-11-03, is "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux". ([source](https://api.github.com/repos/torvalds/linux/commits?per_page=100)) |
| C3 | cadence | 14 | The typical gap between commits is 0 days, across 1505332 commits. ([source](https://api.github.com/repos/torvalds/linux/commits?per_page=100)) |
| C4 | language_mix | 12 | C is 98% of the code, Assembly 1%. ([source](https://api.github.com/repos/torvalds/linux/languages)) |
| C5 | stars_and_age | 11 | 254436 stars and 67100 forks since 2011-09-04. ([source](https://api.github.com/repos/torvalds/linux)) |
| C6 | largest_file | 10 | The largest file is MAINTAINERS (933 KB) out of 19031 files. ([source](https://api.github.com/repos/torvalds/linux/git/trees/master?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.8s · checks: PASS

1. 472 TODO/FIXME comments. The backlog lives in the code now. `[C1]`
2. Latest word from the repo, dated 2026-11-03: "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux". Noted for the record. `[C2]`
3. 1505332 commits, typically several a day. Steady as a dripping tap. `[C3]`
4. C is 98% of the code. No identity crisis here. `[C4]`
5. Since 2011-09-04: 254436 stars, 67100 forks. The market has spoken, softly. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 60.3s · checks: PASS

1. GitHub code search finds 472 TODO/FIXME matches, serving as a very detailed blueprint for everything we will never finish. `[C1]`
2. The most recent commit message, on 2026-11-03, is "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux", proving that time travel looks remarkably bureaucratic. `[C2]`
3. Across 1505332 commits, the typical gap between them is 0 days, meaning the machine has not blinked in a very long time. `[C3]`
4. C is 98% of the code and Assembly 1%, creating a monument to languages older than most of its contributors. `[C4]`
5. The largest file is MAINTAINERS at 933 KB out of 19031 files, which means we spend more time managing who guards the door than building the house. `[C6]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 503: {   "error": {     "code": 503,     "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",     "status": "UNAVAILABLE"   } } </sub>

<details><summary>critic deleted 5 of 10 candidates</summary>

- 254436 stars and 67100 forks since 2011-09-04. An extremely crowded stadium where nobody is allowed to leave. → *Starts with numbers, weak punchline*
- 472 TODO/FIXME matches scattered across the premises. A graveyard of good intentions with line numbers. → *Starts with numbers*
- The most recent commit message on 2026-11-03 reads "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux". The future arrived and it brought more paperwork. → *Duplicate opening structure with candidate 2*
- With 1505332 commits and a typical gap of 0 days, momentum has officially become a permanent state of matter. → *Starts with numbers*
- Accounting for 67100 forks since 2011-09-04, this project has been copied more times than high school algebra homework. → *Starts with numbers and uses a cliché comparison*

</details>

## 2. Repo: [expressjs/express](https://github.com/expressjs/express), active, healthy · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | bots_run_it | 55 | 39 of the last 100 commits were made by bots. ([source](https://api.github.com/repos/expressjs/express/commits?per_page=100)) |
| C2 | issue_pile | 47 | 261 open issues and pull requests. ([source](https://api.github.com/repos/expressjs/express)) |
| C3 | latest_message | 18 | The most recent commit message, on 2026-11-02, is "deps: body-parser@^2.4.0 (#7563)". ([source](https://api.github.com/repos/expressjs/express/commits?per_page=100)) |
| C4 | cadence | 14 | The typical gap between commits is 0 days, across 6186 commits. ([source](https://api.github.com/repos/expressjs/express/commits?per_page=100)) |
| C5 | language_mix | 12 | JavaScript is 100% of the code. ([source](https://api.github.com/repos/expressjs/express/languages)) |
| C6 | stars_and_age | 11 | 69579 stars and 25368 forks since 2009-06-26. ([source](https://api.github.com/repos/expressjs/express)) |
| C7 | largest_file | 10 | The largest file is History.md (119 KB) out of 216 files. ([source](https://api.github.com/repos/expressjs/express/git/trees/master?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: gemini (gemini-3.6-flash), 2-pass · 0.0s · checks: PASS

1. 39 of the last 100 commits were authored by bots. Automated scripts are quietly inheriting a house where the maintainers used to live. `[C1]`
2. JavaScript makes up 100% of the code. There are zero secondary languages to take the blame when it breaks at runtime. `[C5]`
3. Garnering 69579 stars and 25368 forks since 2009-06-26 proves tens of thousands copied the codebase, but almost nobody stayed to clean it up. `[C6]`
4. Out of 216 files, History.md is the largest single file at 119 KB. The paper trail is literally heavier than the underlying machinery. `[C7]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- A backlog of 261 open issues and pull requests sits patiently, like a quiet waiting room where no patient ever gets called. → *generic metaphor that lacks dark death-certificate precision compared to others*
- The most recent commit message on 2026-11-02 reads "deps: body-parser@^2.4.0 (#7563)". Routine maintenance is being performed with autopsy-level precision. → *explains the joke and lacks a punchy conclusion*
- A typical gap of 0 days between revisions across 6186 commits implies a system that never sleeps, only overheats. → *repetitive concept with candidate 10*
- Bots generated 39 of the last 100 commits, quietly maintaining a skeleton crew long after the human maintainers stepped back. → *duplicate angle of candidate 1*
- Carrying 261 open issues despite 69579 stars shows a massive stadium watching a ticket queue that never moves. → *weaker overlap of issue backlog and star count themes*
- Across 6186 commits, the typical gap between updates remains 0 days, keeping the repository in a state of perpetual twitching. → *duplicate angle of candidate 4*

</details>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. Since 2009-06-26, 69579 stars and 25368 forks have gathered to watch a framework slowly fossilize. `[C6]`
2. Out of 216 files, the largest is History.md at 119 KB, documenting every mistake since the dawn of time. `[C7]`
3. 39 of the last 100 commits were made by bots keeping the corpse upright for the public. `[C1]`
4. Currently sitting on 261 open issues and pull requests, waiting for a savior who is never arriving. `[C2]`
5. The most recent commit on 2026-11-02 reads "deps: body-parser@^2.4.0 (#7563)", rearranging deck chairs on the Titanic. `[C3]`

<details><summary>critic deleted 5 of 10 candidates</summary>

- A pristine 100% JavaScript diet powers the entire operation, which is its own form of dietary restriction. → *cliché expression about dietary restriction*
- Across 6186 commits, the typical gap between updates is 0 days of continuous mechanical breathing. → *repeats gap between commits theme*
- Among the 216 files, History.md weighs in at 119 KB, proving people write more about their past than their future. → *repeats History.md card and structure*
- A relentless 6186 total commits with a 0 day average gap means the treadmill never stops spinning. → *repeats commit cadence card*
- JavaScript accounts for 100% of the codebase, ensuring maximum runtime surprises for everyone involved. → *repeats 100 percent JavaScript angle*

</details>

## 3. Repo: [mojombo/grit](https://github.com/mojombo/grit), dead, archived · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2014-02-03 (12 years 9 months ago). The final commit message was "Merge pull request #183 from bkeepers/unmaintained". ([source](https://api.github.com/repos/mojombo/grit/commits)) |
| C2 | long_gap | 48 | Once went 338 days without a commit (2013-02-23 to 2014-01-28). ([source](https://api.github.com/repos/mojombo/grit/commits?per_page=100)) |
| C3 | latest_message | 18 | The most recent commit message, on 2014-02-03, is "Merge pull request #183 from bkeepers/unmaintained". ([source](https://api.github.com/repos/mojombo/grit/commits?per_page=100)) |
| C4 | cadence | 14 | The typical gap between commits is 0 days, across 516 commits. ([source](https://api.github.com/repos/mojombo/grit/commits?per_page=100)) |
| C5 | language_mix | 12 | Ruby is 100% of the code. ([source](https://api.github.com/repos/mojombo/grit/languages)) |
| C6 | stars_and_age | 11 | 2046 stars and 508 forks since 2007-10-29. ([source](https://api.github.com/repos/mojombo/grit)) |
| C7 | largest_file | 10 | The largest file is test/dot_git_iv2/objects/pack/pack-4eb8bbafbe65e4f3841581537735fc5d448759c5.pack (488 KB) out of 1423 files. ([source](https://api.github.com/repos/mojombo/grit/git/trees/master?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: gemini (gemini-3.6-flash), 2-pass · 0.0s · checks: PASS

1. The repository died on 2014-02-03 with the commit message "Merge pull request #183 from bkeepers/unmaintained". It didn't just crash; it officially filed its own death certificate. `[C1]`
2. Between 2013-02-23 and 2014-01-28, this repo went 338 days without a single commit. It woke from a year-long coma just long enough to opt for hospice care. `[C2]`
3. Accumulating 2046 stars and 508 forks since 2007-10-29 just means over five hundred developers cloned a digital mausoleum. `[C6]`
4. Out of 1423 files, the largest is test/dot_git_iv2/objects/pack/pack-4eb8bbafbe65e4f3841581537735fc5d448759c5.pack. It looks less like source code and more like a corruption dump. `[C7]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- A 338-day pause split this codebase in half. The developers didn't just take a break; they let the code decompose for nearly a full year before coming back to bury it. → *Redundant with Candidate 8, which delivers the long gap roast more effectively.*
- "Merge pull request #183 from bkeepers/unmaintained" was the final act on 2014-02-03. Merging a pull request just to mark your project dead is peak dark humor. → *Redundant with Candidate 1, using the same final commit message.*
- Across 516 commits, the project ran hot until it hit a sudden, total wall. That high burn rate was bound to leave a crater. → *Generic metaphor without a strong punchline.*
- Composed of 100% Ruby, this codebase is a pure relic of a bygone era. Zero other languages were allowed in to dilute the abandonware. → *Generic commentary about Ruby with no real twist.*
- Collecting 2046 stars on a repo that stopped breathing years ago is impressive. It is the digital equivalent of putting fresh flowers on an unmaintained grave. → *Redundant with Candidate 6 on the stars angle.*
- Untouched for 12 years 9 months, this repository isn't just inactive; it's practically fossilized beneath layers of forgotten git history. → *Uses cliché imagery ('fossilized beneath layers').*

</details>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. Last commit on 2014-02-03 read "Merge pull request #183 from bkeepers/unmaintained". Even the PR title knew it was writing its own obituary. `[C1]`
2. Once went 338 days without a commit between 2013-02-23 and 2014-01-28. A silent period long enough for the repository to lose its pulse entirely. `[C2]`
3. Accumulated 508 forks and 2046 stars since 2007-10-29. A crowded museum exhibit for code nobody touches anymore. `[C6]`
4. The largest file is test/dot_git_iv2/objects/pack/pack-4eb8bbafbe65e4f3841581537735fc5d448759c5.pack at 488 KB among 1423 files. Packed tight like a coffin for git objects. `[C7]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- The most recent commit message, on 2014-02-03, was "Merge pull request #183 from bkeepers/unmaintained". History ended on an administrative confession. → *Duplicates structure/angle of candidate 1 regarding the final commit message.*
- Across 516 commits, the typical gap between updates was 0 days. Then it stopped moving altogether for over a decade. → *Combines cards loosely without a sharp punchline.*
- Ruby makes up 100% of the code. A monlanguage display of vintage syntax preserved in amber. → *Slightly generic observation about Ruby.*
- The 2014-02-03 pull request merged "bkeepers/unmaintained". Truth in advertising arrived right before the eternal silence. → *Too similar to candidate 1.*
- A 338-day drought from 2013-02-23 to 2014-01-28 preceded its final breath. Organ failure rarely gives that much advance warning. → *Too similar to candidate 2.*
- Out of 1423 files, test/dot_git_iv2/objects/pack/pack-4eb8bbafbe65e4f3841581537735fc5d448759c5.pack takes the crown. A heavy artifact left behind by archaeologists of an older Ruby era. → *Too similar to candidate 7.*

</details>

## 4. Repo: [octocat/Spoon-Knife](https://github.com/octocat/Spoon-Knife), tiny, famous · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2014-02-12 (12 years 8 months ago). The final commit message was "Pointing to the guide for forking". ([source](https://api.github.com/repos/octocat/Spoon-Knife/commits)) |
| C2 | issue_pile | 55 | 21626 open issues and pull requests. ([source](https://api.github.com/repos/octocat/Spoon-Knife)) |
| C3 | latest_message | 18 | The most recent commit message, on 2014-02-12, is "Pointing to the guide for forking". ([source](https://api.github.com/repos/octocat/Spoon-Knife/commits?per_page=100)) |
| C4 | language_mix | 12 | HTML is 58% of the code, CSS 42%. ([source](https://api.github.com/repos/octocat/Spoon-Knife/languages)) |
| C5 | stars_and_age | 11 | 14171 stars and 160946 forks since 2011-01-27. ([source](https://api.github.com/repos/octocat/Spoon-Knife)) |
| C6 | largest_file | 10 | The largest file is README.md (1 KB) out of 3 files. ([source](https://api.github.com/repos/octocat/Spoon-Knife/git/trees/main?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 68.8s · checks: PASS

1. Last seen 2014-02-12, saying "Pointing to the guide for forking". It has not spoken in 12 years 8 months. `[C1]`
2. 21626 open issues and PRs. The inbox has an inbox. `[C2]`
3. Latest word from the repo, dated 2014-02-12: "Pointing to the guide for forking". Gripping. `[C3]`
4. HTML is 58% of the code. Commitment, at least. `[C4]`
5. Since 2011-01-27: 14171 stars, 160946 forks. The market has spoken, softly. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 4.7s · checks: PASS

1. Last modified on 2014-02-12 with the message "Pointing to the guide for forking". The patient has successfully pointed everyone away from the room for 12 years 8 months. `[C1]`
2. Accumulated 21626 open issues and pull requests. A waiting room where no one is ever called and the receptionist left a decade ago. `[C2]`
3. Composed of 58% HTML and the rest CSS. A house built entirely of wallpaper and floor plans. `[C4]`
4. Consists of 3 files, with the largest being README.md at 1 KB. A massive library containing a single laminated bookmark. `[C6]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- The final transmission on 2014-02-12 stated "Pointing to the guide for forking". An eternal directional sign for a destination that no longer exists. → *similar angle to candidate 1 and 9*
- Accumulated 160946 forks alongside 14171 stars since 2011-01-27. A historic landmark that everyone visited once and never returned to. → *auto-check problem: same opening pattern as candidate 2*
- Frozen in time on 2014-02-12 with "Pointing to the guide for forking" as its last words. A mapmaker who got lost looking at the legend. → *repetitive angle on 2014-02-12 message*
- Surrounded by 21626 open issues and pull requests. A lost property office that swallowed the entire lost property department. → *repetitive angle on open issues*
- Recorded its final update on 2014-02-12 via "Pointing to the guide for forking". The last person to leave remembered to turn off the sign. → *repetitive angle on the 2014-02-12 commit*
- Maintains a balance of 58% HTML while remaining entirely static. A storefront mannequin that never learned to walk. → *weaker alternative for the HTML card*

</details>

## 5. Repo: [octocat/Hello-World](https://github.com/octocat/Hello-World), abandoned since 2012 · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2012-03-06 (14 years 8 months ago). The final commit message was "Merge pull request #6 from Spaceghost/patch-1". ([source](https://api.github.com/repos/octocat/Hello-World/commits)) |
| C2 | readme_only_title | 75 | The README (2 words) only repeats the project name: "Hello World!". ([source](https://api.github.com/repos/octocat/Hello-World/readme)) |
| C3 | placeholder_name | 66 | The repository is literally named "Hello-World". ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C4 | issue_pile | 54 | 7524 open issues and pull requests. ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C5 | long_gap | 46 | Once went 230 days without a commit (2011-01-26 to 2011-09-14). ([source](https://api.github.com/repos/octocat/Hello-World/commits?per_page=100)) |
| C6 | latest_message | 18 | The most recent commit message, on 2012-03-06, is "Merge pull request #6 from Spaceghost/patch-1". ([source](https://api.github.com/repos/octocat/Hello-World/commits?per_page=100)) |
| C7 | stars_and_age | 11 | 3900 stars and 7386 forks since 2011-01-26. ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C8 | largest_file | 10 | The largest file is README (0 KB) out of 1 files. ([source](https://api.github.com/repos/octocat/Hello-World/git/trees/master?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 67.5s · checks: PASS

1. Time of death 2012-03-06, last words "Merge pull request #6 from Spaceghost/patch-1". Nobody has claimed the body in 14 years 8 months. `[C1]`
2. A 2-word README that just repeats the title. A tombstone with only the name filled in. `[C2]`
3. "Hello-World": a name picked by someone who planned to delete it the same afternoon. `[C3]`
4. 7524 open issues and pull requests. Each one a small grave nobody tends. `[C4]`
5. Between 2011-01-26 and 2011-09-14: 230 days of nothing. Long enough for the dependencies to rot on their own. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 4.0s · checks: PASS

1. Named simply "Hello-World", it greets nobody and answers to nothing. `[C3]`
2. Precisely 7524 open issues and pull requests howl into the void. `[C4]`
3. It once flatlined for 230 days straight between 2011-01-26 and 2011-09-14 before deciding to keep breathing briefly. `[C5]`
4. Out of 1 files total, the crowning achievement is a README weighing 0 KB. `[C8]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- Last commit arrived on 2012-03-06 with the message "Merge pull request #6 from Spaceghost/patch-1". Spaceghost has since moved on, but the corpse remains. → *similar structure to candidate 6*
- The README contains exactly 2 words, declaring "Hello World!". A very concise epitaph for an empty room. → *cliché ending*
- On 2012-03-06, the final breath was recorded as "Merge pull request #6 from Spaceghost/patch-1". → *similar structure to candidate 1*
- A staggering 7386 forks have been spawned from this repository since 2011-01-26. Clone inheritance at its most desperate. → *generic phrasing about cloning*
- Spaceghost contributed via "Merge pull request #6 from Spaceghost/patch-1" back on 2012-03-06. The ghost outlived the project. → *repeats details from candidate 1*
- Consisting of 1 total files, the entire legacy rests on a README. → *repeats card 8 focus*

</details>

## 6. Repo: [diamante-io/test](https://github.com/diamante-io/test), empty, placeholder name · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | empty_repo | 95 | diamante-io/test has 0 commits. It was created on 2024-01-25 and nothing was ever pushed. ([source](https://api.github.com/repos/diamante-io/test/commits)) |
| C2 | empty_wait | 70 | 2 years 9 months have passed since 2024-01-25 without a single push. ([source](https://api.github.com/repos/diamante-io/test)) |
| C3 | placeholder_name | 66 | The repository is literally named "test". ([source](https://api.github.com/repos/diamante-io/test)) |
| C4 | stars_and_age | 11 | 186 stars and 0 forks since 2024-01-25. ([source](https://api.github.com/repos/diamante-io/test)) |

**gemini:gemini-3.6-flash** · written by: gemini (gemini-3.6-flash), 2-pass · 0.0s · checks: PASS

1. Created on 2024-01-25 with 0 commits to its name. The repo didn't fail a test; it refused to take it. `[C1]`
2. It has been 2 years 9 months since 2024-01-25 without a single push. The patient went under for a quick checkup and never woke up. `[C2]`
3. 186 stars gathered since 2024-01-25, yet 0 forks exist. A crowd of 186 people gathered around an empty room to admire the floor. `[C4]`
4. Naming a repository "test" and leaving it with 0 commits is bold. The hypothesis was formed, tested, and found completely empty. `[C1, C3]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- A repository named "test" sitting at 0 commits since 2024-01-25. It stands as a monument to a promise immediately abandoned. → *Redundant with kept jokes covering the same zero-commit and placeholder name facts.*
- 2 years 9 months of total silence since creation. At this point, the lack of code is the most stable feature on GitHub. → *Weaker variation of candidate 3's time-since-creation angle.*
- 186 stars awarded to a project with 0 commits since 2024-01-25. Proof that people will applaud literally nothing if you format it right. → *Repeats the same opening pattern as candidate 4.*
- Calling a repo "test" and waiting 2 years 9 months to push anything. The results of the experiment are officially in: nothing happened. → *Weaker punchline compared to candidate 5.*
- 0 forks and 186 stars since 2024-01-25. It turns out 186 spectators showed up to watch a ghost town stay uninhabited. → *Duplicate concept and stats setup as candidate 4.*
- 0 commits added over 2 years 9 months since 2024-01-25. The cause of death was pre-existing non-existence. → *Less effective punchline than candidate 3.*

</details>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 19.1s · checks: PASS

1. Diamante-io/test was born on 2024-01-25 with 0 commits and has remained a pristine digital parking spot ever since. `[C1]`
2. 186 stars and 0 forks since 2024-01-25 proves people will bookmark an empty room if you give it a plaque. `[C4]`
3. The repository is literally named "test" yet contains nothing to examine. `[C3]`
4. 2 years 9 months of absolute silence since 2024-01-25 have turned this directory into a digital tombstone. `[C2]`

<details><summary>critic deleted 7 of 10 candidates</summary>

- 2 years 9 months have ticked past since 2024-01-25 on a repository holding precisely zero bytes of effort. → *duplicate structure with candidate 6 and 10*
- Nothing was ever pushed to diamante-io/test after its creation on 2024-01-25, making it the most honest monument on GitHub. → *similar angle to candidate 1*
- 2 years 9 months of absolute silence since 2024-01-25 have turned this directory into a digital tombstone. → *auto-check: same opening pattern as candidate 2*
- Calling this "test" is deeply ironic since no experiment has ever taken place. → *similar angle to candidate 3*
- 186 stargazers have been waiting since 2024-01-25 for 0 commits to finally drop. → *weaker punchline compared to candidate 4*
- Created on 2024-01-25 with 0 commits, this project achieved peak minimalism before writing a single line. → *similar angle to candidate 1*
- 2 years 9 months of inactivity since 2024-01-25 is a long time to stare at a blank wall. → *auto-check: same opening pattern as candidate 2*

</details>

## 7. Repo: [kelseyhightower/nocode](https://github.com/kelseyhightower/nocode), joke repo: no code at all · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2020-01-21 (6 years 9 months ago). The final commit message was "add style guide". ([source](https://api.github.com/repos/kelseyhightower/nocode/commits)) |
| C2 | long_gap | 58 | Once went 713 days without a commit (2018-02-07 to 2020-01-21). ([source](https://api.github.com/repos/kelseyhightower/nocode/commits?per_page=100)) |
| C3 | issue_pile | 53 | 4725 open issues and pull requests. ([source](https://api.github.com/repos/kelseyhightower/nocode)) |
| C4 | latest_message | 18 | The most recent commit message, on 2020-01-21, is "add style guide". ([source](https://api.github.com/repos/kelseyhightower/nocode/commits?per_page=100)) |
| C5 | language_mix | 12 | Dockerfile is 100% of the code. ([source](https://api.github.com/repos/kelseyhightower/nocode/languages)) |
| C6 | stars_and_age | 11 | 66000 stars and 4844 forks since 2018-02-06. ([source](https://api.github.com/repos/kelseyhightower/nocode)) |
| C7 | largest_file | 10 | The largest file is LICENSE (11 KB) out of 5 files. ([source](https://api.github.com/repos/kelseyhightower/nocode/git/trees/master?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: gemini (gemini-3.6-flash), 2-pass · 0.0s · checks: PASS

1. The final commit on 2020-01-21 was titled "add style guide". The project then immediately styled itself out of existence. `[C1]`
2. A Dockerfile makes up 100% of the code here. It is a neatly built container containing absolutely nothing. `[C5]`
3. Out of 5 total files, LICENSE is the largest at 11 KB. The legal terms outnumber the actual implementation. `[C7]`
4. Gathering 4844 forks while accumulating 4725 open issues proves that duplicating nothing scales remarkably well. `[C3, C6]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- A 713-day gap between commits suggests this codebase wasn't just resting; it was in deep hibernation. → *uses cliché formulation ('deep hibernation')*
- With 4725 open issues and pull requests, the repository has built a thriving community of people waiting in line. → *redundant issue count punchline, covered better by candidate 8*
- Amassing 66000 stars since 2018-02-06 is impressive for a project where doing nothing is the primary feature. → *generic joke setup about doing nothing*
- Leaving "add style guide" as the last commit message on 2020-01-21 shows great discipline in framing empty space. → *repeats opening structure and commit facts from candidate 1*
- After going 713 days without an update, the repo declared peace on 2020-01-21 and never looked back. → *redundant with candidate 1*
- Five files in total, with Dockerfile making up 100% of the code. The build environment is ready for software that will never arrive. → *redundant mix of files covered by candidates 4 and 6*

</details>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. Last commit on 2020-01-21 brought an "add style guide" entry. Standards were finalized right before total silence. `[C1]`
2. For 713 days between 2018-02-07 and 2020-01-21, nothing happened. Time well spent. `[C2]`
3. The Dockerfile makes up 100% of the code. A very heavy envelope to mail nothing in. `[C5]`
4. Among 5 files, LICENSE weighs 11 KB. The rules outweigh the product by infinity. `[C7]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- A silence of 713 days ended on 2020-01-21 with a punctuation mark. Rest in peace. → *repeats structure or opening words / generic elements*
- With 4725 open issues and pull requests, nobody knows what they are waiting for. → *generic opening*
- Since 2018-02-06, 66000 stars gathered. A very crowded room for zero contents. → *similar angle to 6*
- Five total files including LICENSE at 11 KB. A minimalist masterpiece of empty folders. → *similar angle to 9*
- The last recorded action on 2020-01-21 was "add style guide". Essential rules for a blank page. → *duplicates quote and date from candidate 1*
- A total of 4844 forks exist. People copied nothing and made it their own. → *generic phrasing*

</details>

## 8. Repo: [sindresorhus/awesome](https://github.com/sindresorhus/awesome), giant README list · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | issue_pile | 45 | 103 open issues and pull requests. ([source](https://api.github.com/repos/sindresorhus/awesome)) |
| C2 | no_tests | 35 | 23 files and not one of them is a test. ([source](https://api.github.com/repos/sindresorhus/awesome/git/trees/main?recursive=1)) |
| C3 | latest_message | 18 | The most recent commit message, on 2026-09-02, is "Meta tweaks". ([source](https://api.github.com/repos/sindresorhus/awesome/commits?per_page=100)) |
| C4 | cadence | 14 | The typical gap between commits is 3 days, across 1209 commits. ([source](https://api.github.com/repos/sindresorhus/awesome/commits?per_page=100)) |
| C5 | stars_and_age | 11 | 531312 stars and 38084 forks since 2014-07-11. ([source](https://api.github.com/repos/sindresorhus/awesome)) |
| C6 | largest_file | 10 | The largest file is media/logo.ai (80 KB) out of 23 files. ([source](https://api.github.com/repos/sindresorhus/awesome/git/trees/main?recursive=1)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.5s · checks: PASS

1. 103 open issues and pull requests. The waiting room has its own waiting room. `[C1]`
2. Not one test among 23 files. Every deploy is a coin flip with extra steps. `[C2]`
3. Most recent testimony, 2026-09-02: "Meta tweaks". The witness may step down. `[C3]`
4. Typical pace: one every 3 days, kept up for 1209 commits. Consistency is a virtue, and also a symptom. `[C4]`
5. 531312 stars and 38084 forks since 2014-07-11. The audience is exactly the size it deserves. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 45.0s · checks: PASS

1. Since 2014-07-11, 531312 stars and 38084 forks have gathered to stare at a giant bookmark folder. `[C5]`
2. Across 1209 commits, the updates arrive like clockwork every 3 days to maintain a massive hyperlink directory. `[C4]`
3. Out of 23 total files, the largest is media/logo.ai at 80 KB. The vector art weighs more than the logic. `[C2, C6]`
4. The most recent commit on 2026-09-02 settled for the vague epitaph "Meta tweaks". Even time travel cannot fix the index. `[C3]`

<details><summary>critic deleted 8 of 10 candidates</summary>

- 531312 stars and 38084 forks have gathered here since 2014-07-11 to read a curated list. A library with half a million readers and zero bookshelves. → *Repeats the star and date facts in a slightly more dramatic phrasing.*
- Across 1209 commits, the interval between updates averages 3 days. A steady heartbeat keeping a patient on life support indefinitely. → *Uses the life support cliché.*
- A collection of 23 files and precisely zero tests. A monument built entirely out of hyperlinks and blind trust. → *Starts with 'A', too close to other candidates' structures.*
- With 103 open issues and pull requests, the waiting room is overflowing. Nobody is calling numbers. → *Too short and standard issue-count joke.*
- Tracking 1209 commits over time with a steady 3 day cadence. The metronome keeps ticking for a room full of links. → *Redundant with candidate 2 regarding cadence and commits.*
- Of the 23 total files, media/logo.ai takes the crown at 80 KB. The most vital component is an illustrator file nobody can edit. → *Repeats the file size and count facts covered better by candidate 4.*
- A staggering 531312 stars illuminate a directory that has survived since 2014-07-11. The universe's most popular bookmark folder. → *Redundant with candidate 1 on stars and dates.*
- Currently holding 103 open issues and pull requests. A suggestion box that nobody empties. → *Redundant with candidate 6 on open issues.*

</details>

## 9. Profile: [sindresorhus](https://github.com/sindresorhus), huge (1000+ repos) · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 84 original repos in 2015. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C2 | star_giant | 40 | 229555 total stars; type-fest alone has 17494. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C3 | one_language | 36 | 265 of 295 original repos are JavaScript. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C4 | recent_focus | 14 | 22 of the 100 recent public events are on sindresorhus/type-fest. ([source](https://api.github.com/users/sindresorhus/events/public)) |
| C5 | language_habit | 12 | JavaScript in 265 original repos. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C6 | account_age | 10 | Account created on 2009-12-20 (16 years 10 months ago), 1148 public repos. ([source](https://api.github.com/users/sindresorhus)) |

**gemini:gemini-3.6-flash** · written by: gemini (gemini-3.6-flash), 2-pass · 67.3s · checks: PASS

1. Created 84 original repos in 2015 alone. That wasn't a productive year of open source development; it was a digital mass casualty event. `[C1]`
2. Amassing 229555 total stars across GitHub just means thousands of developers are outsourcing their single-line utility functions to one account. `[C2]`
3. 265 of 295 original repos are written in JavaScript. Most people try a second language after the first hundred utility modules, but commitment is commitment. `[C3]`
4. With 1148 public repos since 2009-12-20, the profile reads less like a developer portfolio and more like an unmanaged digital landfill. `[C6]`
5. Having 17494 stars on type-fest alone proves that thousands of programmers would rather import a package than write complex type syntax. `[C2]`

<sub>warnings: pass 2 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 2 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. 84 original repos birthed in 2015 alone. A factory that manufactured its own graveyard in a single year. `[C1]`
2. 229555 total stars across the board, with type-fest pulling in 17494. A glittering monument built entirely out of type definitions. `[C2]`
3. 265 of 295 original repos lean on JavaScript. A monoculture so absolute it makes biology look indecisive. `[C3]`
4. Account created on 2009-12-20, housing 1148 public repos. A digital landfill older than most active contributors. `[C6]`
5. sindresorhus/type-fest accounts for 22 out of 100 recent public events. Recursive nesting until reality loses its types. `[C4]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- 22 of the 100 recent public events anchor directly to sindresorhus/type-fest. A hamster wheel with industrial metrics. → *Duplicates structure of candidate 3 (starts with number and preposition)*
- Account created on 2009-12-20, housing 1148 public repos. A digital landfill older than most active contributors. → *Redundant with candidate 8, keeping candidate 8 as alternative*
- JavaScript holds dominion across 265 original repos. A single-string instrument played until the catgut snaps. → *Too similar to candidate 3 (both cover 265 original repos in JavaScript)*
- 17494 stars just for type-fest inside a 229555 total constellation. People will worship any deity that handles their types. → *Redundant with candidate 2 which uses the same stats*
- 1148 public repos built since 2009-12-20. A monumental hoarding operation validated by strangers. → *Redundant with candidate 5 (account age and repo count)*
- 2015 saw the arrival of 84 original repos. An incubator that abandoned every single newborn on the doorstep. → *Similar theme to candidate 1*

</details>

## 10. Profile: [torvalds](https://github.com/torvalds), active, few repos · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | long_silence | 45 | A 1955-day stretch with no visible activity (2011-09-04 to 2017-01-11). ([source](https://api.github.com/users/torvalds/repos)) |
| C2 | star_giant | 40 | 266689 total stars; linux alone has 254436. ([source](https://api.github.com/users/torvalds/repos)) |
| C3 | one_language | 36 | 8 of 9 original repos are C. ([source](https://api.github.com/users/torvalds/repos)) |
| C4 | recent_focus | 14 | 94 of the 100 recent public events are on torvalds/linux. ([source](https://api.github.com/users/torvalds/events/public)) |
| C5 | language_habit | 12 | C in 8 original repos. ([source](https://api.github.com/users/torvalds/repos)) |
| C6 | account_age | 10 | Account created on 2011-09-03 (15 years 2 months ago), 12 public repos. ([source](https://api.github.com/users/torvalds)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 68.5s · checks: PASS

1. 1955 quiet days between 2011-09-04 and 2017-01-11. The keyboard got a long rest. `[C1]`
2. 266689 total stars, 254436 of them on linux. The rest of the repos ride for free. `[C2]`
3. 8 of 9 original repos in C. Loyal. `[C3]`
4. C in 8 repos. A favorite. `[C5]`
5. Account opened 2011-09-03: 12 public repos since. `[C6]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. A 1955-day stretch with zero visible commits between 2011-09-04 and 2017-01-11. The repository went on a very long sabbatical. `[C1]`
2. linux holds 254436 out of 266689 total stars. The applause is deafening in one specific corner. `[C2]`
3. C used exclusively across 8 of 9 original repos. A very disciplined adherence to a single alphabet. `[C3]`
4. torvalds/linux absorbs 94 of the 100 recent public events. All roads lead to the same kernel. `[C4]`
5. The account created on 2011-09-03 holds 12 public repos after 15 years 2 months. Patience is built into the architecture. `[C6]`

<details><summary>critic deleted 5 of 10 candidates</summary>

- C found in 8 original repos. A simple toolkit for complex silence. → *Repeats the same underlying data and language focus as candidate 3.*
- linux holds 254436 out of 266689 total stars. The applause is deafening in one specific corner. → *Too similar in structure and opening subject to candidate 2.*
- Between 2011-09-04 and 2017-01-11, exactly 1955 days passed without a footprint. Time off was taken very seriously. → *Repeats the exact 1955-day date range angle covered in candidate 1.*
- Across 12 public repos since 2011-09-03, spanning 15 years 2 months of existence. A slow burn in version control. → *Repeats the account creation and repo count details from candidate 5.*
- torvalds/linux absorbs 94 of the 100 recent public events. All roads lead to the same kernel. → *Repeats the 94 out of 100 recent public events angle from candidate 4.*

</details>

## 11. Profile: [pjhyett](https://github.com/pjhyett), dead since 2018 · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | gone_quiet | 85 | Last public activity on 2018-08-30 (8 years 2 months ago). ([source](https://api.github.com/users/pjhyett/repos)) |
| C2 | missing_readmes | 48 | 4 of the 6 most recently pushed original repos have no README: "ThoughtStream", "blackjax", "errcount", "vjot". ([source](https://api.github.com/repos/{owner}/{repo}/readme)) |
| C3 | long_silence | 45 | A 1952-day stretch with no visible activity (2013-04-25 to 2018-08-30). ([source](https://api.github.com/users/pjhyett/repos)) |
| C4 | top_repo | 16 | The most-starred original repo is auto_migrations with 145 stars: "Rails plugin for automating migrations". ([source](https://api.github.com/users/pjhyett/repos)) |
| C5 | language_habit | 12 | Ruby in 5 original repos. ([source](https://api.github.com/users/pjhyett/repos)) |
| C6 | account_age | 10 | Account created on 2008-01-07 (18 years 10 months ago), 8 public repos. ([source](https://api.github.com/users/pjhyett)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.8s · checks: PASS

1. Nothing public since 2018-08-30. The profile is a memorial page with a follow button. `[C1]`
2. "ThoughtStream" and "blackjax" have no README. Each one opens like a door into an empty room. `[C2]`
3. From 2013-04-25 to 2018-08-30, 1952 days of silence. The repos aged in the dark like cheese. `[C3]`
4. auto_migrations, 145 stars. Everything else on the profile orbits it in silence. `[C4]`
5. Found Ruby, moved in, 5 repos later never left. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 152.8s · checks: PASS

1. Last public activity on 2018-08-30. The coroner lists the cause of death as 8 years 2 months of pure silence. `[C1]`
2. Four repos out of the six most recent pushed, specifically ThoughtStream, blackjax, errcount, and vjot, lack a README. They expired intestate, leaving behind only raw unlabelled bones. `[C2]`
3. A 1952-day stretch of absolute stillness from 2013-04-25 to 2018-08-30. Even mummies check in more frequently. `[C3]`
4. The repo auto_migrations collected 145 stars before freezing permanently. A monument built to a Rails plugin that no one is around to maintain. `[C4]`
5. Ruby appears across 5 original repos. A botanical garden of dead gems kept in jars. `[C5]`

<sub>warnings: pass 2 attempt 1 failed: AI HTTP 503: {   "error": {     "code": 503,     "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",     "status": "UNAVAILABLE"   } }  / pass 2 attempt 2 failed: AI request failed: The operation was aborted due to timeout</sub>

## 12. Profile: [ghost](https://github.com/ghost), empty account · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | empty_profile | 95 | ghost has 0 public repositories after 18 years 6 months on GitHub (account created 2008-05-13). ([source](https://api.github.com/users/ghost)) |
| C2 | empty_audience | 72 | 13241 followers, 0 public repositories. ([source](https://api.github.com/users/ghost)) |
| C3 | empty_but_busy | 66 | 10 public events in the last ~90 days, and still 0 repositories of their own. ([source](https://api.github.com/users/ghost/events/public)) |
| C4 | long_silence | 45 | A 1386-day stretch with no visible activity (2021-08-18 to 2025-06-05). ([source](https://api.github.com/users/ghost/repos)) |
| C5 | recent_focus | 14 | 2 of the 10 recent public events are on diysnist-static/tsil-website. ([source](https://api.github.com/users/ghost/events/public)) |
| C6 | account_age | 10 | Account created on 2008-05-13 (18 years 6 months ago), 0 public repos. ([source](https://api.github.com/users/ghost)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.4s · checks: PASS

1. 0 public repos in 18 years 6 months. A ghost with a username, haunting nothing. `[C1]`
2. 0 repos, 13241 followers. A crowd gathered around a hole in the ground. `[C2]`
3. 10 events in about 90 days, 0 repos. A detective with no case file. `[C3]`
4. 1386 days without a sign of life (2021-08-18 to 2025-06-05). Search teams found only stale branches. `[C4]`
5. 2 of the last 10 events happened at diysnist-static/tsil-website. Returning to the scene, as they do. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. 18 years 6 months on GitHub and 0 public repositories. The account has achieved absolute zero with maximum seniority. `[C1]`
2. 13241 followers watching an empty void. A masterclass in building a massive audience for an invisible product. `[C2]`
3. A 1386-day stretch of total silence from 2021-08-18 to 2025-06-05. The long hibernation produced absolutely nothing. `[C4]`
4. 2 of the 10 recent public events touch diysnist-static/tsil-website. Even in motion, they are strictly browsing someone else's shelves. `[C5]`

<details><summary>critic deleted 6 of 10 candidates</summary>

- 10 public events in the last ~90 days with 0 repositories of their own. Generating administrative noise while contributing nothing to science. → *slightly generic conclusion*
- Account created on 2008-05-13 leaving 0 public repos behind. A digital archaeological dig that unearthed a whole lot of nothing. → *redundant with candidate 1*
- 13241 people staring at 0 public repositories. The ultimate hype machine for a product that never existed. → *redundant with candidate 2*
- 18 years 6 months of continuous existence since 2008-05-13 without a single codebase. A monument to prolonged procrastination. → *failed auto-check for starting pattern*
- 10 activity logs logged recently while owning 0 repositories. A masterclass in looking busy during a permanent blackout. → *redundant with candidate 3*
- Between 2021-08-18 and 2025-06-05 spans 1386 days of complete absence. The coffin was nailed shut and nobody noticed. → *violates policy against referencing a coffin or personal life*

</details>

## 13. Profile: [octocat](https://github.com/octocat), tiny, mascot · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | gone_quiet | 68 | Last public activity on 2024-08-21 (2 years 2 months ago). ([source](https://api.github.com/users/octocat/repos)) |
| C2 | placeholder_names | 64 | Repos with placeholder names: "Hello-World", "test-repo1". ([source](https://api.github.com/users/octocat/repos)) |
| C3 | missing_readmes | 48 | 2 of the 6 most recently pushed original repos have no README: "octocat.github.io", "test-repo1". ([source](https://api.github.com/repos/{owner}/{repo}/readme)) |
| C4 | long_silence | 45 | A 2127-day stretch with no visible activity (2018-05-10 to 2024-03-07). ([source](https://api.github.com/users/octocat/repos)) |
| C5 | star_giant | 40 | 21217 total stars; Spoon-Knife alone has 14171. ([source](https://api.github.com/users/octocat/repos)) |
| C6 | language_habit | 12 | HTML in 1 original repo. ([source](https://api.github.com/users/octocat/repos)) |
| C7 | account_age | 10 | Account created on 2011-01-25 (15 years 9 months ago), 8 public repos. ([source](https://api.github.com/users/octocat)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.3s · checks: PASS

1. Last public activity 2024-08-21, 2 years 2 months ago. On a long break. `[C1]`
2. Repos called "Hello-World" and "test-repo1". Naming can wait, forever. `[C2]`
3. No README in "octocat.github.io" and "test-repo1". Mystery as a feature. `[C3]`
4. 2127 quiet days between 2018-05-10 and 2024-03-07. A sabbatical. `[C4]`
5. 21217 total stars, 14171 of them on Spoon-Knife. Hard to argue with. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 0.0s · checks: PASS

1. Last public activity on 2024-08-21 left this profile sitting quietly for 2 years 2 months. `[C1]`
2. Repositories named "Hello-World" and test-repo1 make up the foundational archives. `[C2]`
3. A 2127-day stretch spanning from 2018-05-10 to 2024-03-07 recorded zero visible activity. `[C4]`
4. Spoon-Knife alone carries 14171 stars out of a total 21217 across the board. `[C5]`
5. An account created on 2011-01-25 holds 8 public repos after 15 years 9 months. `[C7]`

<details><summary>critic deleted 5 of 10 candidates</summary>

- 2 of the 6 most recently pushed original repos lack any README, including octocat.github.io. → *Duplicates structure and topics of other readme/repo jokes.*
- HTML appears in precisely 1 original repo, keeping the web markup footprint minimal. → *Mild observation lacking a strong punch or distinct angle.*
- The test-repo1 entry sits without a README among the 2 recent pushes. → *Redundant with candidate 3.*
- Starting the timeline on 2011-01-25 resulted in 8 public repos total. → *Redundant with candidate 7.*
- Out of 21217 total stars, the Spoon-Knife fork claims 14171 of them. → *Redundant with candidate 5.*

</details>

## 14. Profile: [defunkt](https://github.com/defunkt), old account, many repos · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 40 original repos in 2008. ([source](https://api.github.com/users/defunkt/repos)) |
| C2 | long_silence | 45 | A 565-day stretch with no visible activity (2025-04-09 to 2026-10-26). ([source](https://api.github.com/users/defunkt/repos)) |
| C3 | star_giant | 40 | 36992 total stars; jquery-pjax alone has 16627. ([source](https://api.github.com/users/defunkt/repos)) |
| C4 | language_habit | 12 | Ruby in 38 original repos. ([source](https://api.github.com/users/defunkt/repos)) |
| C5 | account_age | 10 | Account created on 2007-10-20 (19 years ago), 107 public repos. ([source](https://api.github.com/users/defunkt)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.7s · checks: PASS

1. 2008: 40 repos created. Starting things was the hobby; finishing them was optional. `[C1]`
2. From 2025-04-09 to 2026-10-26, 565 days of silence. Long enough to be declared missing in most places. `[C2]`
3. jquery-pjax holds 16627 of 36992 stars. The other repos are understudies who never go on. `[C3]`
4. Found Ruby, moved in, 38 repos later never left. `[C4]`
5. 107 public repos in 19 years since 2007-10-20. The autopsy is overdue. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 1.7s · checks: PASS

1. Created 40 original repos in 2008. The museum curators have already measured the glass case for them. `[C1]`
2. Ruby appears in 38 original repos. A botanical garden of syntax built entirely out of extinct bulbs. `[C4]`
3. Account created on 2007-10-20, leaving behind 107 public repos. The probate court has officially declared the directory vacant. `[C5]`
4. Accumulated 36992 total stars, with jquery-pjax pulling in 16627 of them. A monument that tall casts a very long, very cold shadow. `[C3]`
5. Endured a 565-day stretch with no visible activity from 2025-04-09 to 2026-10-26. The coroner noted the heartbeat flatlined for nearly two years. `[C2]`

<details><summary>critic deleted 5 of 10 candidates</summary>

- Logged 40 original repos back in 2008 before sealing the vault. Archaeologists are still carbon-dating the commit logs. → *touches a LIMIT topic*
- Wrote Ruby across 38 original repos. The compiler has long since filed for abandonment. → *repeats structure or opening words*
- Registered on 2007-10-20 with 107 public repos in tow. Even the dust has settled into organized subdirectories. → *repeats structure or opening words*
- Gathered 36992 total stars, including 16627 on jquery-pjax alone. A chandelier that bright hanging over an empty room. → *repeats structure or opening words*
- Stuck in a 565-day silence ending on 2026-10-26 after starting on 2025-04-09. The coroner listed the official cause of death as natural attrition. → *repeats structure or opening words*

</details>

## 15. Profile: [github](https://github.com/github), organization · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 41 original repos in 2022. ([source](https://api.github.com/orgs/github/repos)) |
| C2 | long_silence | 45 | A 390-day stretch with no visible activity (2014-10-01 to 2015-10-26). ([source](https://api.github.com/orgs/github/repos)) |
| C3 | star_giant | 40 | 669804 total stars; gitignore alone has 176159. ([source](https://api.github.com/orgs/github/repos)) |
| C4 | archive_wall | 34 | 39 archived repos. ([source](https://api.github.com/orgs/github/repos)) |
| C5 | recent_focus | 14 | 100 of the 100 recent public events are on github/advisory-database. ([source](https://api.github.com/users/github/events/public)) |
| C6 | language_habit | 12 | JavaScript in 58 original repos. ([source](https://api.github.com/orgs/github/repos)) |
| C7 | account_age | 10 | Account created on 2008-05-11 (18 years 6 months ago), 572 public repos. ([source](https://api.github.com/users/github)) |

**gemini:gemini-3.6-flash** · written by: offline templates (AI pass 1 failed) · 66.3s · checks: PASS

1. Spawned 41 repos in 2022. A factory that only makes prototypes. `[C1]`
2. 390 days without a sign of life (2014-10-01 to 2015-10-26). The profile was legally a cold case. `[C2]`
3. 669804 stars, and gitignore carries 176159 of them. Everything else is supporting cast with no lines. `[C3]`
4. 39 archived repos, each one embalmed by its own creator. `[C4]`
5. 100 of the last 100 events happened at github/advisory-database. Returning to the scene, as they do. `[C5]`

<sub>warnings: pass 1 attempt 1 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 attempt 2 failed: AI HTTP 429: {   "error": {     "code": 429,     "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota ex / pass 1 produced too few candidates; using offline templates</sub>

**gemini:gemini-3.5-flash-lite** · written by: gemini (gemini-3.5-flash-lite), 2-pass · 93.1s · checks: PASS

1. Created 41 original repos in 2022. It was a banner year for volume over structural integrity. `[C1]`
2. A 390-day stretch with no visible activity from 2014-10-01 to 2015-10-26. The repository fossil record suggests a sudden ice age. `[C2]`
3. 100 of the 100 recent public events are on github/advisory-database. The timeline reads like a permanent posture at the scene of an accident. `[C5]`
4. JavaScript spans 58 original repos. An empire built entirely on shifting sand and loose types. `[C6]`

<sub>warnings: pass 2 attempt 1 failed: AI HTTP 503: {   "error": {     "code": 503,     "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",     "status": "UNAVAILABLE"   } } </sub>

<details><summary>critic deleted 6 of 10 candidates</summary>

- 669804 total stars accumulated across the board. The universe noticed, but the compiler remained unimpressed. → *cliché about the universe and compiler*
- 39 archived repos sitting in the cold storage. A small town's worth of deferred maintenance. → *slightly generic metaphor for archived repos*
- Account created on 2008-05-11 with 572 public repos. That is an astonishing amount of noise to broadcast for nearly two decades. → *vague phrasing about noise*
- The gitignore alone has 176159 stars. People are bookmarking the things being kept out. → *repeats the gitignore concept weakly*
- JavaScript in 58 original repos combined with 39 archived repos means most of those files went straight from the womb to the morgue. → *mixes two cards with a weak metaphor*
- Active since 2008-05-11, yet all 100 recent public events land squarely on github/advisory-database. The profile has evolved from making mistakes to auditing everyone else's. → *starts with similar focus on dates as candidate 2*

</details>

## Model comparison

| Model | Jokes kept | Failed checks | Fell back to offline | Topped up with offline | Avg time per target |
|---|---|---|---|---|---|
| `gemini:gemini-3.6-flash` | 71 | 0 | 10 | 0 | 49.2s |
| `gemini:gemini-3.5-flash-lite` | 67 | 0 | 0 | 0 | 25.4s |

Automatic checks: **ALL PASS** · total time 1184s
