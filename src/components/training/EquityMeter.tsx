import React from 'react';
import { formatPercent } from '../../utils/format';

interface EquityMeterProps {
  equity: number | null; // 0-1
  requiredEquity: number | null; // 0-1, break-even threshold
  loading?: boolean;
  potOdds?: number; // pot odds fraction (call / pot+call)
}

export const EquityMeter: React.FC<EquityMeterProps> = ({
  equity,
  requiredEquity,
  loading = false,
  potOdds,
}) => {
  if (loading || equity === null) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>EQUITY</span>
          <span>CALCULATING...</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gray-700 animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  const eqPct = equity * 100;
  const reqPct = requiredEquity ? requiredEquity * 100 : null;
  const isPositiveEV = reqPct !== null ? equity >= requiredEquity! : null;

  const barColor = isPositiveEV === null
    ? 'bg-blue-500'
    : isPositiveEV
      ? 'bg-emerald-500'
      : 'bg-red-500';

  return (
    <div className="bg-gray-900 border border-gray-800 p-3 space-y-2">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-gray-400 tracking-wide">WIN EQUITY</span>
        <div className="flex items-center gap-3">
          {reqPct !== null && (
            <span className="text-gray-500">
              need {formatPercent(requiredEquity!)}
            </span>
          )}
          <span className={`font-bold text-sm ${
            isPositiveEV === null ? 'text-blue-400' :
            isPositiveEV ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatPercent(equity)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-2.5 bg-gray-800 rounded-full overflow-visible">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(100, eqPct)}%` }}
        />
        {reqPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white opacity-70 -mt-0.5"
            style={{ left: `${Math.min(100, reqPct)}%` }}
            title={`Required: ${formatPercent(requiredEquity!)}`}
          />
        )}
      </div>

      {/* Pot odds label */}
      {potOdds !== null && potOdds !== undefined && (
        <div className="text-xs text-gray-500 flex justify-between">
          <span>Pot odds</span>
          <span className="text-gray-400">{formatPercent(potOdds)} to call</span>
        </div>
      )}
    </div>
  );
};
