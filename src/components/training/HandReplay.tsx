import React, { useState } from 'react';
import { HandSnapshot, StreetSnapshot } from '../../types/training';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { EquityMeter } from './EquityMeter';
import { GTOHintPanel } from './GTOHintPanel';
import { formatEV, formatStack } from '../../utils/format';

interface HandReplayProps {
  hand: HandSnapshot;
  onClose?: () => void;
}

export const HandReplay: React.FC<HandReplayProps> = ({ hand, onClose }) => {
  const [streetIdx, setStreetIdx] = useState(0);
  const street = hand.streets[streetIdx];
  if (!street) return null;

  const hasNext = streetIdx < hand.streets.length - 1;
  const hasPrev = streetIdx > 0;

  return (
    <div className="bg-gray-950 border border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <div className="text-xs text-gray-400">
          Hand #{hand.handNumber} · {new Date(hand.timestamp).toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-bold ${hand.heroNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatEV(hand.heroNet)}
          </span>
          {onClose && (
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-xs">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Street tabs */}
      <div className="flex border-b border-gray-800">
        {hand.streets.map((s, i) => (
          <button
            key={i}
            onClick={() => setStreetIdx(i)}
            className={`flex-1 py-1.5 text-xs uppercase tracking-wide transition-colors ${
              i === streetIdx
                ? 'bg-gray-800 text-gray-100 border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-300'
            } ${s.hint?.verdict === 'mistake' || s.hint?.verdict === 'spew' ? 'text-red-500' : ''}`}
          >
            {s.street}
            {s.hint && s.hint.verdict !== 'gto' && s.hint.verdict !== 'acceptable' && (
              <span className="ml-1 text-red-500">!</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Board */}
        <div className="flex gap-1.5 justify-center">
          {[0,1,2,3,4].map(i => (
            <Card
              key={i}
              card={street.board[i] ?? null}
              size="md"
              dimmed={i >= street.board.length}
            />
          ))}
        </div>

        {/* Hero cards */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex gap-1">
            <Card card={hand.heroCards[0]} size="sm" />
            <Card card={hand.heroCards[1]} size="sm" />
          </div>
          <div className="text-xs text-gray-400">{street.heroPosition} · {formatStack(street.heroStack)}bb</div>
        </div>

        {/* Actions this street */}
        {street.actions.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 p-2 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Actions</div>
            {street.actions.map((a, i) => (
              <div key={i} className="text-xs flex justify-between">
                <span className="text-gray-400">Player {a.playerId}</span>
                <span className={`font-mono ${
                  a.type === 'FOLD' ? 'text-red-400' :
                  a.type === 'RAISE' ? 'text-emerald-400' :
                  a.type === 'CALL' ? 'text-blue-400' : 'text-gray-300'
                }`}>
                  {a.type}{a.amount ? ` ${a.amount.toFixed(1)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Equity */}
        {street.heroEquity > 0 && (
          <EquityMeter
            equity={street.heroEquity}
            requiredEquity={street.hint?.requiredEquity ?? null}
            loading={false}
          />
        )}

        {/* GTO hint */}
        {street.hint && (
          <GTOHintPanel hint={street.hint} heroCards={hand.heroCards} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex border-t border-gray-800">
        <button
          onClick={() => setStreetIdx(i => i - 1)}
          disabled={!hasPrev}
          className="flex-1 py-2 text-xs text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <div className="border-l border-r border-gray-800 px-3 flex items-center text-xs text-gray-600">
          {streetIdx + 1}/{hand.streets.length}
        </div>
        <button
          onClick={() => setStreetIdx(i => i + 1)}
          disabled={!hasNext}
          className="flex-1 py-2 text-xs text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
