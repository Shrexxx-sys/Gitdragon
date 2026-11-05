// COMEDY TEST: runs the comedy engine on 15 varied real repos/profiles and writes comedy-report.md
// (every joke next to the evidence card it was built on), plus automatic checks.
//
// Usage:
//   npm run comedy                                   # humor model from .env (or offline templates)
//   npm run comedy -- --models gemini:gemini-3.6-flash,gemini:gemini-3.5-flash-lite   # compare models
//   npm run comedy -- --intensity savage             # one intensity for all (default: rotates mild/medium/savage)
//   npm run comedy -- --targets torvalds/linux,octocat   # your own list
//
// GitHub responses are cached in .cache/ and AI answers in .cache/ai/, so re-runs are free.

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createGithubClient } = require('../src/githubClient');
const { getProvider, createProvider, withDiskCache } = require('../src/aiProvider');
const { collectRepo } = require('../src/collectors/repoCollector');
const { collectProfile } = require('../src/collectors/profileCollector');
const { computeRepoFacts } = require('../src/facts/repoFacts');
const { computeProfileFacts } = require('../src/facts/profileFacts');
const { writeRoast } = require('../src/comedy/comedyWriter');
const { checkJokes } = require('../src/comedy/checks');
const { loadCalibration } = require('../src/comedy/calibration');

// 15 varied, well-known public targets (no random private individuals).
const DEFAULT_TARGETS = [
  ['repo', 'torvalds/linux', 'huge, very active'],
  ['repo', 'expressjs/express', 'active, healthy'],
  ['repo', 'mojombo/grit', 'dead, archived'],
  ['repo', 'octocat/Spoon-Knife', 'tiny, famous'],
  ['repo', 'octocat/Hello-World', 'abandoned since 2012'],
  ['repo', 'diamante-io/test', 'empty, placeholder name'],
  ['repo', 'kelseyhightower/nocode', 'joke repo: no code at all'],
  ['repo', 'sindresorhus/awesome', 'giant README list'],
  ['profile', 'sindresorhus', 'huge (1000+ repos)'],
  ['profile', 'torvalds', 'active, few repos'],
  ['profile', 'pjhyett', 'dead since 2018'],
  ['profile', 'ghost', 'empty account'],
  ['profile', 'octocat', 'tiny, mascot'],
  ['profile', 'defunkt', 'old account, many repos'],
  ['profile', 'github', 'organization'],
];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}

const ROOT = path.join(__dirname, '..');
const cacheDir = process.env.GITHUB_CACHE_DIR || '.cache';
const gh = createGithubClient({ token: process.env.GITHUB_TOKEN || '', cacheDir });
const calibration = loadCalibration();
const INTENSITIES = ['mild', 'medium', 'savage'];

function providersFromArgs() {
  const spec = arg('models');
  if (!spec) {
    const p = getProvider(process.env, 'humor');
    return [{ label: p ? `${p.name}:${p.model}` : 'offline templates', provider: withDiskCache(p, path.join(cacheDir, 'ai')) }];
  }
  return spec.split(',').map((s) => {
    const p = createProvider(s.trim());
    if (!p) throw new Error(`Cannot use "${s}": unknown provider or its API key is missing in .env`);
    return { label: s.trim(), provider: withDiskCache(p, path.join(cacheDir, 'ai')) };
  });
}

function targetsFromArgs() {
  const spec = arg('targets');
  if (!spec) return DEFAULT_TARGETS;
  return spec.split(',').map((t) => [t.includes('/') ? 'repo' : 'profile', t.trim(), 'custom']);
}

async function factsFor(kind, target) {
  if (kind === 'repo') {
    const [owner, name] = target.split('/');
    return computeRepoFacts(await collectRepo(gh, owner, name));
  }
  return computeProfileFacts(await collectProfile(gh, target));
}

const md = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

