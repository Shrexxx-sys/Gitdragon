// Small helpers shared by the facts engine. All pure functions (no network, no randomness).

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a, b) {
  return Math.floor(Math.abs(new Date(b) - new Date(a)) / DAY_MS);
}

/** "2021-03-04T10:00:00Z" -> "2021-03-04" */
function day(iso) {
  return iso ? String(iso).slice(0, 10) : null;
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Human readable duration from days: 400 -> "1 year 1 month" */
function humanDays(days) {
  if (days == null) return 'unknown';
  if (days < 1) return 'less than a day';
  if (days < 31) return `${days} day${days === 1 ? '' : 's'}`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.join(' ') || `${days} days`;
}

/**
 * Largest gap between consecutive dates. Returns { days, from, to } or null.
 * `dates` can be in any order.
 */
function largestGap(dates) {
  const sorted = dates.filter(Boolean).map((d) => new Date(d)).sort((a, b) => a - b);
  let best = null;
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1], sorted[i]);
    if (!best || days > best.days) best = { days, from: day(sorted[i - 1].toISOString()), to: day(sorted[i].toISOString()) };
  }
  return best;
}

function gapsInDays(dates) {
  const sorted = dates.filter(Boolean).map((d) => new Date(d)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1], sorted[i]));
  return gaps;
}

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/** Builds one evidence row: a fact the user can check. */
function ev(key, label, value, source) {
  return { key, label, value: value == null || value === '' ? 'none' : String(value), source };
}

function plural(n, word, pluralWord) {
  return `${n} ${n === 1 ? word : pluralWord || word + 's'}`;
}

module.exports = { DAY_MS, daysBetween, day, median, humanDays, largestGap, gapsInDays, pct, ev, plural };
