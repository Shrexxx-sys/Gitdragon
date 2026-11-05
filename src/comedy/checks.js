// AUTOMATIC CHECKS for generated jokes (AI or offline). Plain code, no AI.
// A joke passes only if:
//   1. it cites at least one real evidence card
//   2. it contains a specific detail from a cited card (exact name, number, date or quote)
//   3. it contains no banned phrase / cliché, doesn't start with "Ah" or "Well", doesn't explain itself
//   4. it doesn't touch the LIMIT topics (identity, appearance, health, mental health, family, nationality, personal life)
//   5. it's short (max 2 sentences, max 260 characters) and has at most 1 emoji
//   6. every number in it exists in the evidence
//   7. no two jokes in the same set share an opening pattern

const { extractNumbers } = require('../textUtil');

const BANNED_PHRASES = [
  'coding journey', 'works on my machine', 'spaghetti code', 'stack overflow', 'stackoverflow', "it's not a bug", 'not a bug, it',
  "it's a feature", '10x developer', '10x engineer', 'rockstar', 'code ninja', 'touch grass', 'touched grass', 'git gud', 'skill issue',
  'rubber duck', "we've all been there", 'no judgment', 'no judgement', 'bless your heart', 'chatgpt', 'copy-paste', 'copy paste',
  'living rent free', 'main character', 'the struggle is real', 'hold my beer', 'said no one ever', 'in this economy',
  'it is what it is', 'git blame yourself',
];
// Explaining the joke.
const EXPLAINERS = ['get it?', 'get it,', 'the joke is', 'pun intended', 'see what i did', 'that was a joke', 'just kidding', 'jk,', '(joke)'];
// Comparing to famous people (allowed only if the name is in the evidence, e.g. roasting torvalds/linux itself).
const FAMOUS = ['linus', 'torvalds', 'elon', 'musk', 'zuckerberg', 'bill gates', 'steve jobs', 'jeff bezos', 'bezos', 'einstein', 'shakespeare', 'tolkien', 'gandalf', 'yoda', 'darth', 'tony stark', 'batman', 'sherlock', 'picasso', 'mozart', 'gordon ramsay', 'kanye', 'taylor swift', 'beyonce'];

// LIMIT topics: never joke about the person. Word-boundary regexes.
const LIMIT_TOPICS = [
  ['appearance', /\b(ugly|fat|bald|hairline|outfit|selfie|looks like (you|he|she|they)|your face|his face|her face|their face|avatar|profile pic(ture)?|neckbeard|haircut|overweight)\b/i],
  ['health', /\b(health|sick|illness|disease|cancer|diabet\w*|covid|hospital|medication|meds|insomnia|insomniac|burnout|burned out|burnt out|caffeine addict\w*|chronic|disab\w*)\b/i],
  ['mental health', /\b(depress\w*|anxiety|anxious|adhd|autis\w*|bipolar|ocd|therapy|therapist|mental(ly)?|psych(o|otic|iatr\w*)|suicid\w*|breakdown|crazy|insane|lunatic|deranged|unhinged|cry(ing)? (yourself|himself|herself|themselves))\b/i],
  ['family', /\b(wife|husband|girlfriend|boyfriend|spouse|mom|mother|dad|father|parents|kids|children|son|daughter|family|grandma|grandpa|divorce\w*|marri(age|ed)|baby|babies|sibling)\b/i],
  ['personal life', /\b(dating|tinder|virgin|no friends|social life|love life|basement|get a life|your life|his life|her life|their life|lonely life|unemploy\w*|jobless|salary|rent money)\b/i],
  ['identity', /\b(gay|lesbian|queer|trans(gender)?|gender|racial|racist|ethnic\w*|religio\w*|christian|muslim|hindu|jewish|atheist|boomer|zoomer|millennial|old man|old woman|teenager|age(d)? \d+)\b/i],
  ['nationality', /\b(nationality|accent|immigrant|indian|american|chinese|russian|british|german|french|japanese|korean|pakistani|nigerian|brazilian|mexican|canadian|european|asian|african)\b/i],
];

const EMOJI = /\p{Extended_Pictographic}/gu;

