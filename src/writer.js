// WRITER: turns verified facts into { summary, roast }.
//   Summary: one AI call (summary model), validated: correct shape, no invented numbers, real file names.
//   Roast:   src/comedy/comedyWriter.js (angles -> evidence cards -> two-pass AI -> automatic checks).
//            The comedy model only ever sees the evidence cards (not the bio or name), which keeps it on the LIMIT.
// No AI configured, or it keeps failing -> offline templates (still built only from facts).

const { offlineSummary } = require('./offlineWriter');
const { writeRoast } = require('./comedy/comedyWriter');
const { extractNumbers, parseJson } = require('./textUtil');

const MAX_ATTEMPTS = 3;

const SCHEMAS = {
  repo: {
    fields: { what_it_does: 'string', how_to_run: 'string', read_first: 'array' },
    example: `{
  "summary": {
    "what_it_does": "1-3 plain sentences: what this project is and does.",
    "how_to_run": "1-3 sentences with the actual commands, taken from the README commands or npm scripts. If none are in the evidence, say the README gives no run instructions.",
    "read_first": ["README.md", "package.json", "src/index.js"]
  }
}`,
  },
  profile: {
    fields: { what_they_build: 'string', main_languages: 'string', notable_repos: 'array' },
    example: `{
  "summary": {
    "what_they_build": "1-3 plain sentences: what kind of projects this developer/organization mostly builds.",
    "main_languages": "Short list of their main languages, from the evidence.",
    "notable_repos": ["repo-name: one short phrase about it", "another-repo: ..."]
  }
}`,
  },
};

function buildPrompt(result) {
  const schema = SCHEMAS[result.kind];
  const system = [
    'You are Git Autopsy: an accurate technical writer who summarizes a GitHub ' + (result.kind === 'repo' ? 'repository' : 'profile') + ' for a student.',
    'STRICT RULES:',
    '- Use ONLY the facts in the EVIDENCE section. Never invent numbers, files, dates, names or details.',
    '- Every number you write must appear exactly in the evidence (copy it, do not round or estimate).',
    '- Plain, simple and technically correct. No jokes.',
    '- Reply with JSON only, exactly this shape:',
    schema.example,
  ].join('\n');

  const lines = result.evidence.map((e) => `- ${e.label}: ${e.value}`);
  let user = `TARGET: ${result.target} (${result.kind})\n\nEVIDENCE:\n${lines.join('\n')}`;
  if (result.context && result.context.readmeExcerpt) user += `\n\nREADME EXCERPT:\n"""\n${result.context.readmeExcerpt}\n"""`;
  return { system, user };
}

function evidenceText(result) {
  return result.evidence.map((e) => `${e.label}: ${e.value}`).join('\n') + '\n' + ((result.context && result.context.readmeExcerpt) || '');
}

/** Problems with a summary object (empty list = valid). */
function validateSummary(s, result) {
  const problems = [];
  const schema = SCHEMAS[result.kind];
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ['"summary" must be an object.'];
  for (const [field, type] of Object.entries(schema.fields)) {
    const v = s[field];
    if (type === 'string' && (typeof v !== 'string' || !v.trim())) problems.push(`summary.${field} must be a non-empty string.`);
    if (type === 'string' && typeof v === 'string' && v.length > 700) problems.push(`summary.${field} is too long (max 700 chars).`);
    if (type === 'array' && (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x.trim()))) problems.push(`summary.${field} must be an array of strings.`);
  }
  if (problems.length) return problems;

  const ev = evidenceText(result);
  const allowed = new Set([0, 1, ...extractNumbers(ev)]);
  const invented = [...new Set(extractNumbers(Object.values(s).flat().join('\n')).filter((n) => !allowed.has(n)))];
  if (invented.length) problems.push(`These numbers are not in the evidence, remove or correct them: ${invented.join(', ')}.`);
  if (result.kind === 'repo' && Array.isArray(s.read_first)) {
    const fake = s.read_first.filter((f) => !ev.includes(f.trim()));
    if (fake.length) problems.push(`summary.read_first contains files not in the evidence: ${fake.join(', ')}. Use only file paths listed in the evidence.`);
  }
  return problems;
}

