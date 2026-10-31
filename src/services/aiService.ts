/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AISettings,
  BridgeResult,
  ConstellationGenerationResult,
  DeepDive,
} from '../types/constellation';

const constellationCache = new Map<string, ConstellationGenerationResult>();
const bridgeCache = new Map<string, BridgeResult>();
const deepDiveCache = new Map<string, DeepDive>();
const deepDiveKey = (path: string[]) => path.map((p) => p.trim().toLowerCase()).join(' > ');

export class AIService {
  // In-depth explanation of the last topic in `path` (e.g. ["Computer Science", "Data Structures", "Trees"]).
  // Cached per path, so re-opening a star is instant. Pass a signal to cancel when the user clicks away.
  public static cachedDeepDive(path: string[]): DeepDive | undefined {
    return deepDiveCache.get(deepDiveKey(path));
  }

  public static async deepDive(path: string[], signal?: AbortSignal): Promise<DeepDive> {
    const key = deepDiveKey(path);
    const cached = deepDiveCache.get(key);
    if (cached) return cached;

    const res = await fetch('/api/ai/deepdive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      signal,
    });
    const raw = await res.json();
    if (!res.ok || raw.error) throw new Error(raw.error || 'Deep dive failed');

    const text = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
    const list = (x: unknown, max: number) =>
        Array.isArray(x) ? x.map(text).filter(Boolean).slice(0, max) : [];
    const result: DeepDive = {
      overview: text(raw.overview),
      keyIdeas: list(raw.keyIdeas, 6),
      example: text(raw.example),
      whyItMatters: text(raw.whyItMatters),
      related: list(raw.related, 5),
    };
    deepDiveCache.set(key, result);
    return result;
  }

  // Generate constellation directly from the model for ANY subject
  public static async generateConstellation(
      subject: string,
      settings: AISettings
  ): Promise<ConstellationGenerationResult> {
    const key = subject.trim().toLowerCase();
    if (constellationCache.has(key)) return constellationCache.get(key)!;

    const res = await fetch('/api/ai/constellation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject }),
    });
    const rawJson = await res.json();
    if (!res.ok || rawJson.error) {
      throw new Error(rawJson.error || 'Generation failed');
    }

    const result: ConstellationGenerationResult = {
      subject: rawJson.subject || subject,
      description: rawJson.description || `Overview of ${subject}.`,
      isOfflineFallback: false,
      concepts: rawJson.concepts.slice(0, 8).map((c: any) => ({
        name: c.name,
        description: c.description || `Core branch of ${subject}.`,
        subConcepts: Array.isArray(c.subConcepts) ? c.subConcepts.slice(0, 4) : [],
        also_in: Array.isArray(c.also_in) ? c.also_in : undefined,
      })),
    };
    constellationCache.set(key, result);
    return result;
  }

  // Emergency offline generator clearly labeled as "(Offline Fallback)"
  public static generateEmergencyOfflineFallback(subject: string): ConstellationGenerationResult {
    console.warn(`[AIService] Using labeled offline fallback for "${subject}"`);
    const cleanSub = subject.trim();
    return {
      subject: cleanSub,
      description: `${cleanSub} (Offline Fallback): Key branches, foundational practices, and core areas of exploration.`,
      isOfflineFallback: true,
      quiz: {
        question: `What is the most effective approach to studying ${cleanSub}?`,
        options: [
          'Master core fundamentals step-by-step with real-world examples',
          'Attempt the most advanced edge cases on day one',
          'Memorize terminology without applying it',
          'Avoid studying standard historical practices',
        ],
        answerIndex: 0,
        explanation: `Building a solid foundation step-by-step is the proven method for understanding ${cleanSub}.`,
      },
      concepts: [
        {
          name: `${cleanSub} Fundamentals`,
          description: `The core defining concepts and essential terminology of ${cleanSub}.`,
          subConcepts: ['Foundational Concepts', 'Core Terminology', 'Essential Principles'],
          also_in: ['Foundations', 'Methodology'],
        },
        {
          name: 'Core Techniques & Practices',
          description: `The primary practical methods and standard workflows used in ${cleanSub}.`,
          subConcepts: ['Standard Techniques', 'Best Practices', 'Step-by-Step Methods'],
          also_in: ['Applied Science', 'Practical Skills'],
        },
        {
          name: 'History & Major Milestones',
          description: `The developmental evolution, major eras, and breakthrough moments of ${cleanSub}.`,
          subConcepts: ['Origins & Early Era', 'Key Breakthroughs', 'Modern Evolution'],
          also_in: ['History', 'Chronology'],
        },
        {
          name: 'Notable Styles & Genres',
          description: `The major recognized categories, variations, and styles within ${cleanSub}.`,
          subConcepts: ['Traditional Formats', 'Modern Variations', 'Cross-Disciplinary Styles'],
          also_in: ['Cultural Studies', 'Typology'],
        },
        {
          name: 'Analysis & Critical Theory',
          description: `How practitioners and scholars examine, evaluate, and interpret ${cleanSub}.`,
          subConcepts: ['Critical Frameworks', 'Quality Benchmarks', 'Case Studies'],
          also_in: ['Criticism', 'Theory'],
        },
        {
          name: 'Contemporary Trends & Future',
          description: `Current innovations, digital adaptations, and emerging frontiers of ${cleanSub}.`,
          subConcepts: ['Digital Transformations', 'Modern Innovations', 'Future Outlook'],
          also_in: ['Technology', 'Futurism'],
        },
      ],
    };
  }

  // Discover crossover between two subjects
  public static async discoverBridge(
    subjectA: string,
    subjectB: string,
    settings: AISettings
  ): Promise<BridgeResult> {
    const bridgeKey = [subjectA.trim().toLowerCase(), subjectB.trim().toLowerCase()].sort().join('::');
    if (bridgeCache.has(bridgeKey)) {
      return bridgeCache.get(bridgeKey)!;
    }

    try {
      const res = await fetch('/api/ai/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectA,
          subjectB,
          provider: settings.provider,
          ollamaUrl: settings.ollamaUrl,
          ollamaModel: settings.ollamaModel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.bridgeConcept && data.explanation) {
        const result: BridgeResult = {
          subjectA,
          subjectB,
          bridgeConcept: data.bridgeConcept,
          explanation: data.explanation,
          subConcepts: Array.isArray(data.subConcepts) && data.subConcepts.length > 0
            ? data.subConcepts.slice(0, 4)
            : ['Interdisciplinary Methods', 'Shared Practices', 'Real-world Crossover'],
          realWorldImpact: data.realWorldImpact || `Bridges the core discoveries of ${subjectA} and ${subjectB}.`,
        };
        bridgeCache.set(bridgeKey, result);
        return result;
      }
    } catch {
      // Quiet fallback
    }

    return {
      subjectA,
      subjectB,
      bridgeConcept: `${subjectA} & ${subjectB} Crossover`,
      explanation: `Where ${subjectA} and ${subjectB} intersect in real-world practice, sharing tools, vocabulary, and mutual influence.`,
      subConcepts: [`${subjectA} in ${subjectB}`, 'Shared Techniques', 'Collaborative Works'],
      realWorldImpact: `Connects key principles from ${subjectA} and ${subjectB} to drive creative and scientific discoveries.`,
    };
  }
}
