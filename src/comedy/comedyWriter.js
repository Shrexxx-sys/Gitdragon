// COMEDY WRITER: evidence cards -> 3-5 roast lines.
//   Pass 1 (writer, hot):  10 candidate jokes built on the cards.
//   Pass 2 (critic, cool): deletes generic / unsupported / repetitive / LIMIT-breaking jokes,
//                          keeps the best 3-5 and sharpens them.
//   Then our automatic checks run again on the critic's output (they have the final say).
//   No AI, or AI keeps failing -> offline templates (still fact-based, still checked).

const { detectAngles } = require('./angles');
const { checkJokes, BANNED_PHRASES } = require('./checks');
const { offlineJokes } = require('./offlineComedy');
const { loadCalibration } = require('./calibration');
const { parseJson } = require('../textUtil');

const INTENSITY = {
  mild: 'MILD: dry, light teasing. Deadpan but gentle; no harsh words.',
  medium: 'MEDIUM: deadpan and dark. Death-certificate energy for dead projects, absurd precision for active ones.',
  savage: 'SAVAGE: merciless and cutting about the code, repo and habits. Pitch-black humor about abandoned projects and bad decisions is welcome. Still never about the person.',
};
const INTENSITIES = Object.keys(INTENSITY);

const LIMIT_RULE =
  "LIMIT (non-negotiable): roast ONLY public code, repo and habit data. Never joke about the person's identity, appearance, health, mental health, family, nationality, age, gender, relationships or personal life, and don't mock their username.";

function cardsBlock(cards) {
  return cards
    .map((c) => `${c.id} (angle: ${c.angle}): ${c.fact}${c.exact_quote ? ` | exact quote: "${c.exact_quote}"` : ''} | must mention at least one of: ${c.details.map((d) => `[${d}]`).join(' ')}`)
    .join('\n');
}

function writerPrompt(result, cards, intensity, calibration) {
  const what = result.kind === 'repo' ? 'repository' : 'profile';
  const system = [
    `You write roast lines for "Git Autopsy", which performs a deadpan autopsy on a GitHub ${what}.`,
    '',
    'STYLE',
    '- Dark, deadpan, situational. Structure: a specific fact, then an unexpected twist at the end.',
    '- One or two sentences, max 200 characters.',
    '- "Death certificate" energy for abandoned or dead projects; absurd precision for active ones.',
    `- Intensity: ${INTENSITY[intensity]}`,
    '',
    'HARD RULES',
    '1. Every joke is built on at least one EVIDENCE CARD and includes that card\'s specific detail: an exact name, number, date or quoted commit message. List the card ids you used.',
    '2. Use only facts from the cards. Never invent numbers, files, dates or events. Copy numbers and quotes exactly.',
    `3. ${LIMIT_RULE}`,
    `4. BANNED: lines that could fit any repo; comparisons to famous people; explaining the joke; starting with "Ah" or "Well"; more than one emoji; these phrases: ${BANNED_PHRASES.slice(0, 16).map((p) => `"${p}"`).join(', ')}.`,
    '5. Every joke opens with different words and uses a different structure. Use at least 5 different cards across the 10 jokes, strongest cards (lowest ids) first.',
  ];
  if (calibration.examples.length) {
    system.push('', 'TONE EXAMPLES (rhythm and voice only; their facts are NOT about this target, never reuse them):');
    for (const e of calibration.examples) system.push(`- ${e}`);
  }
  system.push('', 'Reply with JSON only, exactly: {"candidates":[{"text":"...","cards":["C1"]}, ...]} with exactly 10 candidates.');
  const user = `TARGET: ${result.target} (${what})\n\nEVIDENCE CARDS:\n${cardsBlock(cards)}`;
  return { system: system.join('\n'), user };
}

function criticPrompt(result, cards, candidates, checked, intensity) {
  const what = result.kind === 'repo' ? 'repository' : 'profile';
  const system = [
    `You are the head writer and a ruthless editor for "Git Autopsy" (deadpan roasts of a GitHub ${what}).`,
    'You get candidate roast lines plus the evidence cards they must be built on.',
    '',
    'DELETE every candidate that:',
    '- is generic (could be said about any repo or profile), or lacks a specific detail from its card',
    '- states anything not on the cards, or changes a number, name, date or quote',
    '- repeats the structure or opening words of another candidate',
    `- breaks the LIMIT. ${LIMIT_RULE}`,
    '- uses a cliché, compares to a famous person, explains the joke, or starts with "Ah" or "Well"',
    '- has an AUTO-CHECK problem listed next to it (unless your rewrite fixes it)',
    '',
    'KEEP the best 3 to 5. SHARPEN them: cut filler, land the twist at the very end, keep every fact exact. Max two sentences each. Every kept joke must start with different words.',
    `Intensity: ${INTENSITY[intensity]}`,
    '',
    'Reply with JSON only: {"roast":[{"text":"...","cards":["C1"]}],"rejected":[{"candidate":1,"reason":"generic"}]}',
  ].join('\n');
  const list = candidates
    .map((c, i) => {
      const probs = checked.results[i].problems;
      return `${i + 1}. ${c.text} [cards: ${(c.cards || []).join(', ') || 'none'}]${probs.length ? `  AUTO-CHECK: ${probs.join('; ')}` : ''}`;
    })
    .join('\n');
  const user = `TARGET: ${result.target} (${what})\n\nEVIDENCE CARDS:\n${cardsBlock(cards)}\n\nCANDIDATES:\n${list}`;
  return { system, user };
}

