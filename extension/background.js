// Background service worker: the only part of the extension that talks to the backend.
// (Content scripts on github.com can't freely call other servers, so they ask us instead.)
// The extension contains NO secrets: the AI key and GitHub token live only on the server.

// Replaced with the deployed URL by `npm run package` (or set chrome.storage.local.backendUrl).
const DEFAULT_BACKEND = 'http://localhost:3000';
const TIMEOUT_MS = 120000;
const INTENSITIES = ['mild', 'medium', 'savage'];

async function getBackendUrl() {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  return (backendUrl || DEFAULT_BACKEND).replace(/\/$/, '');
}

/** A random, anonymous ID for this install (used only for the server's per-install daily limit). */
async function getInstallId() {
  const { installId } = await chrome.storage.local.get('installId');
  if (installId) return installId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ installId: id });
  return id;
}

function targetPath(page) {
  return page.type === 'repo' ? `/repo/${encodeURIComponent(page.owner)}/${encodeURIComponent(page.name)}` : `/profile/${encodeURIComponent(page.username)}`;
}

async function callBackend(path, method = 'GET') {
  const backend = await getBackendUrl();
  let res;
  try {
    res = await fetch(backend + path, { method, headers: { 'X-Install-Id': await getInstallId() }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err && err.name === 'TimeoutError';
    const local = /localhost|127\.0\.0\.1/.test(backend);
    return {
      ok: false,
      error: {
        code: timedOut ? 'TIMEOUT' : 'BACKEND_UNREACHABLE',
        message: timedOut
          ? 'The backend took too long to answer. Try again in a moment.'
          : local
            ? `Can't reach the Git Autopsy backend at ${backend}. Start it by running "npm start" in the project folder.`
            : `Can't reach the Git Autopsy server (${backend}). Check your internet connection and try again.`,
      },
    };
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: `The backend sent an unreadable answer (HTTP ${res.status}).` } };
  }
  if (!res.ok) return { ok: false, error: (body && body.error) || { code: 'HTTP_' + res.status, message: `Backend error (HTTP ${res.status}).` } };
  return { ok: true, data: body };
}

function runAutopsy(page, fresh, intensity) {
  const params = new URLSearchParams();
  params.set('intensity', INTENSITIES.includes(intensity) ? intensity : 'medium');
  if (fresh) params.set('fresh', '1');
  return callBackend(`${targetPath(page)}?${params}`);
}

function deleteCached(page) {
  return callBackend(`/cache${targetPath(page)}`, 'DELETE');
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return false;
  if (msg.type === 'GIT_AUTOPSY_RUN') {
    runAutopsy(msg.page, msg.fresh, msg.intensity).then(sendResponse);
    return true; // keep the message channel open for the async answer
  }
  if (msg.type === 'GIT_AUTOPSY_DELETE') {
    deleteCached(msg.page).then(sendResponse);
    return true;
  }
  return false;
});
