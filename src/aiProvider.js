// ============================================================================
// AI PROVIDER: the ONLY file that talks to an AI model.
//
// Two roles, each configurable in .env:
//   summary model: AI_PROVIDER / *_MODEL            (writes the plain summary)
//   humor model:   HUMOR_PROVIDER / HUMOR_MODEL     (writes and critiques the roast)
//                  falls back to the summary model if not set
//
// Providers (all have free options): groq | gemini | openrouter | ollama | offline
// A provider can also be given as one string "provider:model", e.g. "groq:llama-3.3-70b-versatile"
// (used by scripts/comedy.js --models to compare two models on the same input).
//
// Every provider has the same shape:
//   { name, model, generate(systemPrompt, userPrompt, { temperature }) -> Promise<string> }
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TIMEOUT_MS = 60000;
const RETRY_STATUSES = [429, 500, 502, 503, 504]; // free tiers are often "busy": these are worth retrying
const RETRY_DELAYS_MS = [3000, 8000, 20000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postJson(url, headers, body) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(`AI request failed: ${err.message}`);
    }
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    if (RETRY_STATUSES.includes(res.status) && attempt < RETRY_DELAYS_MS.length) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      await sleep(Math.min(60000, retryAfter || RETRY_DELAYS_MS[attempt]));
      continue;
    }
    throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

function chatMessages(system, user) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// ---- Groq (free tier, OpenAI-compatible) ---------------------------------------------------
// Key: https://console.groq.com/keys   Models: llama-3.3-70b-versatile, openai/gpt-oss-120b, ...
function groqProvider(key, model = 'llama-3.3-70b-versatile') {
  return {
    name: 'groq',
    model,
    async generate(system, user, { temperature = 0.8 } = {}) {
      const json = await postJson('https://api.groq.com/openai/v1/chat/completions', { Authorization: `Bearer ${key}` }, {
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: chatMessages(system, user),
      });
      return json.choices?.[0]?.message?.content || '';
    },
  };
}

// ---- Google Gemini (free tier) ------------------------------------------------------------
// Key: https://aistudio.google.com/apikey
// Models (Nov 2026, free tier): gemini-3.5-flash, gemini-3.6-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite.
// (gemini-2.5-* is "no longer available to new users".) Gemma models (gemma-4-*) work too, but are slow.
function geminiProvider(key, model = 'gemini-3.5-flash') {
  const isGemma = /^gemma/i.test(model); // Gemma rejects system instructions and JSON mode
  return {
    name: 'gemini',
    model,
    async generate(system, user, { temperature = 0.8 } = {}) {
      const body = isGemma
        ? { contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }], generationConfig: { temperature } }
        : {
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature, responseMimeType: 'application/json' },
          };
      const json = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': key }, body);
      return json.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('') || '';
    },
  };
}

// ---- OpenRouter (many free models, names end in ":free") ---------------------------------
// Key: https://openrouter.ai/keys   Models: see https://openrouter.ai/models?max_price=0
function openrouterProvider(key, model = 'meta-llama/llama-3.3-70b-instruct:free') {
  return {
    name: 'openrouter',
    model,
    async generate(system, user, { temperature = 0.8 } = {}) {
      // No response_format here: several free models reject it. parseJson() handles extra text.
      const json = await postJson('https://openrouter.ai/api/v1/chat/completions', { Authorization: `Bearer ${key}`, 'X-Title': 'Git Autopsy' }, {
        model,
        temperature,
        messages: chatMessages(system, user),
      });
      return json.choices?.[0]?.message?.content || '';
    },
  };
}

// ---- Ollama (free, runs on your own computer) ----------------------------------------------
// Install: https://ollama.com, then `ollama pull llama3.2` (or qwen2.5:7b, mistral, ...)
function ollamaProvider(url = 'http://localhost:11434', model = 'llama3.2') {
  const base = url.replace(/\/$/, '');
  return {
    name: 'ollama',
    model,
    async generate(system, user, { temperature = 0.8 } = {}) {
      const json = await postJson(`${base}/api/chat`, {}, { model, stream: false, format: 'json', options: { temperature }, messages: chatMessages(system, user) });
      return json.message?.content || '';
    },
  };
}

/** Builds a provider by name. Returns null if its key is missing (or name is "offline"). */
function buildProvider(name, model, env) {
  switch ((name || '').toLowerCase()) {
    case 'groq':
      return env.GROQ_API_KEY ? groqProvider(env.GROQ_API_KEY, model || env.GROQ_MODEL || undefined) : null;
    case 'gemini':
      return env.GEMINI_API_KEY ? geminiProvider(env.GEMINI_API_KEY, model || env.GEMINI_MODEL || undefined) : null;
    case 'openrouter':
      return env.OPENROUTER_API_KEY ? openrouterProvider(env.OPENROUTER_API_KEY, model || env.OPENROUTER_MODEL || undefined) : null;
    case 'ollama':
      return ollamaProvider(env.OLLAMA_URL || undefined, model || env.OLLAMA_MODEL || undefined);
    default:
      return null;
  }
}

/** "auto": first provider that has a key, in this order. */
function autoProvider(env) {
  for (const name of ['groq', 'gemini', 'openrouter']) {
    const p = buildProvider(name, null, env);
    if (p) return p;
  }
  return null;
}

/**
 * Picks the provider for a role from env. Returns null = offline templates.
 * @param role 'summary' (AI_PROVIDER) or 'humor' (HUMOR_PROVIDER, falls back to the summary provider)
 */
function getProvider(env = process.env, role = 'summary') {
  if (role === 'humor' && env.HUMOR_PROVIDER) {
    if (env.HUMOR_PROVIDER.toLowerCase() === 'offline') return null;
    return buildProvider(env.HUMOR_PROVIDER, env.HUMOR_MODEL || null, env);
  }
  const choice = (env.AI_PROVIDER || 'auto').toLowerCase();
  if (choice === 'offline') return null;
  if (choice === 'auto') return autoProvider(env);
  return buildProvider(choice, null, env);
}

/** "groq:llama-3.3-70b-versatile" -> provider (the model part may contain ":" too, e.g. ":free"). */
function createProvider(spec, env = process.env) {
  const i = spec.indexOf(':');
  const name = i === -1 ? spec : spec.slice(0, i);
  const model = i === -1 ? null : spec.slice(i + 1);
  return buildProvider(name, model, env);
}

/**
 * Wraps a provider so identical requests are answered from disk (used by tests and the comedy
 * script so re-runs don't burn free-tier limits). Same model + prompt + temperature = same answer.
 */
function withDiskCache(provider, dir) {
  if (!provider || !dir) return provider;
  fs.mkdirSync(dir, { recursive: true });
  return {
    ...provider,
    cached: true,
    async generate(system, user, opts = {}) {
      const key = crypto.createHash('sha1').update(JSON.stringify([provider.name, provider.model, opts.temperature ?? null, system, user])).digest('hex');
      const file = path.join(dir, key + '.json');
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8')).text;
      } catch {
        /* not cached yet */
      }
      const text = await provider.generate(system, user, opts);
      fs.writeFileSync(file, JSON.stringify({ provider: provider.name, model: provider.model, text }));
      return text;
    },
  };
}

module.exports = { getProvider, createProvider, withDiskCache };
