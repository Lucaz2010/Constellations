/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ConstellationNode, DeepDive } from '../types/constellation';
import { AIService } from '../services/aiService';
import { X, CheckCircle2, Share2, Layers, BookOpen, Lightbulb, RotateCw, ChevronRight } from 'lucide-react';

// Node types that get an on-demand deep dive
const DEEP_DIVE_TYPES = new Set(['concept', 'subconcept']);
// Wait until the selection settles before asking Gemma. Clicking quickly across
// stars then sends nothing, and it avoids bursts of cancelled requests, which can
// make Ollama hang for 60 s on the next request.
const DEEP_DIVE_DEBOUNCE_MS = 400;
// After this long, tell the user the local model is still busy
const DEEP_DIVE_SLOW_MS = 12000;

type DeepDiveState =
    | { key: string; status: 'loading'; slow?: boolean }
    | { key: string; status: 'done'; data: DeepDive }
    | { key: string; status: 'error'; error: string };

// Loads the deep dive for `path`. Cancels the request when the user selects
// another star, and ignores answers that arrive for a previous selection.
function useDeepDive(path: string[], enabled: boolean) {
  const key = path.join(' > ');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DeepDiveState | null>(null);

  useEffect(() => {
    if (!enabled || path.length === 0) return;
    const cached = AIService.cachedDeepDive(path);
    if (cached) {
      setState({ key, status: 'done', data: cached });
      return;
    }
    const controller = new AbortController();
    setState({ key, status: 'loading' });
    const start = setTimeout(() => {
      AIService.deepDive(path, controller.signal)
          .then((data) => {
            if (!controller.signal.aborted) setState({ key, status: 'done', data });
          })
          .catch((e: any) => {
            if (!controller.signal.aborted) setState({ key, status: 'error', error: e?.message || 'Deep dive failed' });
          });
    }, DEEP_DIVE_DEBOUNCE_MS);
    const slow = setTimeout(() => {
      setState((s) => (s && s.key === key && s.status === 'loading' ? { ...s, slow: true } : s));
    }, DEEP_DIVE_SLOW_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(slow);
      controller.abort();
    };
    // `key` identifies `path`; `attempt` re-runs after Retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, attempt]);

  if (!enabled) return null;
  // Before the effect runs for a new selection, show cached data or a loading state
  if (!state || state.key !== key) {
    const cached = AIService.cachedDeepDive(path);
    return { state: cached ? ({ key, status: 'done', data: cached } as DeepDiveState) : ({ key, status: 'loading' } as DeepDiveState), retry: () => setAttempt((a) => a + 1) };
  }
  return { state, retry: () => setAttempt((a) => a + 1) };
}

const DeepDiveSection: React.FC<{ state: DeepDiveState; retry: () => void; topic: string }> = ({ state, retry, topic }) => (
    <section className="space-y-3" aria-live="polite">
      <h4 className="text-[11px] uppercase font-mono tracking-wider text-blue-300 flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        <span>Deep dive</span>
      </h4>

      {state.status === 'loading' && (
          <div className="space-y-2" aria-busy="true">
            <p className="text-xs text-slate-400">
              {state.slow
                  ? 'Still working, the local model is busy. This can take up to a minute…'
                  : `Gemma is writing an in-depth explanation of ${topic}…`}
            </p>
            {[92, 100, 85, 70].map((w, i) => (
                <div key={i} className="h-2.5 rounded bg-slate-800/80 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
      )}

      {state.status === 'error' && (
          <div className="bg-red-950/40 border border-red-800/60 p-3 rounded-xl space-y-2">
            <p className="text-xs text-red-200">Couldn't load the deep dive: {state.error}</p>
            <button
                onClick={retry}
                className="text-xs font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
      )}

      {state.status === 'done' && (
          <div className="space-y-4">
            {state.data.overview && <p className="text-[13px] leading-relaxed text-slate-200">{state.data.overview}</p>}

            {state.data.keyIdeas.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-300 mb-1.5">Key ideas</h5>
                  <ul className="space-y-1.5">
                    {state.data.keyIdeas.map((idea, i) => (
                        <li key={i} className="text-xs text-slate-300 leading-relaxed flex gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-blue-400" />
                          <span>{idea}</span>
                        </li>
                    ))}
                  </ul>
                </div>
            )}

            {state.data.example && (
                <div className="bg-[#121B38] border border-slate-700/60 p-3 rounded-xl">
                  <h5 className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Example
                  </h5>
                  <p className="text-xs text-slate-200 leading-relaxed">{state.data.example}</p>
                </div>
            )}

            {state.data.whyItMatters && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-300 mb-1">Why it matters</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">{state.data.whyItMatters}</p>
                </div>
            )}

            {state.data.related.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-300 mb-1.5">Explore next</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {state.data.related.map((r, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-[#1B274F] text-blue-200 border border-blue-500/30">
                          {r}
                        </span>
                    ))}
                  </div>
                </div>
            )}

            <p className="text-[10px] text-slate-500">Generated locally by Gemma 4. Check important facts.</p>
          </div>
      )}
    </section>
);

