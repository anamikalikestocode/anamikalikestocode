import React from 'react';

interface EquityMeterProps {
  equity: number | null;
  requiredEquity: number | null;
  loading?: boolean;
  potOdds?: number;
}

export const EquityMeter: React.FC<EquityMeterProps> = ({
  equity,
  requiredEquity,
  loading = false,
}) => {
  if (loading || equity === null) {
    return (
      <div className="px-4 py-2 border-t border-gray-800">
        <span className="text-xs text-gray-600 animate-pulse">Calculating odds…</span>
      </div>
    );
  }

  const eqPct = Math.round(equity * 100);
  const reqPct = requiredEquity !== null ? Math.round(requiredEquity * 100) : null;
  const isGood = reqPct !== null ? equity >= requiredEquity! : null;

  // Facing a bet — plain English verdict
  if (reqPct !== null) {
    return (
      <div className={`px-4 py-2.5 border-t flex items-center justify-between gap-4 ${
        isGood
          ? 'border-emerald-900/40 bg-emerald-950/25'
          : 'border-red-900/40 bg-red-950/15'
      }`}>
        <div className="text-sm leading-snug">
          <span className="text-gray-400">You win </span>
          <span className={`font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>{eqPct}%</span>
          <span className="text-gray-600"> of the time · only need </span>
          <span className="text-gray-400 font-medium">{reqPct}%</span>
          <span className="text-gray-600"> to break even</span>
        </div>
        <span className={`text-xl font-bold shrink-0 ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
          {isGood ? '✓' : '✗'}
        </span>
      </div>
    );
  }

  // No bet — just show win rate with a clean bar
  return (
    <div className="px-4 py-2.5 border-t border-gray-800 flex items-center gap-3">
      <span className="text-xs text-gray-500 shrink-0">You win this hand</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            eqPct >= 50 ? 'bg-emerald-500' : eqPct >= 33 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${eqPct}%` }}
        />
      </div>
      <span className={`text-sm font-bold font-mono shrink-0 ${
        eqPct >= 50 ? 'text-emerald-400' : eqPct >= 33 ? 'text-yellow-400' : 'text-red-400'
      }`}>{eqPct}%</span>
    </div>
  );
};
