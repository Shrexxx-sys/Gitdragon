// The full pipeline: collect raw data -> compute facts (plain code) -> write summary + roast.

const { collectRepo } = require('./collectors/repoCollector');
const { collectProfile } = require('./collectors/profileCollector');
const { computeRepoFacts } = require('./facts/repoFacts');
const { computeProfileFacts } = require('./facts/profileFacts');
const { write } = require('./writer');

function packResult(factsResult, written) {
  return {
    kind: factsResult.kind,
    target: factsResult.target,
    url: factsResult.url,
    summary: written.summary,
    roast: written.roast,
    evidence: factsResult.evidence,
    notices: factsResult.notices,
    generatedBy: written.generatedBy,
    aiWarnings: written.warnings,
    analysedAt: new Date().toISOString(),
  };
}

async function repoAutopsy({ gh, provider, owner, name, now = new Date() }) {
  const raw = await collectRepo(gh, owner, name);
  const facts = computeRepoFacts(raw, now);
  return packResult(facts, await write(facts, provider));
}

async function profileAutopsy({ gh, provider, username, now = new Date() }) {
  const raw = await collectProfile(gh, username);
  const facts = computeProfileFacts(raw, now);
  return packResult(facts, await write(facts, provider));
}

module.exports = { repoAutopsy, profileAutopsy };
