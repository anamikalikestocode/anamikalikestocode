import React from 'react';
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
  if (pending) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 text-xs text-gray-500">
        Analyzing...
      </div>
    );
  }

  const heroKey = heroCards ? handToKey(heroCards) : null;

  return (
    <div className="bg-gray-900 border border-gray-700 space-y-3 p-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Badge verdict={hint.verdict} />
        <div className="text-right space-y-0.5">
          {hint.evDeltaBB !== null && hint.evDeltaBB !== 0 && (
            <div className={`text-xs font-mono font-bold ${hint.evDeltaBB < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatEV(hint.evDeltaBB)} EV
            </div>
          )}
          {hint.evDeltaPer100 !== null && hint.evDeltaPer100 !== 0 && (
            <div className="text-xs text-gray-500">
              {hint.evDeltaPer100 < 0 ? '' : '+'}{hint.evDeltaPer100.toFixed(1)} bb/100
            </div>
          )}
        </div>
      </div>

      {/* Action comparison */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 px-2 py-1.5">
          <div className="text-gray-500 mb-0.5">YOU PLAYED</div>
          <div className="font-bold uppercase text-gray-100">{hint.playerAction}</div>
        </div>
        <div className="bg-gray-800 px-2 py-1.5">
          <div className="text-gray-500 mb-0.5">GTO LINE</div>
          <div className={`font-bold uppercase ${
            hint.gtoAction === hint.playerAction ? 'text-emerald-400' : 'text-yellow-400'
          }`}>
            {hint.gtoAction}
            {hint.gtoRaiseFreq > 0 && hint.gtoRaiseFreq < 1 &&
              <span className="text-gray-400 font-normal ml-1">
                {Math.round(hint.gtoRaiseFreq * 100)}%
              </span>
            }
          </div>
        </div>
      </div>

      {/* Mixed strategy breakdown */}
      {(hint.gtoRaiseFreq > 0 || hint.gtoCallFreq > 0) && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">GTO Mix</div>
          <div className="flex gap-1 h-2">
            {hint.gtoRaiseFreq > 0.01 && (
              <div
                className="bg-emerald-600 rounded-sm"
                style={{ width: `${hint.gtoRaiseFreq * 100}%` }}
                title={`Raise ${Math.round(hint.gtoRaiseFreq * 100)}%`}
              />
            )}
            {hint.gtoCallFreq > 0.01 && (
              <div
                className="bg-blue-600 rounded-sm"
                style={{ width: `${hint.gtoCallFreq * 100}%` }}
                title={`Call ${Math.round(hint.gtoCallFreq * 100)}%`}
              />
            )}
            {hint.gtoFoldFreq > 0.01 && (
              <div
                className="bg-gray-600 rounded-sm"
                style={{ width: `${hint.gtoFoldFreq * 100}%` }}
                title={`Fold ${Math.round(hint.gtoFoldFreq * 100)}%`}
              />
            )}
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            {hint.gtoRaiseFreq > 0.01 && <span className="text-emerald-500">R {Math.round(hint.gtoRaiseFreq * 100)}%</span>}
            {hint.gtoCallFreq > 0.01 && <span className="text-blue-400">C {Math.round(hint.gtoCallFreq * 100)}%</span>}
            {hint.gtoFoldFreq > 0.01 && <span className="text-gray-400">F {Math.round(hint.gtoFoldFreq * 100)}%</span>}
          </div>
        </div>
      )}

      {/* Explanation */}
      <p className="text-xs text-gray-300 leading-relaxed border-t border-gray-800 pt-2">
        {hint.explanation}
      </p>

      {/* Range grid (preflop) */}
      {hint.rangeData && heroKey && (
        <div className="border-t border-gray-800 pt-2">
          <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Position Range</div>
          <RangeGrid rangeData={hint.rangeData} heroHand={heroKey} compact />
        </div>
      )}
    </div>
  );
};
