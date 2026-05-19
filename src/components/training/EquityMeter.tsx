import React from 'react';
import { formatPercent } from '../../utils/format';

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
      <div className="bg-gray-900 border-t border-gray-800 px-3 py-2 flex items-center gap-3">
        <span className="text-xs text-gray-500 font-sans">Calculating odds…</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gray-700 animate-pulse w-1/2 rounded-full" />
        </div>
      </div>
    );
  }

  const eqPct = equity * 100;
  const reqPct = requiredEquity ? requiredEquity * 100 : null;
  const isGood = reqPct !== null ? equity >= requiredEquity! : null;

  const barColor = isGood === null ? 'bg-blue-500' : isGood ? 'bg-emerald-500' : 'bg-red-500';
  const numColor = isGood === null ? 'text-blue-400' : isGood ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-sans">Your chance of winning</span>
        <div className="flex items-center gap-2">
          {reqPct !== null && (
            <span className="text-[11px] text-gray-600 font-sans">
              need {formatPercent(requiredEquity!)} to call
            </span>
          )}
          <span className={`text-sm font-bold font-mono ${numColor}`}>
            {formatPercent(equity)}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-800 rounded-full overflow-visible">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(100, eqPct)}%` }}
        />
        {reqPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-white/60 rounded"
            style={{ left: `${Math.min(100, reqPct)}%` }}
            title={`You need ${formatPercent(requiredEquity!)} to break even`}
          />
        )}
      </div>
    </div>
  );
};
