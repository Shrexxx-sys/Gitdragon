# Git Autopsy

A Chrome extension for github.com. Open any **repository** or **user profile**, click **Run Autopsy**, and a side panel shows:

1. **Summary**: what the project does, how to run it, and which files to read first (or, for a profile, what this developer mostly builds).
2. **The Autopsy**: 3-5 dark, deadpan roast lines built only from real facts about that exact repo or profile. Pick the intensity (**Mild / Medium / Savage**), and click **"Why this joke?"** under any line to see the evidence card it's built on.
3. **Evidence**: every fact the summary and roast were built from, each with a link to the GitHub API URL it came from, so you can check it yourself.

> **Facts first, jokes second.** Our own code measures everything (commit gaps, languages, missing tests, and so on). The AI only gets that list of verified facts and is not allowed to invent numbers. Its answer is checked automatically, and an answer with a number that isn't in the evidence is rejected and retried.

---

## How it works

```
github.com page ──> extension (content.js) ──> background.js ──> backend (Express, localhost:3000)
                                                                   │
                                     GitHub REST API <── collectors (raw data)
                                                                   │
                                                  facts engine (plain code, no AI)
                                                                   │
                         ┌─────────────────────────────────────────┴───────────────────┐
              summary: 1 AI call, validated                     comedy engine (src/comedy/)
                                                     angle detector -> evidence cards (plain code)
                                                     pass 1: AI writes 10 candidate jokes
                                                     pass 2: AI critic keeps + sharpens the best 3-5
                                                     automatic checks (plain code) have the final say
                         └─────────────────────────────────────────┬───────────────────┘
                                     { summary, jokes + cards, evidence } ──> panel
```

No AI key, or the AI fails? Both halves fall back to offline templates that use the same facts and pass the same checks.

