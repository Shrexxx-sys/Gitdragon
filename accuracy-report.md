# Git Autopsy: accuracy report

Generated 2026-11-05T10:52:16.863Z · 50 targets (30 repos, 20 profiles) · 566s

**Method:** the facts engine reads the GitHub **REST** API. This report compares its numbers with the same facts read from GitHub's **GraphQL** API (a separate source), field by field. All values are real API responses.

## Overall

- Facts checked: **468**
- Exact matches: **464** (99.1%)
- Within tolerance: **1** (0.2%): busy counters (stars, issues) can change in the seconds between the two requests; tolerance = max(2, 0.2%)
- Mismatches: **3** (0.6%)
- Targets that failed to load: 0

## By field

| Field | Checked | Exact | Within tolerance | Mismatch |
|---|---|---|---|---|
| stars | 30 | 30 | 0 | 0 |
| forks | 30 | 30 | 0 | 0 |
| open issues + PRs | 30 | 27 | 0 | 3 |
| created date | 30 | 30 | 0 | 0 |
| archived | 30 | 30 | 0 | 0 |
| is a fork | 30 | 30 | 0 | 0 |
| empty repo | 30 | 30 | 0 | 0 |
| description | 30 | 30 | 0 | 0 |
| license | 30 | 30 | 0 | 0 |
| main language | 30 | 30 | 0 | 0 |
| total commits | 29 | 29 | 0 | 0 |
| last commit date | 29 | 29 | 0 | 0 |
| public repos | 20 | 19 | 1 | 0 |
| account created date | 20 | 20 | 0 | 0 |
| followers | 18 | 18 | 0 | 0 |
| original repos | 13 | 13 | 0 | 0 |
| forked repos | 13 | 13 | 0 | 0 |
| total stars (originals) | 13 | 13 | 0 | 0 |
| top language | 13 | 13 | 0 | 0 |

## Every mismatch

| Target | Field | Facts engine (REST) | GraphQL |
|---|---|---|---|
| torvalds/linux | open issues + PRs | 3 | 0 |
| django/django | open issues + PRs | 538 | 532 |
| github/gitignore | open issues + PRs | 52 | 47 |

## Targets

Repos: torvalds/linux, expressjs/express, expressjs/cors, mojombo/grit, octocat/Spoon-Knife, octocat/Hello-World, diamante-io/test, kelseyhightower/nocode, sindresorhus/awesome, facebook/react, vuejs/vue, python/cpython, golang/go, nodejs/node, microsoft/vscode, denoland/deno, tj/commander.js, lodash/lodash, jashkenas/backbone, jquery/jquery, twbs/bootstrap, pallets/flask, psf/requests, django/django, rails/rails, octocat/linguist, github/gitignore, public-apis/public-apis, ohmyzsh/ohmyzsh, sindresorhus/is-online

Profiles: torvalds, sindresorhus, pjhyett, ghost, octocat, defunkt, github, gaearon, tj, mojombo, kelseyhightower, yyx990803, addyosmani, getify, jashkenas, wycats, mitchellh, antirez, dhh, google
