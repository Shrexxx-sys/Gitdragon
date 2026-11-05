// Background service worker: the only part of the extension that talks to our backend.
// (Content scripts on github.com can't freely call localhost, so they ask us instead.)

const DEFAULT_BACKEND = 'http://localhost:3000';
const TIMEOUT_MS = 120000;

async function getBackendUrl() {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  return (backendUrl || DEFAULT_BACKEND).replace(/\/$/, '');
}

async function runAutopsy(page, fresh) {
  const backend = await getBackendUrl();
  const path =
    page.type === 'repo'
      ? `/repo/${encodeURIComponent(page.owner)}/${encodeURIComponent(page.name)}`
      : `/profile/${encodeURIComponent(page.username)}`;
  const url = backend + path + (fresh ? '?fresh=1' : '');

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err && err.name === 'TimeoutError';
    return {
      ok: false,
      error: {
        code: timedOut ? 'TIMEOUT' : 'BACKEND_UNREACHABLE',
        message: timedOut
          ? 'The backend took too long to answer. Try again in a moment.'
          : `Can't reach the Git Autopsy backend at ${backend}. Start it by running "npm start" in the project folder.`,
      },
    };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: `The backend sent an unreadable answer (HTTP ${res.status}).` } };
  }
  if (!res.ok) {
    return { ok: false, error: (body && body.error) || { code: 'HTTP_' + res.status, message: `Backend error (HTTP ${res.status}).` } };
  }
  return { ok: true, data: body };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'GIT_AUTOPSY_RUN') return false;
  runAutopsy(msg.page, msg.fresh).then(sendResponse);
  return true; // keep the message channel open for the async answer
});
