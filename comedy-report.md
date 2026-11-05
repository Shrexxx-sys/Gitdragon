# Git Autopsy: comedy report

Generated 2026-11-05T09:13:16.412Z · models: `offline templates` · calibration: **PLACEHOLDER examples** (replace them in calibration.md)

Each target lists its **evidence cards** (facts measured by code, ranked by how roastable they are), then the jokes each model kept. The `[C1]` tags show which card a joke is built on. "Checks" = the automatic checks (evidence reference, specific detail, banned phrases, LIMIT topics, invented numbers, length, unique openings).

## 1. Repo: [torvalds/linux](https://github.com/torvalds/linux), huge, very active · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | todo_pile | 50 | GitHub code search finds 472 TODO/FIXME matches. ([source](https://github.com/search?q=repo%3Atorvalds%2Flinux+TODO+OR+FIXME&type=code)) |
| C2 | latest_message | 18 | The most recent commit message, on 2026-11-03, is "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux". ([source](https://api.github.com/repos/torvalds/linux/commits?per_page=100)) |
| C3 | cadence | 14 | The typical gap between commits is 0 days, across 1505332 commits. ([source](https://api.github.com/repos/torvalds/linux/commits?per_page=100)) |
| C4 | language_mix | 12 | C is 98% of the code, Assembly 1%. ([source](https://api.github.com/repos/torvalds/linux/languages)) |
| C5 | stars_and_age | 11 | 254437 stars and 67099 forks since 2011-09-04. ([source](https://api.github.com/repos/torvalds/linux)) |
| C6 | largest_file | 10 | The largest file is MAINTAINERS (933 KB) out of 19031 files. ([source](https://api.github.com/repos/torvalds/linux/git/trees/master?recursive=1)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. 472 TODO/FIXME comments. The backlog lives in the code now. `[C1]`
2. Latest word from the repo, dated 2026-11-03: "Merge tag 'cocci-7.4-rc1' of git://git.kernel.org/pub/scm/linux/kernel/git/jlawall/linux". Noted for the record. `[C2]`
3. 1505332 commits, typically several a day. Steady as a dripping tap. `[C3]`
4. C is 98% of the code. No identity crisis here. `[C4]`
5. Since 2011-09-04: 254437 stars, 67099 forks. The market has spoken, softly. `[C5]`

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

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Bots made 39 of the last 100 commits. The humans left; the machines kept the lights on. `[C1]`
2. 261 open issues and pull requests. The waiting room has its own waiting room. `[C2]`
3. Most recent testimony, 2026-11-02: "deps: body-parser@^2.4.0 (#7563)". The witness may step down. `[C3]`
4. Typical pace: several a day, kept up for 6186 commits. Consistency is a virtue, and also a symptom. `[C4]`
5. 100% JavaScript. The other languages were not invited. `[C5]`

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

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Pronounced dead 12 years 9 months ago, final words "Merge pull request #183 from bkeepers/unmaintained". Bleak thing to carve on a headstone dated 2014-02-03. `[C1]`
2. 338 days flatlined (2013-02-23 to 2014-01-28), then a pulse. Medical science has questions. `[C2]`
3. Its newest commit message is "Merge pull request #183 from bkeepers/unmaintained", entered 2014-02-03. Prosecution rests. `[C3]`
4. 516 commits at several a day. A heartbeat monitor that refuses to flatline. `[C4]`
5. The code is 100% Ruby, the rest is witnesses. `[C5]`

## 4. Repo: [octocat/Spoon-Knife](https://github.com/octocat/Spoon-Knife), tiny, famous · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2014-02-12 (12 years 8 months ago). The final commit message was "Pointing to the guide for forking". ([source](https://api.github.com/repos/octocat/Spoon-Knife/commits)) |
| C2 | issue_pile | 55 | 21626 open issues and pull requests. ([source](https://api.github.com/repos/octocat/Spoon-Knife)) |
| C3 | latest_message | 18 | The most recent commit message, on 2014-02-12, is "Pointing to the guide for forking". ([source](https://api.github.com/repos/octocat/Spoon-Knife/commits?per_page=100)) |
| C4 | language_mix | 12 | HTML is 58% of the code, CSS 42%. ([source](https://api.github.com/repos/octocat/Spoon-Knife/languages)) |
| C5 | stars_and_age | 11 | 14171 stars and 160947 forks since 2011-01-27. ([source](https://api.github.com/repos/octocat/Spoon-Knife)) |
| C6 | largest_file | 10 | The largest file is README.md (1 KB) out of 3 files. ([source](https://api.github.com/repos/octocat/Spoon-Knife/git/trees/main?recursive=1)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Last seen 2014-02-12, saying "Pointing to the guide for forking". It has not spoken in 12 years 8 months. `[C1]`
2. 21626 open issues and PRs. The inbox has an inbox. `[C2]`
3. Latest word from the repo, dated 2014-02-12: "Pointing to the guide for forking". Gripping. `[C3]`
4. HTML is 58% of the code. Commitment, at least. `[C4]`
5. Since 2011-01-27: 14171 stars, 160947 forks. The market has spoken, softly. `[C5]`

## 5. Repo: [octocat/Hello-World](https://github.com/octocat/Hello-World), abandoned since 2012 · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | abandoned | 100 | Last commit on 2012-03-06 (14 years 8 months ago). The final commit message was "Merge pull request #6 from Spaceghost/patch-1". ([source](https://api.github.com/repos/octocat/Hello-World/commits)) |
| C2 | readme_only_title | 75 | The README (2 words) only repeats the project name: "Hello World!". ([source](https://api.github.com/repos/octocat/Hello-World/readme)) |
| C3 | placeholder_name | 66 | The repository is literally named "Hello-World". ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C4 | issue_pile | 54 | 7524 open issues and pull requests. ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C5 | long_gap | 46 | Once went 230 days without a commit (2011-01-26 to 2011-09-14). ([source](https://api.github.com/repos/octocat/Hello-World/commits?per_page=100)) |
| C6 | latest_message | 18 | The most recent commit message, on 2012-03-06, is "Merge pull request #6 from Spaceghost/patch-1". ([source](https://api.github.com/repos/octocat/Hello-World/commits?per_page=100)) |
| C7 | stars_and_age | 11 | 3900 stars and 7387 forks since 2011-01-26. ([source](https://api.github.com/repos/octocat/Hello-World)) |
| C8 | largest_file | 10 | The largest file is README (0 KB) out of 1 files. ([source](https://api.github.com/repos/octocat/Hello-World/git/trees/master?recursive=1)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Time of death 2012-03-06, last words "Merge pull request #6 from Spaceghost/patch-1". Nobody has claimed the body in 14 years 8 months. `[C1]`
2. A 2-word README that just repeats the title. A tombstone with only the name filled in. `[C2]`
3. "Hello-World": a name picked by someone who planned to delete it the same afternoon. `[C3]`
4. 7524 open issues and pull requests. Each one a small grave nobody tends. `[C4]`
5. Between 2011-01-26 and 2011-09-14: 230 days of nothing. Long enough for the dependencies to rot on their own. `[C5]`

## 6. Repo: [diamante-io/test](https://github.com/diamante-io/test), empty, placeholder name · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | empty_repo | 95 | diamante-io/test has 0 commits. It was created on 2024-01-25 and nothing was ever pushed. ([source](https://api.github.com/repos/diamante-io/test/commits)) |
| C2 | empty_wait | 70 | 2 years 9 months have passed since 2024-01-25 without a single push. ([source](https://api.github.com/repos/diamante-io/test)) |
| C3 | placeholder_name | 66 | The repository is literally named "test". ([source](https://api.github.com/repos/diamante-io/test)) |
| C4 | stars_and_age | 11 | 186 stars and 0 forks since 2024-01-25. ([source](https://api.github.com/repos/diamante-io/test)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Cause of death for "test": never born. Created 2024-01-25, 0 commits, a headstone with no body under it. `[C1]`
2. An empty plot, reserved 2024-01-25 and left untouched for 2 years 9 months. `[C2]`
3. Naming the repo "test" was the most honest decision in its whole history. `[C3]`
4. Born 2024-01-25, 186 stars, 0 forks. The obituary will be short. `[C4]`

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

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Last seen 2020-01-21, saying "add style guide". It has not spoken in 6 years 9 months. `[C1]`
2. 713 days without a commit, 2018-02-07 to 2020-01-21. A long nap. `[C2]`
3. 4725 open issues and pull requests. Each one a small grave nobody tends. `[C3]`
4. Latest word from the repo, dated 2020-01-21: "add style guide". Noted for the record. `[C4]`
5. Dockerfile is 100% of the code. No identity crisis here. `[C5]`

## 8. Repo: [sindresorhus/awesome](https://github.com/sindresorhus/awesome), giant README list · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | issue_pile | 45 | 103 open issues and pull requests. ([source](https://api.github.com/repos/sindresorhus/awesome)) |
| C2 | no_tests | 35 | 23 files and not one of them is a test. ([source](https://api.github.com/repos/sindresorhus/awesome/git/trees/main?recursive=1)) |
| C3 | latest_message | 18 | The most recent commit message, on 2026-09-02, is "Meta tweaks". ([source](https://api.github.com/repos/sindresorhus/awesome/commits?per_page=100)) |
| C4 | cadence | 14 | The typical gap between commits is 3 days, across 1209 commits. ([source](https://api.github.com/repos/sindresorhus/awesome/commits?per_page=100)) |
| C5 | stars_and_age | 11 | 531296 stars and 38082 forks since 2014-07-11. ([source](https://api.github.com/repos/sindresorhus/awesome)) |
| C6 | largest_file | 10 | The largest file is media/logo.ai (80 KB) out of 23 files. ([source](https://api.github.com/repos/sindresorhus/awesome/git/trees/main?recursive=1)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. 103 open issues and pull requests. The waiting room has its own waiting room. `[C1]`
2. Not one test among 23 files. Every deploy is a coin flip with extra steps. `[C2]`
3. Most recent testimony, 2026-09-02: "Meta tweaks". The witness may step down. `[C3]`
4. Typical pace: one every 3 days, kept up for 1209 commits. Consistency is a virtue, and also a symptom. `[C4]`
5. 531296 stars and 38082 forks since 2014-07-11. The audience is exactly the size it deserves. `[C5]`

## 9. Profile: [sindresorhus](https://github.com/sindresorhus), huge (1000+ repos) · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 84 original repos in 2015. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C2 | star_giant | 40 | 229555 total stars; type-fest alone has 17494. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C3 | one_language | 36 | 265 of 295 original repos are JavaScript. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C4 | recent_focus | 14 | 22 of the 100 recent public events are on sindresorhus/type-fest. ([source](https://api.github.com/users/sindresorhus/events/public)) |
| C5 | language_habit | 12 | JavaScript in 265 original repos. ([source](https://api.github.com/users/sindresorhus/repos)) |
| C6 | account_age | 10 | Account created on 2009-12-20 (16 years 10 months ago), 1148 public repos. ([source](https://api.github.com/users/sindresorhus)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Spawned 84 repos in 2015. A factory that only makes prototypes. `[C1]`
2. 229555 stars, and type-fest carries 17494 of them. Everything else is the B-side nobody flips to. `[C2]`
3. 265 of 295 repos are JavaScript. Not a stack, a life sentence. `[C3]`
4. 265 repos of JavaScript. Habits form; this one set like concrete. `[C5]`
5. Opened 2009-12-20, 16 years 10 months ago, 1148 public repos. Time of death unclear; the body is still typing. `[C6]`

## 10. Profile: [torvalds](https://github.com/torvalds), active, few repos · intensity: **mild**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | long_silence | 45 | A 1955-day stretch with no visible activity (2011-09-04 to 2017-01-11). ([source](https://api.github.com/users/torvalds/repos)) |
| C2 | star_giant | 40 | 266690 total stars; linux alone has 254437. ([source](https://api.github.com/users/torvalds/repos)) |
| C3 | one_language | 36 | 8 of 9 original repos are C. ([source](https://api.github.com/users/torvalds/repos)) |
| C4 | recent_focus | 14 | 95 of the 100 recent public events are on torvalds/linux. ([source](https://api.github.com/users/torvalds/events/public)) |
| C5 | language_habit | 12 | C in 8 original repos. ([source](https://api.github.com/users/torvalds/repos)) |
| C6 | account_age | 10 | Account created on 2011-09-03 (15 years 2 months ago), 12 public repos. ([source](https://api.github.com/users/torvalds)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. 1955 quiet days between 2011-09-04 and 2017-01-11. The keyboard got a long rest. `[C1]`
2. 266690 total stars, 254437 of them on linux. The rest of the repos ride for free. `[C2]`
3. 8 of 9 original repos in C. Loyal. `[C3]`
4. C in 8 repos. A favorite. `[C5]`
5. Account opened 2011-09-03: 12 public repos since. `[C6]`

## 11. Profile: [pjhyett](https://github.com/pjhyett), dead since 2018 · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | gone_quiet | 85 | Last public activity on 2018-08-30 (8 years 2 months ago). ([source](https://api.github.com/users/pjhyett/repos)) |
| C2 | missing_readmes | 48 | 4 of the 6 most recently pushed original repos have no README: "ThoughtStream", "blackjax", "errcount", "vjot". ([source](https://api.github.com/repos/{owner}/{repo}/readme)) |
| C3 | long_silence | 45 | A 1952-day stretch with no visible activity (2013-04-25 to 2018-08-30). ([source](https://api.github.com/users/pjhyett/repos)) |
| C4 | top_repo | 16 | The most-starred original repo is auto_migrations with 145 stars: "Rails plugin for automating migrations". ([source](https://api.github.com/users/pjhyett/repos)) |
| C5 | language_habit | 12 | Ruby in 5 original repos. ([source](https://api.github.com/users/pjhyett/repos)) |
| C6 | account_age | 10 | Account created on 2008-01-07 (18 years 10 months ago), 8 public repos. ([source](https://api.github.com/users/pjhyett)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Nothing public since 2018-08-30. The profile is a memorial page with a follow button. `[C1]`
2. "ThoughtStream" and "blackjax" have no README. Each one opens like a door into an empty room. `[C2]`
3. From 2013-04-25 to 2018-08-30, 1952 days of silence. The repos aged in the dark like cheese. `[C3]`
4. auto_migrations, 145 stars. Everything else on the profile orbits it in silence. `[C4]`
5. Found Ruby, moved in, 5 repos later never left. `[C5]`

## 12. Profile: [ghost](https://github.com/ghost), empty account · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | empty_profile | 95 | ghost has 0 public repositories after 18 years 6 months on GitHub (account created 2008-05-13). ([source](https://api.github.com/users/ghost)) |
| C2 | empty_audience | 72 | 13241 followers, 0 public repositories. ([source](https://api.github.com/users/ghost)) |
| C3 | empty_but_busy | 66 | 10 public events in the last ~90 days, and still 0 repositories of their own. ([source](https://api.github.com/users/ghost/events/public)) |
| C4 | long_silence | 45 | A 1386-day stretch with no visible activity (2021-08-18 to 2025-06-05). ([source](https://api.github.com/users/ghost/repos)) |
| C5 | recent_focus | 14 | 2 of the 10 recent public events are on diysnist-static/tsil-website. ([source](https://api.github.com/users/ghost/events/public)) |
| C6 | account_age | 10 | Account created on 2008-05-13 (18 years 6 months ago), 0 public repos. ([source](https://api.github.com/users/ghost)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. 0 public repos in 18 years 6 months. A ghost with a username, haunting nothing. `[C1]`
2. 0 repos, 13241 followers. A crowd gathered around a hole in the ground. `[C2]`
3. 10 events in about 90 days, 0 repos. A detective with no case file. `[C3]`
4. 1386 days without a sign of life (2021-08-18 to 2025-06-05). Search teams found only stale branches. `[C4]`
5. 2 of the last 10 events happened at diysnist-static/tsil-website. Returning to the scene, as they do. `[C5]`

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

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Last public activity 2024-08-21, 2 years 2 months ago. On a long break. `[C1]`
2. Repos called "Hello-World" and "test-repo1". Naming can wait, forever. `[C2]`
3. No README in "octocat.github.io" and "test-repo1". Mystery as a feature. `[C3]`
4. 2127 quiet days between 2018-05-10 and 2024-03-07. A sabbatical. `[C4]`
5. 21217 total stars, 14171 of them on Spoon-Knife. Hard to argue with. `[C5]`

## 14. Profile: [defunkt](https://github.com/defunkt), old account, many repos · intensity: **medium**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 40 original repos in 2008. ([source](https://api.github.com/users/defunkt/repos)) |
| C2 | long_silence | 45 | A 565-day stretch with no visible activity (2025-04-09 to 2026-10-26). ([source](https://api.github.com/users/defunkt/repos)) |
| C3 | star_giant | 40 | 36992 total stars; jquery-pjax alone has 16627. ([source](https://api.github.com/users/defunkt/repos)) |
| C4 | language_habit | 12 | Ruby in 38 original repos. ([source](https://api.github.com/users/defunkt/repos)) |
| C5 | account_age | 10 | Account created on 2007-10-20 (19 years ago), 107 public repos. ([source](https://api.github.com/users/defunkt)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. 2008: 40 repos created. Starting things was the hobby; finishing them was optional. `[C1]`
2. From 2025-04-09 to 2026-10-26, 565 days of silence. Long enough to be declared missing in most places. `[C2]`
3. jquery-pjax holds 16627 of 36992 stars. The other repos are understudies who never go on. `[C3]`
4. Found Ruby, moved in, 38 repos later never left. `[C4]`
5. 107 public repos in 19 years since 2007-10-20. The autopsy is overdue. `[C5]`

## 15. Profile: [github](https://github.com/github), organization · intensity: **savage**

| Card | Angle | Score | Fact (source) |
|---|---|---|---|
| C1 | creation_spree | 50 | Created 41 original repos in 2022. ([source](https://api.github.com/orgs/github/repos)) |
| C2 | long_silence | 45 | A 390-day stretch with no visible activity (2014-10-01 to 2015-10-26). ([source](https://api.github.com/orgs/github/repos)) |
| C3 | star_giant | 40 | 669780 total stars; gitignore alone has 176159. ([source](https://api.github.com/orgs/github/repos)) |
| C4 | archive_wall | 34 | 39 archived repos. ([source](https://api.github.com/orgs/github/repos)) |
| C5 | recent_focus | 14 | 100 of the 100 recent public events are on github/advisory-database. ([source](https://api.github.com/users/github/events/public)) |
| C6 | language_habit | 12 | JavaScript in 58 original repos. ([source](https://api.github.com/orgs/github/repos)) |
| C7 | account_age | 10 | Account created on 2008-05-11 (18 years 6 months ago), 572 public repos. ([source](https://api.github.com/users/github)) |

**offline templates** · written by: offline templates · 0.0s · checks: PASS

1. Spawned 41 repos in 2022. A factory that only makes prototypes. `[C1]`
2. 390 days without a sign of life (2014-10-01 to 2015-10-26). The profile was legally a cold case. `[C2]`
3. 669780 stars, and gitignore carries 176159 of them. Everything else is supporting cast with no lines. `[C3]`
4. 39 archived repos, each one embalmed by its own creator. `[C4]`
5. 100 of the last 100 events happened at github/advisory-database. Returning to the scene, as they do. `[C5]`

## Model comparison

| Model | Jokes kept | Failed checks | Fell back to offline | Topped up with offline | Avg time per target |
|---|---|---|---|---|---|
| `offline templates` | 74 | 0 | 0 | 0 | 0.0s |

Automatic checks: **ALL PASS** · total time 36s
