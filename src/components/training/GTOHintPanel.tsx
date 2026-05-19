import React, { useState } from 'react';
import { GTOHint } from '../../types/gto';
import { Badge } from '../shared/Badge';
import { RangeGrid } from './RangeGrid';
import { handToKey } from '../../gto/ranges';
import { formatEV } from '../../utils/format';

interface GTOHintPanelProps {
  hint: GTOHint;
  heroCards: [number, number] | null;
  pending?: boolean;
}

export const GTOHintPanel: React.FC<GTOHintPanelProps> = ({ hint, heroCards, pending }) => {
  const [expanded, setExpanded] = useState(false);

  if (pending) {
    return (
      <div className="bg-gray-900 border-t border-gray-800 p-3 text-[11px] text-gray-500 font-sans tracking-wide">
        Analyzing…
      </div>
    );
  }

  // Parse sizing tell
  const rawExplanation = hint.explanation;
  const isSizingTell = rawExplanation.startsWith('[SIZING TELL]');
  const explanation = isSizingTell
    ? rawExplanation.replace(/^\[SIZING TELL\]\s*/, '')
    : rawExplanation;

  const heroKey = heroCards ? handToKey(heroCards) : null;

  // Action match
  const actionsMatch = hint.gtoAction === hint.playerAction;

  // Equity metrics
  const showEquity = hint.equity !== undefined && hint.requiredEquity !== undefined;
  const equityPct   = showEquity ? Math.round((hint.equity ?? 0) * 100) : 0;
  const reqPct      = showEquity ? Math.round((hint.requiredEquity ?? 0) * 100) : 0;
  const marginPct   = equityPct - reqPct;

  // Truncate long explanations
  const TRUNCATE_AT = 200;
  const isLong = explanation.length > TRUNCATE_AT;
  const displayExplanation = isLong && !expanded
    ? explanation.slice(0, TRUNCATE_AT).trimEnd() + '…'
    : explanation;

  return (
    <div className="bg-gray-900 border-t border-gray-800 space-y-3 p-4">
      {/* 1. Header row: badge + EV */}
      <div className="flex items-start justify-between">
        <Badge verdict={hint.verdict} />
        <div className="text-right space-y-0.5">
          {hint.evDeltaBB !== null && hint.evDeltaBB !== 0 && (
            <div className={`text-sm font-mono font-bold ${hint.evDeltaBB < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {hint.evDeltaBB < 0 ? '−' : '+'}{Math.abs(hint.evDeltaBB).toFixed(2)} BB
            </div>
          )}
          {hint.evDeltaPer100 !== null && hint.evDeltaPer100 !== 0 && (
            <div className="text-[11px] font-mono text-gray-500">
              {hint.evDeltaPer100 < 0 ? '−' : '+'}{Math.abs(hint.evDeltaPer100).toFixed(1)} / 100 hands
            </div>
          )}
        </div>
      </div>

      {/* 2. Sizing tell alert */}
      {isSizingTell && (
        <div className="bg-amber-950 border border-amber-800 p-3 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            ⚠ Betting Pattern Tell
          </div>
          <p className="text-xs font-sans text-amber-300 leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* 3. Action comparison: Your Play vs Best Play */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`px-3 py-2 border ${actionsMatch ? 'bg-emerald-950 border-emerald-800' : 'bg-gray-800 border-gray-700'}`}>
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-1">Your Play</div>
          <div className={`text-sm font-bold font-mono capitalize ${actionsMatch ? 'text-emerald-400' : 'text-gray-300'}`}>
            {hint.playerAction}
          </div>
        </div>
        <div className="bg-emerald-950 border border-emerald-800 px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-1">Best Play</div>
          <div className="text-sm font-bold font-mono text-emerald-400 capitalize">
            {hint.gtoAction}
            {hint.gtoRaiseFreq > 0 && hint.gtoRaiseFreq < 1 && (
              <span className="text-emerald-600 font-normal ml-1">
                {Math.round(hint.gtoRaiseFreq * 100)}%
              </span>
            )}
            {hint.gtoCallFreq > 0 && hint.gtoCallFreq < 1 && hint.gtoRaiseFreq === 0 && (
              <span className="text-emerald-600 font-normal ml-1">
                {Math.round(hint.gtoCallFreq * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Equity metrics (postflop) */}
      {showEquity && (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Your Equity</div>
            <div className="text-sm font-mono font-bold text-gray-200">{equityPct}%</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Need to Call</div>
            <div className="text-sm font-mono font-bold text-gray-200">{reqPct}%</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Edge</div>
            <div className={`text-sm font-mono font-bold ${marginPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {marginPct >= 0 ? '+' : ''}{marginPct}%
            </div>
          </div>
        </div>
      )}

      {/* 5. Optimal play split */}
      {(hint.gtoRaiseFreq > 0 || hint.gtoCallFreq > 0) && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Optimal Frequencies</div>
          <div className="flex h-1.5 gap-px overflow-hidden rounded-sm bg-gray-800">
            {hint.gtoRaiseFreq > 0.01 && (
              <div
                className="bg-emerald-600"
                style={{ width: `${hint.gtoRaiseFreq * 100}%` }}
                title={`Raise ${Math.round(hint.gtoRaiseFreq * 100)}%`}
              />
            )}
            {hint.gtoCallFreq > 0.01 && (
              <div
                className="bg-blue-600"
                style={{ width: `${hint.gtoCallFreq * 100}%` }}
                title={`Call ${Math.round(hint.gtoCallFreq * 100)}%`}
              />
            )}
            {hint.gtoFoldFreq > 0.01 && (
              <div
                className="bg-gray-600"
                style={{ width: `${hint.gtoFoldFreq * 100}%` }}
                title={`Fold ${Math.round(hint.gtoFoldFreq * 100)}%`}
              />
            )}
          </div>
          <div className="flex gap-3 text-[11px]">
            {hint.gtoRaiseFreq > 0.01 && (
              <span className="text-emerald-500 font-mono">Raise {Math.round(hint.gtoRaiseFreq * 100)}%</span>
            )}
            {hint.gtoCallFreq > 0.01 && (
              <span className="text-blue-400 font-mono">Call {Math.round(hint.gtoCallFreq * 100)}%</span>
            )}
            {hint.gtoFoldFreq > 0.01 && (
              <span className="text-gray-500 font-mono">Fold {Math.round(hint.gtoFoldFreq * 100)}%</span>
            )}
          </div>
        </div>
      )}

      {/* 6. Explanation text */}
      {!isSizingTell && (
        <div className="border-t border-gray-800 pt-3 space-y-1">
          <p className="text-sm font-sans text-gray-400 leading-relaxed">
            {displayExplanation}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {expanded ? 'Less ↑' : 'More ↓'}
            </button>
          )}
        </div>
      )}

      {/* 7. Range grid (preflop) */}
      {hint.rangeData && heroKey && (
        <div className="border-t border-gray-800 pt-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-2">
            Your Hand in This Range
          </div>
          <RangeGrid rangeData={hint.rangeData} heroHand={heroKey} compact />
        </div>
      )}
    </div>
  );
};