(async () => {
  const models = providersFromArgs();
  const targets = targetsFromArgs();
  const fixed = arg('intensity');
  const started = Date.now();
  const out = [];
  const stats = Object.fromEntries(models.map((m) => [m.label, { jokes: 0, failedChecks: 0, fallbacks: 0, fills: 0, ms: 0 }]));
  const allLines = new Map(); // joke text -> target (to catch the same line used for two targets)
  let problems = 0;

  console.log(`Comedy test: ${targets.length} targets, models: ${models.map((m) => m.label).join(' vs ')}`);
  out.push('# Git Autopsy: comedy report', '');
  out.push(`Generated ${new Date().toISOString()} · models: ${models.map((m) => `\`${m.label}\``).join(' vs ')} · calibration: ${calibration.placeholder ? '**PLACEHOLDER examples** (replace them in calibration.md)' : `${calibration.examples.length} examples`}`, '');
  out.push('Each target lists its **evidence cards** (facts measured by code, ranked by how roastable they are), then the jokes each model kept. The `[C1]` tags show which card a joke is built on. "Checks" = the automatic checks (evidence reference, specific detail, banned phrases, LIMIT topics, invented numbers, length, unique openings).', '');

  for (let t = 0; t < targets.length; t++) {
    const [kind, target, why] = targets[t];
    const intensity = fixed || INTENSITIES[t % 3];
    process.stdout.write(`[${t + 1}/${targets.length}] ${target} (${intensity}) ... `);
    let result;
    try {
      result = await factsFor(kind, target);
    } catch (err) {
      console.log(`ERROR ${err.code || ''} ${err.message}`);
      out.push(`## ${t + 1}. ${target}`, '', `**Could not analyse:** ${err.message}`, '');
      problems++;
      continue;
    }
    out.push(`## ${t + 1}. ${kind === 'repo' ? 'Repo' : 'Profile'}: [${target}](${result.url}), ${why} · intensity: **${intensity}**`, '');

    let cards = null;
    const sections = [];
    for (const m of models) {
      const t0 = Date.now();
      const r = await writeRoast(result, m.provider, { intensity, calibration });
      const ms = Date.now() - t0;
      cards = r.cards;
      const checked = checkJokes(r.jokes, r.cards, result);
      const s = stats[m.label];
      s.jokes += r.jokes.length;
      s.ms += ms;
      if (/offline templates/.test(r.generatedBy) && m.provider) s.fallbacks++;
      if (/offline fill/.test(r.generatedBy)) s.fills++;
      const lines = [`**${m.label}** · written by: ${r.generatedBy} · ${(ms / 1000).toFixed(1)}s · checks: ${checked.ok ? 'PASS' : 'FAIL'}`, ''];
      checked.results.forEach((x, i) => {
        lines.push(`${i + 1}. ${x.joke.text} \`[${x.joke.cards.join(', ')}]\`${x.problems.length ? `  \n   ⚠ ${x.problems.join('; ')}` : ''}`);
        if (x.problems.length) {
          s.failedChecks++;
          problems++;
        }
        const prev = allLines.get(x.joke.text);
        if (prev && prev !== target) {
          lines.push(`   ⚠ identical line was also used for ${prev}`);
          problems++;
        }
        allLines.set(x.joke.text, target);
      });
      if (r.warnings.length) lines.push('', `<sub>warnings: ${md(r.warnings.join(' / '))}</sub>`);
      if (r.debug && r.debug.criticRejected && r.debug.criticRejected.length) {
        lines.push('', `<details><summary>critic deleted ${r.debug.criticRejected.length} of ${r.debug.candidates.length} candidates</summary>`, '');
        for (const rej of r.debug.criticRejected.slice(0, 10)) {
          const cand = r.debug.candidates[(rej.candidate || 0) - 1];
          lines.push(`- ${cand ? md(cand.text) : `#${rej.candidate}`} → *${md(rej.reason || '')}*`);
        }
        lines.push('', '</details>');
      }
      sections.push(lines.join('\n'));
      process.stdout.write(`${m.label}: ${checked.ok ? 'ok' : 'FAIL'} `);
    }

    out.push('| Card | Angle | Score | Fact (source) |', '|---|---|---|---|');
    for (const c of cards) out.push(`| ${c.id} | ${c.angle} | ${c.score} | ${md(c.fact)} ([source](${c.source_url})) |`);
    out.push('');
    out.push(...sections.map((s) => s + '\n'));
    console.log('');
  }

  out.push('## Model comparison', '', '| Model | Jokes kept | Failed checks | Fell back to offline | Topped up with offline | Avg time per target |', '|---|---|---|---|---|---|');
  for (const [label, s] of Object.entries(stats)) {
    out.push(`| \`${label}\` | ${s.jokes} | ${s.failedChecks} | ${s.fallbacks} | ${s.fills} | ${(s.ms / targets.length / 1000).toFixed(1)}s |`);
  }
  out.push('', `Automatic checks: **${problems === 0 ? 'ALL PASS' : `${problems} problem(s)`}** · total time ${((Date.now() - started) / 1000).toFixed(0)}s`, '');

  const file = path.join(ROOT, 'comedy-report.md');
  fs.writeFileSync(file, out.join('\n'));
  console.log(`\nWrote ${file}`);
  console.log(problems === 0 ? 'Automatic checks: ALL PASS' : `Automatic checks: ${problems} problem(s), see the report`);
  process.exit(problems === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
