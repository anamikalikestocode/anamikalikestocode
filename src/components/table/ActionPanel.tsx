import React, { useState, useCallback } from 'react';
import { ValidActions, GameAction } from '../../types/game';
import { formatPercent } from '../../utils/format';

interface ActionPanelProps {
  validActions: ValidActions;
  pot: number;
  onAction: (action: GameAction) => void;
  heroId: number;
  requiredEquity?: number | null;
  heroEquity?: number | null;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  validActions,
  pot,
  onAction,
  heroId,
  requiredEquity,
  heroEquity,
}) => {
  const [raiseAmount, setRaiseAmount] = useState(validActions.minRaise);
  const { canFold, canCheck, canCall, callAmount, canRaise, minRaise, maxRaise } = validActions;

  const handleRaiseSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRaiseAmount(Number(e.target.value));
  }, []);

  // Quick-bet sizes
  const quickBets = [
    { label: '1/3', amount: Math.round(pot * 0.33) },
    { label: '1/2', amount: Math.round(pot * 0.5) },
    { label: '3/4', amount: Math.round(pot * 0.75) },
    { label: 'POT', amount: pot },
    { label: 'ALL-IN', amount: maxRaise },
  ].filter(b => b.amount >= minRaise && b.amount <= maxRaise);

  const evColor = heroEquity !== undefined && heroEquity !== null && requiredEquity !== undefined && requiredEquity !== null
    ? heroEquity >= requiredEquity ? 'text-emerald-400' : 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="bg-gray-950 border-t border-gray-800 p-3 space-y-3">
      {/* Pot odds strip */}
      {canCall && requiredEquity !== null && requiredEquity !== undefined && (
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Call {callAmount.toFixed(1)}bb into {(pot + callAmount).toFixed(1)}bb</span>
          <span>
            Need <span className="text-gray-300">{formatPercent(requiredEquity)}</span>
            {heroEquity !== null && heroEquity !== undefined && (
              <span className={`ml-2 font-bold ${evColor}`}>
                have {formatPercent(heroEquity)}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Raise controls */}
      {canRaise && (
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            {quickBets.map(b => (
              <button
                key={b.label}
                onClick={() => setRaiseAmount(Math.max(minRaise, Math.min(maxRaise, b.amount)))}
                className="flex-1 min-w-0 text-xs py-1 px-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors"
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={0.5}
              value={raiseAmount}
              onChange={handleRaiseSlider}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-xs font-mono text-emerald-400 w-16 text-right">
              {raiseAmount.toFixed(1)}bb
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${[canFold, canCheck || canCall, canRaise].filter(Boolean).length}, 1fr)` }}>
        {canFold && (
          <button
            onClick={() => onAction({ type: 'PLAYER_FOLD', playerId: heroId })}
            className="py-2.5 px-3 bg-gray-800 hover:bg-red-950 border border-gray-700 hover:border-red-800 text-gray-300 hover:text-red-300 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Fold
          </button>
        )}
        {canCheck && !canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CHECK', playerId: heroId })}
            className="py-2.5 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Check
          </button>
        )}
        {canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CALL', playerId: heroId })}
            className="py-2.5 px-3 bg-blue-900 hover:bg-blue-800 border border-blue-700 hover:border-blue-500 text-blue-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Call {callAmount.toFixed(1)}
          </button>
        )}
        {canRaise && (
          <button
            onClick={() => onAction({ type: 'PLAYER_RAISE', playerId: heroId, amount: raiseAmount })}
            className="py-2.5 px-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 hover:border-emerald-500 text-emerald-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Raise {raiseAmount.toFixed(1)}
          </button>
        )}
      </div>
    </div>
  );
};
