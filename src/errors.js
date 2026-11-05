// One error type for everything the panel should show as a clear message.
// `code` is a short machine name, `status` is the HTTP status our backend returns,
// `message` is the plain-English text shown to the user.

class AutopsyError extends Error {
  constructor(code, status, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const Errors = {
  notFound: (what) =>
    new AutopsyError('NOT_FOUND', 404, `${what} was not found. It may be private, deleted, or misspelled.`),
  rateLimited: (resetAt) =>
    new AutopsyError(
      'RATE_LIMITED',
      429,
      `GitHub rate limit reached.${resetAt ? ` It resets at ${resetAt.toISOString()}.` : ''} Add a GITHUB_TOKEN to .env for a much higher limit.`,
      { resetAt: resetAt ? resetAt.toISOString() : null }
    ),
  network: (detail) =>
    new AutopsyError('NETWORK_ERROR', 502, `Could not reach GitHub (${detail}). Check your internet connection.`),
  badInput: (detail) => new AutopsyError('BAD_INPUT', 400, detail),
  githubAuth: () =>
    new AutopsyError('GITHUB_AUTH', 502, "GitHub rejected the server's credentials (the token is expired or revoked). The owner needs to set a new GITHUB_TOKEN."),
  dailyLimit: (limit) =>
    new AutopsyError('DAILY_LIMIT', 429, `You've reached today's limit of ${limit} analyses. It resets at midnight UTC. Thanks for keeping this free for everyone!`, { limit }),
  github: (status, detail) =>
    new AutopsyError('GITHUB_ERROR', 502, `GitHub returned an unexpected error (${status}): ${detail}`),
};

module.exports = { AutopsyError, Errors };
