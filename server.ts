/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  return cleaned.trim();
}

// 1. Constellation generation API endpoint
app.post('/api/ai/constellation', async (req, res) => {
  try {
    const { subject, provider, ollamaUrl, ollamaModel } = req.body || {};

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const prompt = `You are an expert knowledge curator.
For the subject "${subject}", generate 6 to 7 main branches that are accurate, specific, and genuinely useful for learning and exploring this domain.
Requirements for each of the 6-7 branches:
1. "name": Concrete, factual topic name (e.g. for Comics: Superhero Comics, Manga & Anime, Graphic Novels, Webcomics, Comic Art & Storytelling, History of Comics, Publishing & Indie Press).
2. "description": 1 to 2 sentence factual overview explaining what it is.
3. "subConcepts": 2 to 4 specific sub-topics/examples within this branch.
4. "also_in": 2 to 3 other subjects or fields this branch naturally overlaps with.
5. "quiz": A factual multiple-choice question testing knowledge about this branch with 4 options and the 0-indexed answer.

Return STRICT JSON ONLY conforming to this schema:
{
  "subject": "${subject}",
  "description": "Factual 2-sentence overview of ${subject}.",
  "quiz": {
    "question": "Core question testing key knowledge about ${subject}?",
    "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"],
    "answerIndex": 0,
    "explanation": "Factual explanation of why this is correct."
  },
  "concepts": [
    {
      "name": "Specific Branch Name",
      "description": "1 to 2 sentence factual overview.",
      "subConcepts": ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3"],
      "also_in": ["Related Field A", "Related Field B"],
      "quiz": {
        "question": "Question about this branch?",
        "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"],
        "answerIndex": 0,
        "explanation": "Why this answer is factual."
      }
    }
  ]
}`;

    let rawResponse = '';

    // If local Ollama requested
    if (provider === 'gemma-local') {
      const targetUrl = (ollamaUrl || 'http://localhost:11434').replace(/\/$/, '') + '/api/generate';
      const model = ollamaModel || 'gemma:4b';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const ollamaRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (ollamaRes.ok) {
          const oData = await ollamaRes.json();
          rawResponse = oData.response || '';
        }
      } catch {
        // Ollama not reachable, proceed to Gemini
      }
    }

    // Call Gemini API
    if (!rawResponse) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const aiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
          rawResponse = aiRes.text || '';
          console.log(`[Gemini Response for "${subject}"] Length: ${rawResponse.length}`);
        } catch (genErr: any) {
          console.warn(`[Gemini API call error for "${subject}"]:`, genErr.message || genErr);
        }
      }
    }

    // Parse and return if model generated data
    if (rawResponse) {
      try {
        const cleaned = cleanJsonString(rawResponse);
        const parsed = JSON.parse(cleaned);
        if (parsed.concepts && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
          return res.json({ ...parsed, isOfflineFallback: false });
        }
      } catch (parseErr: any) {
        console.error(`[JSON Parse Error for "${subject}"]:\n`, parseErr);
      }
    }

    // Explicit labeled offline fallback response if model is unreachable
    return res.json({
      offline: true,
      subject,
      message: 'Model unreachable. Using labeled offline fallback.',
    });
  } catch (err: any) {
    console.error('API Error in /api/ai/constellation:', err);
    return res.json({
      offline: true,
      subject: req.body?.subject || 'Knowledge Map',
      error: err.message,
    });
  }
});

// 2. Discover Bridge API endpoint
app.post('/api/ai/bridge', async (req, res) => {
  try {
    const { subjectA, subjectB } = req.body || {};
    if (!subjectA || !subjectB) {
      return res.status(400).json({ error: 'Both subjectA and subjectB are required' });
    }

    const prompt = `Analyze where the two subjects "${subjectA}" and "${subjectB}" intersect and overlap in the real world.
Return genuine, factual crossover concepts that truly belong to both domains.
Return STRICT JSON ONLY:
{
  "bridgeConcept": "Authentic Crossover Discipline / Topic Name",
  "explanation": "2 to 3 sentences explaining where they genuinely meet and how both domains empower each other.",
  "subConcepts": ["Concrete Shared Topic 1", "Concrete Shared Topic 2", "Concrete Shared Topic 3"],
  "realWorldImpact": "1 sentence on the practical real-world application of this crossover."
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        const aiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        if (aiRes.text) {
          const cleaned = cleanJsonString(aiRes.text);
          return res.json(JSON.parse(cleaned));
        }
      } catch (err: any) {
        console.warn('Bridge generation warning:', err.message || err);
      }
    }

    return res.json({
      bridgeConcept: `${subjectA} & ${subjectB} Crossover`,
      explanation: `Where ${subjectA} and ${subjectB} meet in real-world applications, sharing core methods and practical workflows.`,
      subConcepts: [`${subjectA} Methods in ${subjectB}`, 'Interdisciplinary Synthesis', 'Practical Applications'],
      realWorldImpact: `Unites discoveries from ${subjectA} and ${subjectB} to open new possibilities.`,
    });
  } catch (err: any) {
    console.error('API Error in /api/ai/bridge:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Dev server with Vite middleware mode or production static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Constellations full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();
