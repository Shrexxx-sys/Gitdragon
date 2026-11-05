// OFFLINE WRITER: summary templates (no AI), plus a convenience offlineWrite() that also adds
// offline jokes from the comedy engine. Used when no AI key is configured or the AI keeps failing.
// Every line only uses names/numbers that come straight from the facts.

function sentence(text) {
  const t = String(text).replace(/\*\*|__/g, '').trim().replace(/\.+$/, '');
  return /[!?]$/.test(t) ? t : t + '.';
}

// ---------------- repo ----------------

function repoSummary(f) {
  let what = f.description || (f.readme && f.readme.firstParagraph) || null;
  if (!what) what = f.isEmpty ? 'An empty repository with no code yet.' : `A ${f.primaryLanguage || 'code'} project with no description or README explanation.`;
  what = sentence(what);
  if (f.primaryLanguage && !what.includes(f.primaryLanguage)) what += ` Written mainly in ${f.primaryLanguage}.`;

  let how;
  const cmds = f.readme ? f.readme.commands : [];
  const manifests = f.tree ? f.tree.manifests : [];
  if (cmds.length) {
    how = `The README lists these commands: ${cmds.slice(0, 4).map((c) => `\`${c}\``).join(', ')}.`;
  } else if (f.packageScripts.length) {
    const main = ['start', 'dev', 'serve', 'build'].find((s) => f.packageScripts.includes(s));
    how = `Run \`npm install\`${main ? `, then \`npm run ${main}\`` : ''}. Available npm scripts: ${f.packageScripts.slice(0, 6).join(', ')}.`;
  } else if (manifests.includes('requirements.txt')) {
    how = 'Install dependencies with `pip install -r requirements.txt`, then run the entry-point file.';
  } else if (manifests.includes('Cargo.toml')) {
    how = 'Build and run with `cargo run`.';
  } else if (manifests.includes('go.mod')) {
    how = 'Build and run with `go run .` (or see the cmd/ folder).';
  } else if (manifests.includes('Dockerfile')) {
    how = 'There is a Dockerfile, so it can be built with `docker build .`.';
  } else {
    how = f.isEmpty ? 'Nothing to run yet.' : 'The README gives no run instructions.';
  }

  return { what_it_does: what, how_to_run: how, read_first: f.tree ? f.tree.readFirst : f.readme ? [f.readme.path] : [] };
}

// ---------------- profile ----------------

function profileSummary(f) {
  const who = f.name || f.login;
  const langs = f.topLanguages.map((l) => l.name);
  let what;
  if (f.isEmpty) what = `${who} has no public repositories yet.`;
  else {
    what = `${who} has ${f.originals} original public repos${f.forks ? ` and ${f.forks} forks` : ''}${langs.length ? `, mostly in ${langs.slice(0, 3).join(', ')}` : ''}.`;
    const best = f.topRepos[0];
    if (best && best.stars > 0) what += ` Best known for ${best.name} (${best.stars} stars)${best.description ? `: ${sentence(best.description)}` : '.'}`;
    if (f.bio) what += ` Bio: "${f.bio}"`;
  }
  return {
    what_they_build: what,
    main_languages: langs.length ? f.topLanguages.map((l) => `${l.name} (${l.count} repo${l.count === 1 ? '' : 's'})`).join(', ') : 'None detected.',
    notable_repos: f.topRepos.slice(0, 4).map((r) => `${r.name}: ${r.description || 'no description'}${r.stars ? ` (${r.stars} stars)` : ''}`),
  };
}

function offlineSummary(result) {
  return result.kind === 'repo' ? repoSummary(result.facts) : profileSummary(result.facts);
}

/** Summary + offline jokes in one call (no AI anywhere). */
function offlineWrite(result, { intensity = 'medium' } = {}) {
  // required here (not at the top) to avoid a circular import: comedy -> checks -> ... -> writer
  const { detectAngles } = require('./comedy/angles');
  const { offlineJokes } = require('./comedy/offlineComedy');
  const cards = detectAngles(result);
  const jokes = offlineJokes(result, cards, { intensity });
  return { summary: offlineSummary(result), roast: jokes.map((j) => j.text), jokes, cards };
}

module.exports = { offlineSummary, offlineWrite };
