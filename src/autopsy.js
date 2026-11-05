// The full pipeline: collect raw data -> compute facts (plain code) -> write summary + roast.

const { collectRepo } = require('./collectors/repoCollector');
const { collectProfile } = require('./collectors/profileCollector');
const { computeRepoFacts } = require('./facts/repoFacts');
const { computeProfileFacts } = require('./facts/profileFacts');
const { write } = require('./writer');

function packResult(factsResult, written, intensity) {
  return {
    kind: factsResult.kind,
    target: factsResult.target,
    url: factsResult.url,
    summary: written.summary,
    roast: written.roast, // plain strings (kept for simple clients)
    jokes: written.jokes, // [{ text, cards: ['C1'] }] -> "Why this joke?" in the panel
    cards: written.cards, // evidence cards: { id, angle, fact, number, source_url, exact_quote, ... }
    intensity,
    evidence: factsResult.evidence,
    notices: factsResult.notices,
    generatedBy: written.generatedBy,
    aiWarnings: written.warnings,
    analysedAt: new Date().toISOString(),
  };
}

/** Accepts { providers: { summary, humor } } or the older single { provider } (used for both). */
function pickProviders(opts) {
  if (opts.providers) return opts.providers;
  return { summary: opts.provider || null, humor: opts.provider || null };
}

async function repoAutopsy(opts) {
  const { gh, owner, name, now = new Date(), intensity = 'medium', calibration } = opts;
  const raw = await collectRepo(gh, owner, name);
  const facts = computeRepoFacts(raw, now);
  return packResult(facts, await write(facts, pickProviders(opts), { intensity, calibration }), intensity);
}

async function profileAutopsy(opts) {
  const { gh, username, now = new Date(), intensity = 'medium', calibration } = opts;
  const raw = await collectProfile(gh, username);
  const facts = computeProfileFacts(raw, now);
  return packResult(facts, await write(facts, pickProviders(opts), { intensity, calibration }), intensity);
}

module.exports = { repoAutopsy, profileAutopsy, computeRepoFacts, computeProfileFacts };
