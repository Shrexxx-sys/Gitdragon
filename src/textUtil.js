// Small text helpers shared by the writer and the comedy checks.

/** Finds standalone numbers in text: "1,234 stars", "70%", "2021-03-04" -> [1234, 70, 2021, 3, 4]. Ignores "v2", "Python3", "3D". */
function extractNumbers(text) {
  const out = [];
  const re = /(?<![\w.])\d+(?:,\d{3})*(?:\.\d+)?(?![\w])/g;
  for (const m of String(text).match(re) || []) out.push(Number(m.replace(/,/g, '')));
  return out;
}

/** Parses JSON from a model reply. Accepts ```json fences and extra text around the object. */
function parseJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw err;
  }
}

module.exports = { extractNumbers, parseJson };
