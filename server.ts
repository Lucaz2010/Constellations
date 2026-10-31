import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const MODEL = process.env.MODEL || 'gemma4:e2b';

app.use(express.json());

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return cleaned.trim();
}

type AskOptions = {
  // Gemma 4 "thinks" before answering by default. Turning it off is ~3x faster
  // (deep dive: ~4 s instead of ~12 s) with similar answers for these prompts.
  think?: boolean;
  temperature?: number;
  // Aborted when the browser cancels the request (user clicked another star)
  signal?: AbortSignal;
};

async function askOllama(prompt: string, opts: AskOptions = {}): Promise<any> {
  const signals = [AbortSignal.timeout(180000), ...(opts.signal ? [opts.signal] : [])];
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: 'json',
        ...(opts.think === undefined ? {} : { think: opts.think }),
        options: { num_ctx: 4096, ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }) },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.any(signals),
    });
  } catch (e: any) {
    if (opts.signal?.aborted) throw new Error('Request cancelled');
    throw new Error(`Cannot reach Ollama at ${OLLAMA_URL}. Is it running?`);
  }
  const data: any = await res.json();
  if (data.error) throw new Error(`Ollama: ${data.error}`);
  return JSON.parse(cleanJsonString(data.message?.content ?? ''));
}

async function askJson(prompt: string, validate: (x: any) => boolean, tries = 2, opts: AskOptions = {}) {
  let lastErr = 'Model returned invalid JSON';
  for (let i = 0; i < tries; i++) {
    try {
      const parsed = await askOllama(prompt, opts);
      if (validate(parsed)) return parsed;
      lastErr = 'JSON had the wrong shape';
    } catch (e: any) {
      lastErr = e.message;
      if (lastErr.startsWith('Cannot reach') || lastErr.startsWith('Ollama:') || lastErr === 'Request cancelled') throw e;
    }
  }
  throw new Error(lastErr);
}

// Topic names come from the model and from users: keep them short and on one line
// before they go into another prompt.
function cleanTopic(x: unknown): string {
  return String(x ?? '').replace(/[\r\n"`]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

// 1. Constellation generation
app.post('/api/ai/constellation', async (req, res) => {
  try {
    const { subject } = req.body || {};
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required' });
    }
    const prompt = `You are a knowledge curator. For the subject "${subject}", list 6 main branches that are accurate, specific and useful for learning it.
For each branch give: "name" (concrete topic name), "description" (max 20 words, factual), "subConcepts" (exactly 3 specific sub-topics), "also_in" (1 or 2 other subjects it overlaps with).
Return ONLY JSON in this shape, no markdown:
{"subject": "${subject}", "description": "One factual sentence about ${subject}.", "concepts": [{"name": "", "description": "", "subConcepts": ["", "", ""], "also_in": ["", ""]}]}`;
    const out = await askJson(prompt, (x) => Array.isArray(x?.concepts) && x.concepts.length > 0);
    return res.json(out);
  } catch (err: any) {
    console.error('constellation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Crossover bridge
app.post('/api/ai/bridge', async (req, res) => {
  try {
    const { subjectA, subjectB } = req.body || {};
    if (!subjectA || !subjectB) {
      return res.status(400).json({ error: 'Both subjectA and subjectB are required' });
    }
    const prompt = `Where do "${subjectA}" and "${subjectB}" genuinely intersect? Return ONLY JSON, no markdown:
{"bridgeConcept": "name of the real field or topic where both meet", "explanation": "2 sentences", "subConcepts": ["", "", ""], "realWorldImpact": "1 sentence"}`;
    const out = await askJson(prompt, (x) => typeof x?.bridgeConcept === 'string' && typeof x?.explanation === 'string');
    return res.json(out);
  } catch (err: any) {
    console.error('bridge error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Deep dive: an in-depth explanation of one concept, in the context of its path
//    (e.g. ["Computer Science", "Data Structures", "Trees"]), so "Trees" isn't botany.
app.post('/api/ai/deepdive', async (req, res) => {
  const controller = new AbortController();
  // Browser went away (user clicked another star): stop the Ollama call too
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const raw = req.body?.path;
    const path = Array.isArray(raw) ? raw.map(cleanTopic).filter(Boolean).slice(0, 4) : [];
    if (path.length === 0) {
      return res.status(400).json({ error: 'path must be a non-empty array of topic names' });
    }
    const topic = path[path.length - 1];
    const context = path.slice(0, -1).join(' → ');
    const prompt = `You are a knowledgeable, precise tutor. Explain the topic "${topic}"${context ? ` in the context of ${context}` : ''} in depth for a curious learner.
Be factual and specific. Do not invent people, dates, numbers or sources you are unsure of.
Return ONLY JSON, no markdown, in exactly this shape:
{"overview": "3 to 4 sentences explaining what it is and how it works",
 "keyIdeas": ["4 short points, each one sentence, covering the most important ideas"],
 "example": "one concrete real-world example in 1 to 2 sentences",
 "whyItMatters": "1 to 2 sentences on why it matters or where it is used",
 "related": ["3 closely related topics worth exploring next"]}`;
    const out = await askJson(
        prompt,
        (x) => typeof x?.overview === 'string' && x.overview.trim().length > 0 && Array.isArray(x?.keyIdeas),
        2,
        { think: false, temperature: 0.3, signal: controller.signal }
    );
    return res.json(out);
  } catch (err: any) {
    if (controller.signal.aborted) return; // client is gone, nothing to send
    console.error('deepdive error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`Constellations running on http://localhost:${port} (model: ${MODEL})`);
  });
}

startServer();