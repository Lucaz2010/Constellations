/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ConstellationNode } from '../types/constellation';
import { X, CheckCircle2, AlertCircle, Share2, Layers } from 'lucide-react';

interface RightSidebarProps {
  node: ConstellationNode | null;
  onClose: () => void;
  onCompleteNode?: (nodeId: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  node,
  onClose,
  onCompleteNode,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setIsCorrect(false);
  }, [node?.id]);

  if (!node) return null;

  const quiz = node.quiz;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOption === null || !quiz) return;

    const correct = selectedOption === quiz.answerIndex;
    setIsCorrect(correct);
    setHasSubmitted(true);

    if (correct && onCompleteNode && !node.isCompleted) {
      onCompleteNode(node.id);
    }
  };

  return (
    <aside className="w-80 sm:w-96 bg-[#090F22]/95 border-l border-slate-800/80 flex flex-col h-full z-30 select-none backdrop-blur-xl overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight font-['Space_Grotesk']">
            {node.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {node.type}
            </span>
            {node.isOfflineFallback && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Offline Fallback
              </span>
            )}
            {node.isCompleted && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
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
        {/* Description paragraph */}
        <p className="text-slate-300 leading-relaxed text-[13px]">
          {node.description}
        </p>

        {/* Cross-disciplinary overlap badges if model returned also_in */}
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

        {/* Bridge specific explanation if crossover */}
        {node.type === 'bridge' && node.explanation && (
          <div className="bg-[#121B38] border border-blue-500/30 p-3.5 rounded-xl space-y-2">
            <h4 className="text-xs font-semibold text-blue-300 uppercase font-mono">
              Where {node.subject} & {node.secondarySubject} Meet
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              {node.explanation}
            </p>
            {node.realWorldImpact && (
              <p className="text-xs text-amber-300/90 italic pt-1 border-t border-slate-800">
                "{node.realWorldImpact}"
              </p>
            )}
          </div>
        )}

        {/* Subtopics list */}
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

        {/* Interactive Quiz Box as shown in screenshot */}
        {quiz && (
          <div className="bg-[#111A35] border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <h3 className="font-semibold text-white text-sm mb-3">
              {quiz.question}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {quiz.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-[#0E152C] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quiz-option"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedOption(idx);
                        setHasSubmitted(false);
                      }}
                      className="mt-0.5 w-3.5 h-3.5 accent-blue-500"
                    />
                    <span className="leading-snug">{option}</span>
                  </label>
                );
              })}

              <button
                type="submit"
                disabled={selectedOption === null}
                className="w-full mt-3 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Submit Answer
              </button>
            </form>

            {/* Answer result feedback */}
            {hasSubmitted && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                  isCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Correct!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>Not quite. Try again!</span>
                    </>
                  )}
                </div>
                <p>{quiz.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