/**
 * Validates a full { summary, roast: [strings] } output (summary rules + roast shape + numbers).
 * Used by the smoke test to check final results.
 */
function validateOutput(output, result) {
  if (!output || typeof output !== 'object') return ['Output is not a JSON object.'];
  const problems = validateSummary(output.summary, result);
  const roast = output.roast;
  if (!Array.isArray(roast) || roast.length < 3 || roast.length > 7) problems.push('"roast" must be an array of 3 to 7 strings.');
  else if (roast.some((l) => typeof l !== 'string' || l.trim().length < 8 || l.length > 300)) problems.push('Each roast line must be a string of 8 to 300 characters.');
  else {
    const allowed = new Set([0, 1, 5, ...extractNumbers(evidenceText(result))]);
    const invented = [...new Set(extractNumbers(roast.join('\n')).filter((n) => !allowed.has(n)))];
    if (invented.length) problems.push(`These numbers are not in the evidence, remove or correct them: ${invented.join(', ')}.`);
  }
  return problems;
}

function cleanSummary(s, kind) {
  const out = {};
  for (const field of Object.keys(SCHEMAS[kind].fields)) {
    const v = s[field];
    out[field] = Array.isArray(v) ? v.map((x) => x.trim()).slice(0, 6) : v.trim();
  }
  return out;
}

/** @returns { summary, by, attempts, warnings } */
async function writeSummary(result, provider) {
  if (!provider) return { summary: offlineSummary(result), by: 'offline templates', attempts: 0, warnings: [] };
  const { system, user } = buildPrompt(result);
  const warnings = [];
  let feedback = '';
  let reason = `AI summary failed validation ${MAX_ATTEMPTS} times`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text;
    try {
      text = await provider.generate(system, user + feedback, { temperature: 0.3 });
    } catch (err) {
      warnings.push(`summary: AI call failed (attempt ${attempt}): ${err.message}`);
      reason = err.quota ? 'AI quota exhausted' : 'AI unavailable';
      if (err.quota) break; // out of quota: retrying can't help
      continue;
    }
    let parsed;
    try {
      parsed = parseJson(text);
    } catch {
      warnings.push(`summary attempt ${attempt}: AI did not return valid JSON.`);
      feedback = '\n\nYour previous reply was not valid JSON. Reply with JSON only, in the exact shape given.';
      continue;
    }
    const problems = validateSummary(parsed && parsed.summary, result);
    if (!problems.length) return { summary: cleanSummary(parsed.summary, result.kind), by: `${provider.name} (${provider.model})`, attempts: attempt, warnings };
    warnings.push(`summary attempt ${attempt} rejected: ${problems.join(' ')}`);
    feedback = `\n\nYour previous reply was rejected for these reasons:\n- ${problems.join('\n- ')}\nFix them and reply again with JSON only.`;
  }
  return { summary: offlineSummary(result), by: `offline templates (${reason})`, attempts: MAX_ATTEMPTS, warnings };
}

/**
 * @param result     output of computeRepoFacts / computeProfileFacts
 * @param providers  { summary, humor } from aiProvider.getProvider() (null = offline)
 * @param options    { intensity: 'mild'|'medium'|'savage', calibration }
 * @returns { summary, roast: [strings], jokes: [{text, cards}], cards, generatedBy, warnings }
 */
async function write(result, providers = {}, options = {}) {
  const [s, r] = await Promise.all([writeSummary(result, providers.summary || null), writeRoast(result, providers.humor || null, options)]);
  return {
    summary: s.summary,
    roast: r.jokes.map((j) => j.text),
    jokes: r.jokes,
    cards: r.cards,
    generatedBy: s.by === r.generatedBy ? s.by : `summary: ${s.by} · roast: ${r.generatedBy}`,
    warnings: [...s.warnings, ...r.warnings],
    debug: r.debug,
  };
}

module.exports = { write, writeSummary, buildPrompt, validateSummary, validateOutput, extractNumbers, parseJson, SCHEMAS };
