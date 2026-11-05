// Records REAL GitHub API responses into test/fixtures/*.json so unit tests can run offline.
// Usage: node scripts/saveFixtures.js
// (Uses ~15 API requests. Only needed if you want to refresh the fixtures.)
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createGithubClient } = require('../src/githubClient');
const { collectRepo } = require('../src/collectors/repoCollector');
const { collectProfile } = require('../src/collectors/profileCollector');

function recordingFetch(store) {
  return async (url, opts) => {
    const res = await fetch(url, opts);
    const body = await res.text();
    const headers = {};
    for (const h of ['link', 'etag', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'content-type']) {
      if (res.headers.get(h)) headers[h] = res.headers.get(h);
    }
    store[url] = { status: res.status, headers, body };
    return new Response(body, { status: res.status, headers });
  };
}

async function record(name, run) {
  const responses = {};
  const gh = createGithubClient({ token: process.env.GITHUB_TOKEN || '', fetchImpl: recordingFetch(responses) });
  await run(gh);
  const file = path.join(__dirname, '..', 'test', 'fixtures', name + '.json');
  fs.writeFileSync(file, JSON.stringify({ recordedAt: new Date().toISOString(), responses }, null, 1));
  console.log(`saved ${file} (${Object.keys(responses).length} responses, ${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

(async () => {
  await record('repo-hello-world', (gh) => collectRepo(gh, 'octocat', 'Hello-World'));
  await record('repo-cors', (gh) => collectRepo(gh, 'expressjs', 'cors'));
  await record('profile-octocat', (gh) => collectProfile(gh, 'octocat'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
