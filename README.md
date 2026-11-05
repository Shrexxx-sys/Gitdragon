# Git Autopsy

A Chrome extension for github.com. Open any **repository** or **user profile**, click **Run Autopsy**, and a side panel shows:

1. **Summary**: what the project does, how to run it, and which files to read first (or, for a profile, what this developer mostly builds).
2. **The Autopsy**: a roast built only from real facts about that exact repo or profile.
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
                                     writer: AI (Groq / Gemini / Ollama) or offline templates
                                                                   │
                                     JSON validated ──> { summary, roast, evidence } ──> panel
```

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
| `src/aiProvider.js` | **The only file that talks to an AI model.** Swap models here or in `.env` |
| `src/writer.js` | Builds the prompt, validates the AI's JSON, retries, falls back to templates |
| `src/offlineWriter.js` | Template-based summary and roast, used when no AI key is set |
| `test/` | Unit and integration tests (they use saved real GitHub responses in `test/fixtures/`) |
| `scripts/smoke.js` | Runs the full pipeline on 5 real repos and 5 real profiles |

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
| `GROQ_API_KEY` | AI-written summary and roast (free tier) | https://console.groq.com/keys |
| `GEMINI_API_KEY` | Alternative free AI | https://aistudio.google.com/apikey |
| `GITHUB_TOKEN` | Raises the GitHub limit from 60 to 5000 requests/hour, and pinned repos come from GraphQL | https://github.com/settings/tokens (no scopes needed) |

**Without any AI key**, everything still works: the backend uses built-in templates (`offline` mode). The roast is simpler but still 100% fact-based.

To switch models, set `AI_PROVIDER=groq|gemini|ollama|offline` and `GROQ_MODEL` / `GEMINI_MODEL` / `OLLAMA_MODEL` in `.env`. To add a brand-new provider, add one function in `src/aiProvider.js`.

---

## Load the extension in Chrome ("Load unpacked")

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the **`extension`** folder inside this project (not the project root)
5. "Git Autopsy" appears in the list. Make sure it's enabled.
6. Make sure the backend is running (`npm start`)
7. Open any repo (e.g. https://github.com/expressjs/cors) or profile (e.g. https://github.com/octocat)
8. Click the red **AUTOPSY** tab on the right edge of the page, then **Run Autopsy**

After you change extension code, click the reload icon on the Git Autopsy card in `chrome://extensions` and refresh the GitHub tab.

---

## Tests

```bash
npm test          # 47 unit/integration tests, no internet needed (uses saved GitHub responses)
npm run smoke     # full pipeline on 5 real repos + 5 real profiles + 1 error case (needs internet)
```

What the tests cover:

- **Facts engine**: real saved responses for `octocat/Hello-World`, `expressjs/cors` and the `octocat` profile, plus empty repos, empty profiles, organizations, huge repos with partial file lists, README parsing, commit-message classifiers
- **Error handling**: 404/private, rate limit, network failure, other GitHub errors, ETag cache
- **AI step**: JSON validation, rejection of invented numbers and fake file names, retry with feedback, fallback to templates, provider selection
- **Server**: both endpoints, error status codes, result cache
- **Extension**: manifest, page detection, the panel rendered in a simulated browser (jsdom), GitHub-style navigation, HTML-injection safety, and the background worker talking to a real local server

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

## Honest limitations (Phase 1)

- "Open issues" from GitHub includes open pull requests. The panel says so.
- Commit patterns (gaps, lazy messages, authors) use the **latest 100 commits**. The total commit count is exact.
- Profile "quiet periods" are estimated from repo creation dates, last-push dates and the last ~90 days of public events (GitHub doesn't give full history for free).
- Profiles with more than 300 repos: only the 300 most recently pushed are analysed (the panel says so).
- README presence on profiles is checked for the 4 most recent original repos (8 with a token) to save rate limit.
- Without a token, pinned repos are read from the public profile page. If GitHub changes that page, it shows "could not be read" instead of failing.