| Folder / file | What it does |
|---|---|
| `extension/` | The Chrome extension (Manifest V3, plain JavaScript) |
| `extension/pageDetect.js` | Decides if a URL is a repo, a profile, or neither |
| `extension/content.js` | Injects the side panel and follows GitHub's page changes (GitHub changes pages without a full reload) |
| `extension/background.js` | Calls the backend (content scripts can't call localhost directly) |
| `src/server.js` | Express app: `GET /repo/:owner/:name`, `GET /profile/:username`, `GET /health` |
| `src/githubClient.js` | GitHub API calls, optional token, disk cache with ETags, error handling |
| `src/collectors/` | Fetch raw data from GitHub (no analysis) |
| `src/facts/` | **Facts engine**: turns raw data into checkable facts (pure functions, no AI) |
| `src/aiProvider.js` | **The only file that talks to an AI model.** Summary model + humor model, set in `.env` |
| `src/writer.js` | Summary prompt + validation; combines the summary with the roast |
| `src/offlineWriter.js` | Template-based summary, used when no AI key is set |
| `src/comedy/angles.js` | **Angle detector**: finds the most roastable patterns and turns them into evidence cards |
| `src/comedy/checks.js` | **Automatic joke checks**: evidence, specific detail, banned phrases, LIMIT topics, numbers, openings |
| `src/comedy/comedyWriter.js` | Two-pass generation (writer + critic) with retries and fallback |
| `src/comedy/offlineComedy.js` | Fact-filled joke templates for every angle, at three intensities |
| `src/comedy/calibration.js` + `calibration.md` | Your example jokes, injected into the prompt as tone examples |
| `test/` | Unit and integration tests (saved real GitHub responses in `test/fixtures/`, fake facts in `test/fakeFacts.js`) |
| `scripts/smoke.js` | Runs the full pipeline on 5 real repos and 5 real profiles |
| `scripts/comedy.js` | Runs the comedy engine on 15 real targets and writes `comedy-report.md` (and compares models) |

---

## Setup (from a clean install)

You need **Node.js 18 or newer** and **Google Chrome**.

```bash
# 1. Install dependencies
npm install

# 2. Create your config file
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. (Optional, but recommended) add keys to .env, see below

# 4. Run the tests
npm test

# 5. Start the backend
npm start
# -> Git Autopsy backend running on http://localhost:3000
```

Check it works by opening http://localhost:3000/health in your browser. It shows which AI is active.

### Keys (all free, all optional)

| Key in `.env` | Why | Where to get it |
|---|---|---|
| `GITHUB_TOKEN` | Raises the GitHub limit from 60 to 5000 requests/hour; enables TODO counts (code search) | https://github.com/settings/tokens (no scopes needed) |
| `GEMINI_API_KEY` | AI summary + roast (free tier) | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | Alternative free AI (fast) | https://console.groq.com/keys |
| `OPENROUTER_API_KEY` | Alternative: many free models (names end in `:free`) | https://openrouter.ai/keys |

Real keys go in **`.env` only**, never in `.env.example` (that file is committed to git; a test checks it stays empty).

**Without any AI key**, everything still works: the backend uses built-in templates (`offline` mode), still 100% fact-based and passing the same checks.

### Choosing the AI models

There are two roles. The **summary model** (`AI_PROVIDER`) writes the plain summary. The **humor model** (`HUMOR_PROVIDER` + `HUMOR_MODEL`) writes and critiques the roast. If the humor model isn't set, the summary model does both.

| Provider | Setup | Example `.env` |
|---|---|---|
| **Gemini** (hosted, free) | Get a key at aistudio.google.com/apikey. Note: `gemini-2.5-*` is no longer available to new users; use the 3.x models | `GEMINI_API_KEY=...` `GEMINI_MODEL=gemini-3.5-flash` |
| **Groq** (hosted, free, very fast) | Get a key at console.groq.com/keys | `GROQ_API_KEY=...` `HUMOR_PROVIDER=groq` `HUMOR_MODEL=llama-3.3-70b-versatile` |
| **OpenRouter** (hosted, free models) | Get a key at openrouter.ai/keys; pick a model ending in `:free` | `OPENROUTER_API_KEY=...` `HUMOR_PROVIDER=openrouter` `HUMOR_MODEL=meta-llama/llama-3.3-70b-instruct:free` |
| **Ollama** (runs on your PC, free, no key) | Install from ollama.com, then run `ollama pull llama3.2` (or `qwen2.5:7b`); keep Ollama running | `HUMOR_PROVIDER=ollama` `HUMOR_MODEL=llama3.2` |
| **Offline** | Nothing to set up | `AI_PROVIDER=offline` |

Free tiers are sometimes "busy" (HTTP 429/503). The provider retries automatically, then falls back to templates.

**Compare two models on the same input:**
```bash
npm run comedy -- --models gemini:gemini-3.6-flash,gemini:gemini-3.5-flash-lite
npm run comedy -- --models groq:llama-3.3-70b-versatile,ollama:llama3.2 --targets torvalds/linux,octocat
```
`comedy-report.md` then shows both models' jokes side by side for every target, plus a comparison table.

To add a brand-new provider, add one function in `src/aiProvider.js`.

---

## Load the extension in Chrome ("Load unpacked")

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the **`extension`** folder inside this project (not the project root)
5. "Git Autopsy" appears in the list. Make sure it's enabled.
6. Make sure the backend is running (`npm start`)
7. Open any repo (e.g. https://github.com/expressjs/cors) or profile (e.g. https://github.com/octocat)
8. Click the red **AUTOPSY** tab on the right edge of the page, pick **Mild / Medium / Savage**, then **Run Autopsy**
9. Under any roast line, click **Why this joke?** to see the evidence card (fact, exact quote, number, source link)

After you change extension code, click the reload icon on the Git Autopsy card in `chrome://extensions` and refresh the GitHub tab.

---

## The comedy engine (how the roast is made)

**Style:** dark, deadpan, situational. A specific fact, then an unexpected twist, in one or two sentences. Abandoned projects get "death certificate" energy; active ones get absurd precision.

**The LIMIT (enforced in the prompt AND by code):** jokes are only about public code, repo and habit data. Never about the person's identity, appearance, health, mental health, family, nationality or personal life. The comedy model never even sees the user's bio or name, only the evidence cards.

1. **Angle detector** (`src/comedy/angles.js`, plain code) scans the facts for roastable patterns and ranks them by how unusual they are. Examples: abandonment, `"final"`/`"final2"` commits, commits at 1-5 AM (local time, read from the commit patches), 200 commits in one day then silence, 40 forks vs 3 originals, a README that only repeats the title, many TODOs with zero tests, a repo named `test3`, the same tutorial three times, perfect docs with 0 stars, thousands of commits with no docs, committed `node_modules`/`.env`. There's **always** an angle: a spotless repo gets the "suspiciously clean" angle, and specific fallbacks (exact latest commit message, exact dates) are always available. No generic jokes.
2. **Evidence cards**: each angle becomes `{ angle, fact, number, source_url, exact_quote }`, plus the exact details a joke must mention.
3. **Pass 1** (hot): the humor model writes 10 candidates from the cards, in the tone of `calibration.md`.
4. **Pass 2** (cool): a critic deletes generic, unsupported, repetitive or LIMIT-breaking jokes, keeps the best 3-5 and sharpens them.
5. **Automatic checks** (`src/comedy/checks.js`) run on the result. Each joke must cite a card and include its exact detail. Banned: clichés ("coding journey", "works on my machine", "spaghetti code", "Stack Overflow", ...), comparisons to famous people, explaining the joke, starting with "Ah"/"Well", emoji spam, more than 2 sentences, numbers not in the evidence, LIMIT topics, and two jokes with the same opening. Failing jokes are retried or replaced.

**Calibration:** put 10-20 of your own jokes in `calibration.md` (one per line, starting with `- `). They're shown to the AI as tone examples only. The file currently holds **placeholders**; `/health` tells you until you replace them.

---

## Tests

```bash
npm test          # unit/integration tests, no internet or API key needed (saved GitHub responses + fake models)
npm run smoke     # full pipeline on 5 real repos + 5 real profiles + 1 error case (needs internet)
npm run comedy    # comedy engine on 15 real targets -> comedy-report.md (needs internet; AI optional)
```

What the tests cover:

- **Angle detector**: fake facts for every pattern (abandonment, final/final2/asdf commits, 1-5 AM commits, 40 forks vs 3 originals, title-only README, TODOs without tests, `test3`, commit burst then silence, tutorial clones, numbered repos, perfect-but-ignored, thousands of commits without docs, committed `node_modules`/`.env`), an empty profile, an empty repo and a perfect-looking profile
- **Joke checks**: evidence reference, specific detail, banned phrases, LIMIT topics (with no false alarms on "race condition" or "a single commit"), invented numbers, length, duplicate openings
- **Comedy pipeline**: offline jokes on 16 inputs × 3 intensities all pass every check; two-pass generation with fake models (critic retry, offline top-up, total AI failure)
- **Facts engine**: real saved responses for `octocat/Hello-World`, `expressjs/cors` and the `octocat` profile, plus empty repos, empty profiles, organizations, huge repos with partial file lists, README parsing, commit-message classifiers
- **Error handling**: 404/private, rate limit, network failure, other GitHub errors, ETag cache
- **AI step**: JSON validation, rejection of invented numbers and fake file names, retry with feedback, fallback to templates, provider selection
- **Server**: both endpoints, error status codes, result cache
- **Extension**: manifest, page detection, the panel rendered in a simulated browser (jsdom), intensity selector, "Why this joke?", GitHub-style navigation, HTML-injection safety, and the background worker talking to a real local server

`npm run comedy` caches GitHub answers in `.cache/` and AI answers in `.cache/ai/`, so re-running it costs no rate limit. Delete `.cache/ai/` to get fresh jokes.

**Smoke test and the rate limit:** without a `GITHUB_TOKEN`, GitHub allows 60 requests per hour, and the full smoke run needs roughly 70. Items that hit the limit are marked `WAIT`. Run it again after the reset time; answers already fetched are cached in `.cache/` and cost almost nothing. With a token, everything runs in one go.

To refresh the saved fixtures: `node scripts/saveFixtures.js`.

---

## Error messages in the panel

| Situation | What you see |
|---|---|
| Private, deleted or misspelled repo/user | "Not found (or private)" |
| GitHub rate limit | "GitHub rate limit reached" + reset time + tip to add a token |
| Empty repository | Notice: "This repository is empty: it has no commits yet." (the autopsy still runs) |
| Profile with no repos | Notice: "... has no public repositories yet" (the autopsy still runs) |
| No internet / GitHub down | "Network problem" |
| Backend not started | "Backend not running" + "run npm start" |
| Huge repo | Notice that file counts are a minimum (GitHub cuts long file lists short) |

---

## Honest limitations

- "Open issues" from GitHub includes open pull requests. The panel says so.
- Commit patterns (gaps, lazy messages, authors) use the **latest 100 commits**. The total commit count is exact.
- Profile "quiet periods" are estimated from repo creation dates, last-push dates and the last ~90 days of public events (GitHub doesn't give full history for free).
- Profiles with more than 300 repos: only the 300 most recently pushed are analysed (the panel says so).
- README presence on profiles is checked for the 4 most recent original repos (8 with a token) to save rate limit.
- Without a token, pinned repos are read from the public profile page. If GitHub changes that page, it shows "could not be read" instead of failing.
- Commit hours come from the commits' own `.patch` files (one request per repo, at most 3 MB read, only the `Date:` lines kept). On very large repos only part of the sample may be read.
- TODO counts use GitHub code search, which needs a token and has a strict limit of its own; without it the TODO angle is simply skipped.
- The LIMIT word filter is a safety net, not a mind reader: it blocks the obvious words, and the prompt and the critic handle the rest.