/** Normalizes the start of a joke into a "pattern": "Last commit on 2014-02-03..." -> "last commit". */
function openingPattern(text) {
  const words = String(text)
    .toLowerCase()
    .replace(/"[^"]*"/g, ' Q ')
    .replace(/\d[\d,.:-]*/g, ' # ')
    .replace(/[^a-z#q ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).join(' ');
}

function countSentences(text) {
  const withoutQuotes = String(text).replace(/"[^"]*"/g, 'Q').replace(/\d+\.\d+/g, '#').replace(/\b(e\.g|i\.e|vs|etc)\./gi, 'x');
  return (withoutQuotes.match(/[.!?]+(\s|$)/g) || []).length || 1;
}

function mentionsDetail(text, details) {
  const t = String(text).toLowerCase();
  return details.some((d) => {
    const s = String(d).toLowerCase().trim();
    if (!s) return false;
    if (t.includes(s)) return true;
    // numbers may be written with or without thousands separators
    if (/^\d+$/.test(s) && t.replace(/(\d),(\d{3})/g, '$1$2').includes(s)) return true;
    return false;
  });
}

/**
 * Checks ONE joke. Returns a list of problems (empty = passes).
 * @param joke   { text, cards: ['C1', ...] }
 * @param cards  evidence cards from detectAngles
 * @param allowedNumbers Set of numbers that appear in the evidence
 */
function checkJoke(joke, cards, allowedNumbers) {
  const problems = [];
  const text = String((joke && joke.text) || '').trim();
  if (!text) return ['empty joke'];
  const lower = text.toLowerCase();
  const cited = (Array.isArray(joke.cards) ? joke.cards : []).map((id) => cards.find((c) => c.id === id)).filter(Boolean);

  if (!cited.length) problems.push('does not cite a valid evidence card');
  else if (!mentionsDetail(text, cited.flatMap((c) => c.details))) problems.push(`does not include a specific detail from ${cited.map((c) => c.id).join('/')} (needs an exact name, number, date or quote)`);

  for (const p of BANNED_PHRASES) if (lower.includes(p)) problems.push(`banned phrase "${p}"`);
  for (const p of EXPLAINERS) if (lower.includes(p)) problems.push(`explains the joke ("${p}")`);
  if (/^(ah|well)\b/i.test(text)) problems.push('starts with "Ah" or "Well"');

  const allDetails = cards.flatMap((c) => c.details).join(' ').toLowerCase();
  for (const name of FAMOUS) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text) && !allDetails.includes(name)) problems.push(`compares to a famous person ("${name}")`);
  }
  for (const [topic, re] of LIMIT_TOPICS) {
    const m = text.match(re);
    // a word from the evidence itself (e.g. a repo called "family-tree") is fine
    if (m && !allDetails.includes(m[0].toLowerCase())) problems.push(`touches a LIMIT topic: ${topic} ("${m[0]}")`);
  }

  if ((text.match(EMOJI) || []).length > 1) problems.push('emoji spam');
  if (text.length > 260) problems.push('too long (max 260 characters)');
  if (countSentences(text) > 2) problems.push('more than two sentences');

  if (allowedNumbers) {
    const invented = [...new Set(extractNumbers(text).filter((n) => !allowedNumbers.has(n)))];
    if (invented.length) problems.push(`numbers not in the evidence: ${invented.join(', ')}`);
  }
  return problems;
}

/** Numbers that jokes may use: everything in the evidence rows and cards, plus 0, 1 and the "1 AM to 5 AM" window. */
function allowedNumbersFor(result, cards) {
  const text = result.evidence.map((e) => `${e.label}: ${e.value}`).join('\n') + '\n' + cards.map((c) => c.fact).join('\n');
  return new Set([0, 1, 5, ...extractNumbers(text)]);
}

/**
 * Checks a whole set of jokes. Returns { ok, results: [{ joke, problems }], setProblems }.
 * setProblems = problems that involve more than one joke (shared openings).
 */
function checkJokes(jokes, cards, result) {
  const allowed = allowedNumbersFor(result, cards);
  const results = jokes.map((joke) => ({ joke, problems: checkJoke(joke, cards, allowed) }));
  const seen = new Map();
  jokes.forEach((joke, i) => {
    const pattern = openingPattern(joke.text);
    if (seen.has(pattern)) results[i].problems.push(`same opening pattern as joke ${seen.get(pattern) + 1} ("${pattern}")`);
    else seen.set(pattern, i);
  });
  return { ok: results.every((r) => !r.problems.length), results };
}

module.exports = { checkJoke, checkJokes, openingPattern, allowedNumbersFor, BANNED_PHRASES, LIMIT_TOPICS, countSentences, mentionsDetail };
