/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PathMeta } from '../types/constellation';
import { ArrowLeft, X, Loader2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';

interface LeftSidebarProps {
  paths: PathMeta[];
  selectedPathId: string | null;
  onSelectPath: (pathId: string) => void;
  onAddPath: (subjectName: string) => Promise<void>;
  onRemovePath: (pathId: string) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onUseOfflineFallback?: () => void;
  onDiscoverCrossover?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  paths,
  selectedPathId,
  onSelectPath,
  onAddPath,
  onRemovePath,
  isLoading,
  errorMessage,
  onRetry,
  onUseOfflineFallback,
  onDiscoverCrossover,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const name = inputValue.trim();
    setInputValue('');
    onAddPath(name);
  };

  return (
    <aside className="w-64 sm:w-72 bg-[#090F22]/95 border-r border-slate-800/80 flex flex-col h-full z-20 select-none backdrop-blur-xl">
      {/* Top search & Create button */}
      <div className="p-4 border-b border-slate-800/60">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. comics, cooking, italy..."
              disabled={isLoading}
              className="flex-1 bg-[#131B36] border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setInputValue('')}
              className="p-2 bg-[#131B36] border border-slate-700/60 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating from Model...</span>
              </>
            ) : (
              <span>Create Path</span>
            )}
          </button>
        </form>

        {/* Quick suggestions */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400">Quick:</span>
          {['Comics', 'Cooking', 'Italy', 'Black Holes'].map((tag) => (
            <button
              key={tag}
              onClick={() => onAddPath(tag)}
              disabled={isLoading || paths.some((p) => p.name.toLowerCase() === tag.toLowerCase())}
              className="text-[11px] px-2 py-0.5 rounded bg-[#131B36] text-slate-300 hover:text-white border border-slate-700/60 disabled:opacity-30 cursor-pointer"
            >
              +{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Visible Error Banner if Model Call Fails */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="block text-white font-medium">Generation Error</strong>
              <p className="text-[11px] text-red-300 mt-0.5 line-clamp-3">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-800/80 hover:bg-red-700 text-white font-medium text-[11px] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
            {onUseOfflineFallback && (
              <button
                onClick={onUseOfflineFallback}
                className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
              >
                Use Offline Fallback
              </button>
            )}
          </div>
        </div>
      )}

      {/* YOUR PATHS Section */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Your Paths
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            {paths.length} Active
          </span>
        </div>

        {paths.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 leading-relaxed">
            No paths created yet.<br />Type any subject like <strong className="text-white">comics</strong> above and click <span className="text-blue-400">Create Path</span>!
          </div>
        ) : (
          <div className="space-y-2">
            {paths.map((path) => {
              const isSelected = selectedPathId === path.id;
              return (
                <div
                  key={path.id}
                  onClick={() => onSelectPath(path.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#14234B] border-blue-500/70 shadow-lg shadow-blue-900/20'
                      : 'bg-[#111A35] border-slate-800 hover:bg-[#162244]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-white tracking-wide capitalize">
                          {path.name}
                        </h3>
                        {path.isOfflineFallback && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Offline Fallback
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {path.completedNodes}/{path.totalNodes} done
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePath(path.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete path"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Crossover synthesis discovery if 2+ paths exist */}
        {paths.length >= 2 && onDiscoverCrossover && (
          <div className="pt-3 border-t border-slate-800/80">
            <button
              onClick={onDiscoverCrossover}
              className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Discover Crossover Bridge</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