interface RightSidebarProps {
  node: ConstellationNode | null;
  // Names from the subject down to this node, e.g. ["Computer Science", "Data Structures", "Trees"]
  topicPath?: string[];
  onClose: () => void;
  onCompleteNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
                                                            node,
                                                            topicPath = [],
                                                            onClose,
                                                            onCompleteNode,
                                                            onDeleteNode,
                                                          }) => {
  // Hooks must run before the early return below
  const deepDive = useDeepDive(topicPath, !!node && DEEP_DIVE_TYPES.has(node.type));
  if (!node) return null;
  const ancestors = topicPath.slice(0, -1);

  return (
      <aside className="w-80 sm:w-96 bg-[#090F22]/95 border-l border-slate-800/80 flex flex-col h-full z-30 select-none backdrop-blur-xl overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-start justify-between gap-3">
          <div>
            {ancestors.length > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center flex-wrap gap-0.5 mb-1">
                  {ancestors.map((a, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                        <span>{a}</span>
                      </React.Fragment>
                  ))}
                </div>
            )}
            <h2 className="text-xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              {node.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {node.type}
            </span>
              {node.isCompleted && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Kept
              </span>
              )}
            </div>
          </div>

          <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 flex-1 text-sm text-slate-300">
          {node.description && <p className="text-slate-300 leading-relaxed text-[13px]">{node.description}</p>}

          {deepDive && <DeepDiveSection state={deepDive.state} retry={deepDive.retry} topic={node.name} />}

          {/* Overlaps with other subjects */}
          {node.also_in && node.also_in.length > 0 && (
              <div className="bg-[#121B38] border border-slate-700/60 p-3 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Overlaps With Other Subjects:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {node.also_in.map((field, idx) => (
                      <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-[#1B274F] text-blue-200 border border-blue-500/30 font-medium"
                      >
                  {field}
                </span>
                  ))}
                </div>
              </div>
          )}

          {/* Bridge explanation */}
          {node.type === 'bridge' && node.explanation && (
              <div className="bg-[#121B38] border border-blue-500/30 p-3.5 rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-blue-300 uppercase font-mono">
                  Where {node.subject} & {node.secondarySubject} Meet
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">{node.explanation}</p>
                {node.realWorldImpact && (
                    <p className="text-xs text-amber-300/90 italic pt-1 border-t border-slate-800">
                      "{node.realWorldImpact}"
                    </p>
                )}
              </div>
          )}

          {/* Subtopics */}
          {node.subConcepts && node.subConcepts.length > 0 && (
              <div>
                <h4 className="text-[11px] uppercase font-mono tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Key Topics & Examples</span>
                </h4>
                <div className="space-y-1.5">
                  {node.subConcepts.map((sub, idx) => (
                      <div
                          key={idx}
                          className="p-2 rounded-lg bg-[#111A35] border border-slate-800 text-xs text-slate-200 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span>{sub}</span>
                      </div>
                  ))}
                </div>
              </div>
          )}

          {/* Keep / Delete */}
          <div className="flex gap-2">
            <button
                onClick={() => onCompleteNode?.(node.id)}
                disabled={node.isCompleted}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              ✓ Keep
            </button>
            <button
                onClick={() => onDeleteNode?.(node.id)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              ✕ Delete
            </button>
          </div>
        </div>
      </aside>
  );
};