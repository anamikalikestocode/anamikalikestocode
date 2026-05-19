import React, { useState, useCallback } from 'react';
import { ValidActions, GameAction } from '../../types/game';
import { formatPercent } from '../../utils/format';

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

  // Quick-bet sizes — exclude if min===max (only all-in)
  const onlyAllIn = minRaise === maxRaise;
  const quickBets = onlyAllIn ? [] : [
    { label: '⅓ pot', amount: Math.round(pot * 0.33) },
    { label: '½ pot', amount: Math.round(pot * 0.5) },
    { label: '¾ pot', amount: Math.round(pot * 0.75) },
    { label: 'Pot', amount: pot },
    { label: 'All-in', amount: maxRaise },
  ].filter(b => b.amount >= minRaise && b.amount <= maxRaise);

  const favorable = heroEquity !== undefined && heroEquity !== null
    && requiredEquity !== undefined && requiredEquity !== null
    && heroEquity >= requiredEquity;
  const unfavorable = heroEquity !== undefined && heroEquity !== null
    && requiredEquity !== undefined && requiredEquity !== null
    && heroEquity < requiredEquity;
  const evColor = favorable ? 'text-emerald-400' : unfavorable ? 'text-red-400' : 'text-gray-400';
  const potOddsColor = favorable ? 'text-emerald-400' : unfavorable ? 'text-red-400' : 'text-gray-500';

  const numButtons = [canFold, canCheck || canCall, canRaise].filter(Boolean).length;

  return (
    <div className="bg-gray-950 border-t border-gray-800 p-3 space-y-3">
      {/* Pot odds strip */}
      {canCall && requiredEquity !== null && requiredEquity !== undefined && (
        <div className={`text-xs px-2 py-1.5 border font-sans leading-tight ${
          favorable
            ? 'bg-emerald-950/50 border-emerald-900 text-emerald-300'
            : unfavorable
            ? 'bg-red-950/50 border-red-900 text-red-300'
            : 'bg-gray-900 border-gray-800 text-gray-400'
        }`}>
          Call <span className="font-mono font-bold">{callAmount.toFixed(1)}BB</span>
          {' → pot '}
          <span className="font-mono font-bold">{(pot + callAmount).toFixed(1)}BB</span>
          <span className="mx-1.5 text-gray-600">|</span>
          Need <span className={`font-mono font-bold ${potOddsColor}`}>{formatPercent(requiredEquity)}</span>
          {heroEquity !== null && heroEquity !== undefined && (
            <>
              <span className="mx-1.5 text-gray-600">|</span>
              Have <span className={`font-mono font-bold ${evColor}`}>{formatPercent(heroEquity)}</span>
              <span className={`ml-1 font-bold ${evColor}`}>{favorable ? '✓' : '✗'}</span>
            </>
          )}
        </div>
      )}

      {/* Raise controls */}
      {canRaise && (
        <div className="space-y-2">
          {quickBets.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {quickBets.map(b => (
                <button
                  key={b.label}
                  onClick={() => setRaiseAmount(Math.max(minRaise, Math.min(maxRaise, b.amount)))}
                  className="flex-1 min-w-0 flex flex-col items-center py-1.5 px-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">{b.label}</span>
                  <span className="text-[10px] font-mono text-gray-300">{b.amount.toFixed(1)}BB</span>
                </button>
              ))}
            </div>
          )}
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
            <span className="text-xs font-mono text-emerald-400 w-20 text-right shrink-0">
              {raiseAmount.toFixed(1)}BB
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${numButtons}, 1fr)` }}>
        {canFold && (
          <button
            onClick={() => onAction({ type: 'PLAYER_FOLD', playerId: heroId }, heroEquity ?? undefined)}
            className="py-3 px-3 bg-gray-800 hover:bg-red-950 border border-gray-700 hover:border-red-800 text-gray-300 hover:text-red-300 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Fold
          </button>
        )}
        {canCheck && !canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CHECK', playerId: heroId }, heroEquity ?? undefined)}
            className="py-3 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Check
          </button>
        )}
        {canCall && (
          <button
            onClick={() => onAction({ type: 'PLAYER_CALL', playerId: heroId }, heroEquity ?? undefined)}
            className="py-3 px-3 bg-blue-900 hover:bg-blue-800 border border-blue-700 hover:border-blue-500 text-blue-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Call {callAmount.toFixed(1)}BB
          </button>
        )}
        {canRaise && (
          <button
            onClick={() => onAction({ type: 'PLAYER_RAISE', playerId: heroId, amount: raiseAmount }, heroEquity ?? undefined)}
            className="py-3 px-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 hover:border-emerald-500 text-emerald-200 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Raise {raiseAmount.toFixed(1)}BB
          </button>
        )}
      </div>
    </div>
  );
};
