import React, { useState, useCallback } from 'react';
import { ValidActions, GameAction } from '../../types/game';

interface ActionPanelProps {
  validActions: ValidActions;
  pot: number;
  onAction: (action: GameAction, equity?: number) => void;
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

  const onlyAllIn = minRaise === maxRaise;
  const quickBets = onlyAllIn ? [] : [
    { label: '⅓ pot', amount: Math.round(pot * 0.33) },
    { label: '½ pot', amount: Math.round(pot * 0.5) },
    { label: '¾ pot', amount: Math.round(pot * 0.75) },
    { label: 'Pot',   amount: pot },
    { label: 'All-in', amount: maxRaise },
  ].filter(b => b.amount >= minRaise && b.amount <= maxRaise);

  return (
    <div className="bg-gray-950 border-t border-gray-800 p-3 space-y-3">
      {/* Raise controls */}
      {canRaise && (
        <div className="space-y-2">
          {quickBets.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {quickBets.map(b => (
                <button
                  key={b.label}
                  onClick={() => setRaiseAmount(Math.max(minRaise, Math.min(maxRaise, b.amount)))}
                  className={`flex-1 min-w-0 py-2 px-1 text-center border transition-colors ${
                    raiseAmount === Math.max(minRaise, Math.min(maxRaise, b.amount))
                      ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide">{b.label}</div>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 px-1">
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              step={0.5}
              value={raiseAmount}
              onChange={handleRaiseSlider}
              className="flex-1 accent-emerald-500 h-1"
            />
            <span className="text-sm font-mono font-bold text-emerald-400 w-16 text-right shrink-0">
              ● {raiseAmount % 1 === 0 ? raiseAmount.toFixed(0) : raiseAmount.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={`grid gap-2.5 ${[canFold, canCheck || canCall, canRaise].filter(Boolean).length === 3 ? 'grid-cols-3' : [canFold, canCheck || canCall, canRaise].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {canFold && (
          <button
            onClick={() => onAction({ type: 'PLAYER_FOLD', playerId: heroId }, heroEquity ?? undefined)}
            className="py-4 px-2 bg-red-950 hover:bg-red-900 active:bg-red-800 border-2 border-red-800 hover:border-red-600 text-red-300 hover:text-red-200 text-sm font-bold uppercase tracking-widest transition-all"
          >
            Fold
          </button>
        )}
        {canCheck && !canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CHECK', playerId: heroId }, heroEquity ?? undefined)}
            className="py-4 px-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 border-2 border-gray-600 hover:border-gray-400 text-gray-100 text-sm font-bold uppercase tracking-widest transition-all"
          >
            Check
          </button>
        )}
        {canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CALL', playerId: heroId }, heroEquity ?? undefined)}
            className="py-4 px-2 bg-blue-900 hover:bg-blue-800 active:bg-blue-700 border-2 border-blue-700 hover:border-blue-500 text-blue-100 text-sm font-bold uppercase tracking-widest transition-all"
          >
            <div>Call</div>
            <div className="text-xs font-mono font-normal mt-0.5 text-blue-300">
              ● {callAmount % 1 === 0 ? callAmount.toFixed(0) : callAmount.toFixed(1)}
            </div>
          </button>
        )}
        {canRaise && (
          <button
            onClick={() => onAction({ type: 'PLAYER_RAISE', playerId: heroId, amount: raiseAmount }, heroEquity ?? undefined)}
            className="py-4 px-2 bg-emerald-900 hover:bg-emerald-800 active:bg-emerald-700 border-2 border-emerald-700 hover:border-emerald-500 text-emerald-100 text-sm font-bold uppercase tracking-widest transition-all"
          >
            <div>{raiseAmount >= maxRaise ? 'All-in' : 'Raise'}</div>
            <div className="text-xs font-mono font-normal mt-0.5 text-emerald-300">
              ● {raiseAmount % 1 === 0 ? raiseAmount.toFixed(0) : raiseAmount.toFixed(1)}
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
