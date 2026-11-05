// WRITER: turns verified facts into { summary, roast }.
// 1. Builds a prompt that contains ONLY our evidence.
// 2. Asks the AI for strict JSON.
// 3. Validates the JSON (shape + "every number must appear in the evidence").
// 4. Retries with the list of problems if validation fails.
// 5. If there is no AI (or it keeps failing), uses the offline template writer.

const { offlineWrite } = require('./offlineWriter');

const MAX_ATTEMPTS = 3;

const SCHEMAS = {
  repo: {
    fields: { what_it_does: 'string', how_to_run: 'string', read_first: 'array' },
    example: `{
  "summary": {
    "what_it_does": "1-3 plain sentences: what this project is and does.",
    "how_to_run": "1-3 sentences with the actual commands, taken from the README commands or npm scripts. If none are in the evidence, say the README gives no run instructions.",
    "read_first": ["README.md", "package.json", "src/index.js"]
  },
  "roast": ["line 1", "line 2", "line 3", "line 4", "line 5"]
}`,
  },
  profile: {
    fields: { what_they_build: 'string', main_languages: 'string', notable_repos: 'array' },
    example: `{
  "summary": {
    "what_they_build": "1-3 plain sentences: what kind of projects this developer/organization mostly builds.",
    "main_languages": "Short list of their main languages, from the evidence.",
    "notable_repos": ["repo-name: one short phrase about it", "another-repo: ..."]
  },
  "roast": ["line 1", "line 2", "line 3", "line 4", "line 5"]
}`,
  },
};

function buildPrompt(result) {
  const schema = SCHEMAS[result.kind];
  const system = [
    'You are Git Autopsy: a witty but accurate code reviewer who writes a short summary and a roast of a GitHub ' +
      (result.kind === 'repo' ? 'repository' : 'profile') + '.',
    'STRICT RULES:',
    '- Use ONLY the facts in the EVIDENCE section. Never invent numbers, files, dates, names or details.',
    '- Every number you write must appear exactly in the evidence (copy it, do not round or estimate).',
    '- The summary must be plain, simple and technically correct. No jokes in the summary.',
    '- The roast is 4 to 6 short lines (max 220 characters each). Each line must be built on a specific fact from the evidence.',
    '- Roast the code and habits, never the person\'s identity, looks, gender, race, nationality or anything outside the evidence. Keep it playful, not cruel. No profanity.',
    '- Reply with JSON only, exactly this shape:',
    schema.example,
  ].join('\n');

  const lines = result.evidence.map((e) => `- ${e.label}: ${e.value}`);
  let user = `TARGET: ${result.target} (${result.kind})\n\nEVIDENCE:\n${lines.join('\n')}`;
  if (result.context && result.context.readmeExcerpt) {
    user += `\n\nREADME EXCERPT (for the summary only):\n"""\n${result.context.readmeExcerpt}\n"""`;
  }
  return { system, user };
}

/** Finds standalone numbers in text: "1,234 stars", "70%", "2021-03-04" -> [1234, 70, 2021, 3, 4]. Ignores "v2", "Python3", "3D". */
function extractNumbers(text) {
  const out = [];
  const re = /(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?(?![\w])/g;
  for (const m of String(text).match(re) || []) out.push(Number(m.replace(/,/g, '')));
  return out;
}

function parseJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

/** Returns a list of problems (empty list = valid). */
function validateOutput(output, result) {
  const problems = [];
  const schema = SCHEMAS[result.kind];
  if (!output || typeof output !== 'object') return ['Output is not a JSON object.'];

  const s = output.summary;
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    problems.push('"summary" must be an object.');
  } else {
    for (const [field, type] of Object.entries(schema.fields)) {
      const v = s[field];
      if (type === 'string' && (typeof v !== 'string' || !v.trim())) problems.push(`summary.${field} must be a non-empty string.`);
      if (type === 'string' && typeof v === 'string' && v.length > 700) problems.push(`summary.${field} is too long (max 700 chars).`);
      if (type === 'array' && (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x.trim()))) problems.push(`summary.${field} must be an array of strings.`);
    }
  }

  const roast = output.roast;
  if (!Array.isArray(roast) || roast.length < 3 || roast.length > 7) problems.push('"roast" must be an array of 3 to 7 strings.');
  else if (roast.some((l) => typeof l !== 'string' || l.trim().length < 8 || l.length > 300)) problems.push('Each roast line must be a string of 8 to 300 characters.');

  if (problems.length) return problems;

  // Grounding check: numbers must come from the evidence (0 and 1 are allowed as ordinary words).
  const evidenceText = result.evidence.map((e) => `${e.label}: ${e.value}`).join('\n') + '\n' + ((result.context && result.context.readmeExcerpt) || '');
  const allowed = new Set([0, 1, ...extractNumbers(evidenceText)]);
  const written = [...Object.values(s).flat(), ...roast].join('\n');
  const invented = [...new Set(extractNumbers(written).filter((n) => !allowed.has(n)))];
  if (invented.length) problems.push(`These numbers are not in the evidence, remove or correct them: ${invented.join(', ')}.`);

  // read_first files must be real files from the evidence.
  if (result.kind === 'repo' && Array.isArray(s.read_first)) {
    const fake = s.read_first.filter((f) => !evidenceText.includes(f.trim()));
    if (fake.length) problems.push(`summary.read_first contains files not in the evidence: ${fake.join(', ')}. Use only file paths listed in the evidence.`);
  }
  return problems;
}

function clean(output, kind) {
  const summary = {};
  for (const field of Object.keys(SCHEMAS[kind].fields)) {
    const v = output.summary[field];
    summary[field] = Array.isArray(v) ? v.map((x) => x.trim()).slice(0, 6) : v.trim();
  }
  return { summary, roast: output.roast.map((l) => l.trim()) };
}

/**
 * @param result   output of computeRepoFacts / computeProfileFacts
 * @param provider from aiProvider.getProvider() (null = offline)
 * @returns { summary, roast, generatedBy, attempts, warnings }
 */
async function write(result, provider) {
  if (!provider) {
    return { ...offlineWrite(result), generatedBy: 'offline templates (no AI configured)', attempts: 0, warnings: [] };
  }

  const { system, user } = buildPrompt(result);
  const warnings = [];
  let feedback = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let text;
    try {
      text = await provider.generate(system, user + feedback);
    } catch (err) {
      warnings.push(`AI call failed (attempt ${attempt}): ${err.message}`);
      continue;
    }
    let parsed;
    try {
      parsed = parseJson(text);
    } catch {
      warnings.push(`Attempt ${attempt}: AI did not return valid JSON.`);
      feedback = '\n\nYour previous reply was not valid JSON. Reply with JSON only, in the exact shape given.';
      continue;
    }
    const problems = validateOutput(parsed, result);
    if (!problems.length) {
      return { ...clean(parsed, result.kind), generatedBy: `${provider.name} (${provider.model})`, attempts: attempt, warnings };
    }
    warnings.push(`Attempt ${attempt} rejected: ${problems.join(' ')}`);
    feedback = `\n\nYour previous reply was rejected for these reasons:\n- ${problems.join('\n- ')}\nFix them and reply again with JSON only.`;
  }

  return {
    ...offlineWrite(result),
    generatedBy: `offline templates (AI output failed validation ${MAX_ATTEMPTS} times)`,
    attempts: MAX_ATTEMPTS,
    warnings,
  };
}

module.exports = { write, buildPrompt, validateOutput, extractNumbers, parseJson, SCHEMAS };
