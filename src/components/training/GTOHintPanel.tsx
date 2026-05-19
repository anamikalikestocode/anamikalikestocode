import React, { useState } from 'react';
import { GTOHint } from '../../types/gto';
import { RangeGrid } from './RangeGrid';
import { handToKey } from '../../gto/ranges';

interface GTOHintPanelProps {
  hint: GTOHint;
  heroCards: [number, number] | null;
  pending?: boolean;
}

const VERDICT_CONFIG = {
  gto:        { bg: 'bg-emerald-900', border: 'border-emerald-700', text: 'text-emerald-300', icon: '✓', label: 'Perfect play' },
  acceptable: { bg: 'bg-emerald-950', border: 'border-emerald-800', text: 'text-emerald-400', icon: '✓', label: 'Good play' },
  marginal:   { bg: 'bg-yellow-950',  border: 'border-yellow-800',  text: 'text-yellow-300',  icon: '~', label: 'Close call' },
  mistake:    { bg: 'bg-red-950',     border: 'border-red-800',     text: 'text-red-300',     icon: '✗', label: 'Mistake' },
  spew:       { bg: 'bg-red-950',     border: 'border-red-700',     text: 'text-red-300',     icon: '✗', label: 'Big mistake' },
} as const;

export const GTOHintPanel: React.FC<GTOHintPanelProps> = ({ hint, heroCards, pending }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (pending) {
    return (
      <div className="border-t border-gray-800 bg-gray-900/50 p-3">
        <div className="text-xs text-gray-500 font-sans animate-pulse">Coach is thinking…</div>
      </div>
    );
  }

  const cfg = VERDICT_CONFIG[hint.verdict] ?? VERDICT_CONFIG.marginal;
  const heroKey = heroCards ? handToKey(heroCards) : null;
  const actionsMatch = hint.gtoAction === hint.playerAction;

  const rawExplanation = hint.explanation;
  const isSizingTell = rawExplanation.startsWith('[SIZING TELL]');
  const explanation = isSizingTell
    ? rawExplanation.replace(/^\[SIZING TELL\]\s*/, '')
    : rawExplanation;

  const showEquity = hint.equity !== undefined && hint.requiredEquity !== undefined;
  const equityPct = showEquity ? Math.round((hint.equity ?? 0) * 100) : 0;
  const reqPct    = showEquity ? Math.round((hint.requiredEquity ?? 0) * 100) : 0;
  const marginPct = equityPct - reqPct;

  const hasFreqs = hint.gtoRaiseFreq > 0.01 || hint.gtoCallFreq > 0.01;

  return (
    <div className={`border-t ${cfg.border}`}>
      {/* Header */}
      <div className={`${cfg.bg} px-4 py-3 flex items-start justify-between gap-3`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-xl font-bold shrink-0 ${cfg.text}`}>{cfg.icon}</span>
          <div className="min-w-0">
            <div className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</div>
            {!actionsMatch && (
              <div className="text-xs text-gray-400 mt-0.5">
                You {hint.playerAction}d · best play was to {hint.gtoAction}
              </div>
            )}
          </div>
        </div>
        {hint.evDeltaBB !== null && hint.evDeltaBB !== 0 && (
          <div className={`text-sm font-mono font-bold shrink-0 ${hint.evDeltaBB < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {hint.evDeltaBB < 0 ? '−' : '+'}{Math.abs(hint.evDeltaBB).toFixed(1)} chips
          </div>
        )}
      </div>

      {/* Sizing tell alert */}
      {isSizingTell && (
        <div className="bg-amber-950/60 border-b border-amber-900 px-4 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">
            ⚠ Your opponents can read this pattern
          </div>
          <p className="text-xs font-sans text-amber-300 leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Coach explanation */}
      {!isSizingTell && (
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-sm font-sans text-gray-300 leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Details toggle */}
      {(showEquity || hasFreqs || (hint.rangeData && heroKey)) && (
        <div className="bg-gray-950 border-t border-gray-800">
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="uppercase tracking-widest font-medium">
              {showDetails ? 'Hide details' : 'Show details'}
            </span>
            <span>{showDetails ? '▲' : '▼'}</span>
          </button>

          {showDetails && (
            <div className="px-4 pb-4 space-y-4">
              {/* Equity breakdown */}
              {showEquity && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-900 border border-gray-800 rounded px-2 py-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Your odds</div>
                    <div className="text-base font-mono font-bold text-gray-200">{equityPct}%</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded px-2 py-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Needed</div>
                    <div className="text-base font-mono font-bold text-gray-200">{reqPct}%</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded px-2 py-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Edge</div>
                    <div className={`text-base font-mono font-bold ${marginPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {marginPct >= 0 ? '+' : ''}{marginPct}%
                    </div>
                  </div>
                </div>
              )}

              {/* Optimal frequencies */}
              {hasFreqs && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                    How pros play this hand
                  </div>
                  <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-gray-800">
                    {hint.gtoRaiseFreq > 0.01 && (
                      <div className="bg-emerald-600 transition-all" style={{ width: `${hint.gtoRaiseFreq * 100}%` }} />
                    )}
                    {hint.gtoCallFreq > 0.01 && (
                      <div className="bg-blue-600 transition-all" style={{ width: `${hint.gtoCallFreq * 100}%` }} />
                    )}
                    {hint.gtoFoldFreq > 0.01 && (
                      <div className="bg-gray-600 transition-all" style={{ width: `${hint.gtoFoldFreq * 100}%` }} />
                    )}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[11px]">
                    {hint.gtoRaiseFreq > 0.01 && (
                      <span className="text-emerald-500">Raise {Math.round(hint.gtoRaiseFreq * 100)}%</span>
                    )}
                    {hint.gtoCallFreq > 0.01 && (
                      <span className="text-blue-400">Call {Math.round(hint.gtoCallFreq * 100)}%</span>
                    )}
                    {hint.gtoFoldFreq > 0.01 && (
                      <span className="text-gray-500">Fold {Math.round(hint.gtoFoldFreq * 100)}%</span>
                    )}
                  </div>
                </div>
              )}

              {/* Range grid */}
              {hint.rangeData && heroKey && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                    Your hand in the full range
                  </div>
                  <RangeGrid rangeData={hint.rangeData} heroHand={heroKey} compact />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
