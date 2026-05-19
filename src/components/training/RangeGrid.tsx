import React from 'react';
import { RangeData, HandKey } from '../../types/gto';
import { handKeyToReadable } from '../../utils/format';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function getHandKey(row: number, col: number): HandKey {
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return `${r1}${r2}`; // pocket pair diagonal
  if (row < col) return `${r1}${r2}s`; // suited above diagonal
  return `${r2}${r1}o`; // offsuit below diagonal
}

function freqToColor(freq: number): string {
  if (freq >= 0.9) return '#059669'; // emerald-600
  if (freq >= 0.7) return '#10b981'; // emerald-500
  if (freq >= 0.5) return '#d97706'; // amber-600
  if (freq >= 0.3) return '#b45309'; // amber-700
  if (freq >= 0.1) return '#dc2626'; // red-600
  return '#1f2937'; // gray-800 (fold)
}

interface RangeGridProps {
  rangeData: RangeData;
  heroHand: HandKey | null;
  compact?: boolean;
}

export const RangeGrid: React.FC<RangeGridProps> = ({
  rangeData,
  heroHand,
  compact = false,
}) => {
  const cellSize = compact ? 18 : 26;
  const fontSize = compact ? 7 : 9;

  return (
    <div className="overflow-auto">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(13, ${cellSize}px)`,
          gap: 1,
          width: 'fit-content',
        }}
      >
        {RANKS.map((_, row) =>
          RANKS.map((_, col) => {
            const key = getHandKey(row, col);
            const freq = rangeData.combos[key] ?? 0;
            const isHero = key === heroHand;

            return (
              <div
                key={`${row}-${col}`}
                title={`${handKeyToReadable(key)}: raise ${Math.round(freq * 100)}% of the time`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: freqToColor(freq),
                  fontSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: isHero ? '2px solid #fbbf24' : 'none',
                  outlineOffset: -1,
                  color: freq > 0.15 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                  fontFamily: 'monospace',
                  fontWeight: isHero ? 'bold' : 'normal',
                  cursor: 'default',
                }}
              >
                {!compact && key.length <= 3 ? key : ''}
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-emerald-500" />Always play
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-amber-600" />Sometimes
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-gray-800 border border-gray-600" />Fold
        </span>
      </div>
    </div>
  );
};
