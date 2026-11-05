// Test helpers: a fake `fetch` that replays saved GitHub responses (fixtures).
const fs = require('fs');
const path = require('path');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name + '.json'), 'utf8'));
}

/** Returns a fetch() that answers from a fixture { recordedAt, responses: { url: {status, headers, body} } }. */
function replayFetch(fixture, { onMissing = 404 } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const r = fixture.responses[url];
    if (!r) return new Response(JSON.stringify({ message: 'Not Found (no fixture)' }), { status: onMissing });
    return new Response(r.body, { status: r.status, headers: r.headers });
  };
  fn.calls = calls;
  return fn;
}

module.exports = { loadFixture, replayFetch };
