// Loads tone examples from calibration.md (project root).
// Lines starting with "- " under any heading are examples. "PLACEHOLDER:" markers are stripped,
// but we remember that the file still contains placeholders so the backend can warn about it.

const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, '..', '..', 'calibration.md');
const MAX_EXAMPLES = 15;

function loadCalibration(file = process.env.CALIBRATION_FILE || DEFAULT_PATH) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { examples: [], placeholder: true, missing: true };
  }
  const lines = text
    .split(/\r?\n/)
    .filter((l) => /^\s*-\s+\S/.test(l))
    .map((l) => l.replace(/^\s*-\s+/, '').trim())
    .filter((l) => !l.startsWith('`')); // skip the "how to edit" bullets that describe the format
  const placeholder = lines.some((l) => /^PLACEHOLDER:/i.test(l));
  const examples = lines
    .map((l) => l.replace(/^PLACEHOLDER:\s*replace with your own\.?\s*/i, '').replace(/^PLACEHOLDER:\s*/i, '').trim())
    .filter((l) => l.length >= 20 && !/^(one joke per line|delete the|keep them about)/i.test(l))
    .slice(0, MAX_EXAMPLES);
  return { examples, placeholder, missing: false };
}

module.exports = { loadCalibration };