/** Normalizes a model's joke list into [{ text, cards }]. */
function normalizeJokes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((j) => (typeof j === 'string' ? { text: j, cards: [] } : j))
    .filter((j) => j && typeof j.text === 'string' && j.text.trim())
    .map((j) => ({ text: j.text.trim(), cards: Array.isArray(j.cards) ? j.cards.map(String) : typeof j.cards === 'string' ? [j.cards] : [] }));
}

/** Keeps only jokes with zero problems (checkJokes already flags later duplicates of an opening). */
function survivors(jokes, cards, result) {
  const checked = checkJokes(jokes, cards, result);
  return { good: checked.results.filter((r) => !r.problems.length).map((r) => r.joke), checked };
}

/**
 * @returns { jokes:[{text,cards}], cards, generatedBy, warnings, debug }
 */
async function writeRoast(result, provider, { intensity = 'medium', calibration = loadCalibration() } = {}) {
  if (!INTENSITIES.includes(intensity)) intensity = 'medium';
  const cards = detectAngles(result);
  const warnings = [];
  const debug = { candidates: [], criticRejected: [], checkRejected: [] };

  if (!provider) {
    return { jokes: offlineJokes(result, cards, { intensity }), cards, generatedBy: 'offline templates', warnings, debug };
  }

  // ---------- pass 1: 10 candidates ----------
  let candidates = [];
  const wp = writerPrompt(result, cards, intensity, calibration);
  for (let attempt = 1; attempt <= 2 && candidates.length < 5; attempt++) {
    try {
      const reply = await provider.generate(wp.system, wp.user + (attempt > 1 ? '\n\nYour last reply was unusable. Return JSON with exactly 10 candidates.' : ''), { temperature: 1.0 });
      candidates = normalizeJokes(parseJson(reply).candidates);
    } catch (err) {
      warnings.push(`pass 1 attempt ${attempt} failed: ${err.message}`);
      if (err.quota) break; // out of quota: retrying can't help
    }
  }
  debug.candidates = candidates;
  if (candidates.length < 3) {
    warnings.push('pass 1 produced too few candidates; using offline templates');
    return { jokes: offlineJokes(result, cards, { intensity }), cards, generatedBy: 'offline templates (AI pass 1 failed)', warnings, debug };
  }

  // ---------- pass 2: critic ----------
  const preChecked = checkJokes(candidates, cards, result);
  const cp = criticPrompt(result, cards, candidates, preChecked, intensity);
  let best = [];
  let feedback = '';
  for (let attempt = 1; attempt <= 2 && best.length < 3; attempt++) {
    try {
      const reply = parseJson(await provider.generate(cp.system, cp.user + feedback, { temperature: 0.4 }));
      if (Array.isArray(reply.rejected)) debug.criticRejected = reply.rejected;
      const kept = normalizeJokes(reply.roast).slice(0, 5);
      const { good, checked } = survivors(kept, cards, result);
      debug.checkRejected.push(...checked.results.filter((r) => r.problems.length).map((r) => ({ text: r.joke.text, problems: r.problems })));
      if (good.length > best.length) best = good;
      if (best.length < 3) {
        const probs = checked.results.filter((r) => r.problems.length).map((r) => `"${r.joke.text}" -> ${r.problems.join('; ')}`);
        feedback = `\n\nYour last selection failed automatic checks:\n- ${probs.join('\n- ') || 'fewer than 3 jokes'}\nReturn 3 to 5 jokes that pass.`;
      }
    } catch (err) {
      warnings.push(`pass 2 attempt ${attempt} failed: ${err.message}`);
      if (err.quota) break;
    }
  }

  // The critic failed entirely: fall back to the best pre-checked pass-1 candidates.
  if (!best.length) best = survivors(candidates, cards, result).good.slice(0, 5);

  const by = `${provider.name} (${provider.model}), 2-pass`;
  if (best.length >= 3) return { jokes: best, cards, generatedBy: by, warnings, debug };

  const fill = offlineJokes(result, cards, { intensity, exclude: best, max: 3 - best.length });
  warnings.push(`only ${best.length} AI jokes passed the checks; filled with ${fill.length} offline`);
  return { jokes: [...best, ...fill], cards, generatedBy: best.length ? `${by} + offline fill` : 'offline templates (AI jokes failed checks)', warnings, debug };
}

module.exports = { writeRoast, writerPrompt, criticPrompt, INTENSITIES };
