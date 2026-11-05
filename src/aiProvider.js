// ============================================================================
// AI PROVIDER: the ONLY file that talks to an AI model.
// To swap models, change AI_PROVIDER / *_MODEL in .env (or add a new provider below).
//
// Every provider has the same shape:
//   { name, model, generate(systemPrompt, userPrompt) -> Promise<string> }
// `generate` must return the raw text the model produced (we expect JSON text).
// ============================================================================

const TIMEOUT_MS = 45000;

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

// ---- Groq (free tier, OpenAI-compatible API) -------------------------------
function groqProvider(env) {
  const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  return {
    name: 'groq',
    model,
    async generate(system, user) {
      const json = await postJson(
        'https://api.groq.com/openai/v1/chat/completions',
        { Authorization: `Bearer ${env.GROQ_API_KEY}` },
        {
          model,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }
      );
      return json.choices?.[0]?.message?.content || '';
    },
  };
}

// ---- Google Gemini (free tier) ---------------------------------------------
function geminiProvider(env) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  return {
    name: 'gemini',
    model,
    async generate(system, user) {
      const json = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { 'x-goog-api-key': env.GEMINI_API_KEY },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
        }
      );
      return json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    },
  };
}

// ---- Ollama (free, runs locally) -------------------------------------------
function ollamaProvider(env) {
  const model = env.OLLAMA_MODEL || 'llama3.2';
  const url = (env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
  return {
    name: 'ollama',
    model,
    async generate(system, user) {
      const json = await postJson(`${url}/api/chat`, {}, {
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0.8 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return json.message?.content || '';
    },
  };
}

/**
 * Picks the provider from env. Returns null for "offline" (no AI: template writer is used instead).
 * AI_PROVIDER=auto (default): groq if GROQ_API_KEY, else gemini if GEMINI_API_KEY, else offline.
 */
function getProvider(env = process.env) {
  const choice = (env.AI_PROVIDER || 'auto').toLowerCase();
  if (choice === 'offline') return null;
  if (choice === 'groq') return env.GROQ_API_KEY ? groqProvider(env) : null;
  if (choice === 'gemini') return env.GEMINI_API_KEY ? geminiProvider(env) : null;
  if (choice === 'ollama') return ollamaProvider(env);
  if (env.GROQ_API_KEY) return groqProvider(env);
  if (env.GEMINI_API_KEY) return geminiProvider(env);
  return null;
}

module.exports = { getProvider };
