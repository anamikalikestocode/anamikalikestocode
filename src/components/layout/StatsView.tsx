import React from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { EVChart } from '../training/EVChart';
import { formatEV } from '../../utils/format';

export const StatsView: React.FC = () => {
  const { sessionStats, handHistory, leakAnalysis, generateLeakReport, clearSession } = useTrainingStore();

  const totalDecisions = sessionStats.optimalCount + sessionStats.marginalCount + sessionStats.mistakeCount + sessionStats.spewCount;
  const gtoRate = totalDecisions > 0 ? ((sessionStats.optimalCount / totalDecisions) * 100).toFixed(0) : '—';
  const mistakeRate = totalDecisions > 0 ? (((sessionStats.mistakeCount + sessionStats.spewCount) / totalDecisions) * 100).toFixed(0) : '—';

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* Session summary */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Hands', value: sessionStats.handsPlayed },
          { label: 'bb Won', value: formatEV(sessionStats.bbWon) },
          { label: 'bb/100', value: sessionStats.handsPlayed > 0 ? sessionStats.evPer100.toFixed(1) : '—' },
          { label: 'GTO Rate', value: `${gtoRate}%` },
          { label: 'Mistake Rate', value: `${mistakeRate}%` },
          { label: 'Spews', value: sessionStats.spewCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 p-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="text-lg font-mono font-bold text-gray-100 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Decision breakdown */}
      {totalDecisions > 0 && (
        <div className="bg-gray-900 border border-gray-800 p-3 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Decision Breakdown</div>
          {[
            { label: 'GTO / Acceptable', count: sessionStats.optimalCount, color: 'bg-emerald-600' },
            { label: 'Marginal', count: sessionStats.marginalCount, color: 'bg-yellow-600' },
            { label: 'Mistake', count: sessionStats.mistakeCount, color: 'bg-orange-600' },
            { label: 'Spew', count: sessionStats.spewCount, color: 'bg-red-700' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-28 text-xs text-gray-400 shrink-0">{label}</div>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: `${totalDecisions > 0 ? (count / totalDecisions) * 100 : 0}%` }}
                />
              </div>
              <div className="text-xs font-mono text-gray-400 w-8 text-right">{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* EV chart */}
      {handHistory.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Cumulative EV</div>
          <EVChart history={handHistory} />
        </div>
      )}

      {/* Leak detection */}
      <div className="bg-gray-900 border border-gray-800 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Leak Detection</div>
          <button
            onClick={generateLeakReport}
            disabled={handHistory.length < 10}
            className="text-xs text-emerald-500 hover:text-emerald-400 disabled:text-gray-700 disabled:cursor-not-allowed"
          >
            {handHistory.length < 10 ? `${handHistory.length}/10 hands` : 'Analyze'}
          </button>
        </div>

        {leakAnalysis && leakAnalysis.topLeaks.length > 0 ? (
          <div className="space-y-3">
            {leakAnalysis.topLeaks.map((leak, i) => (
              <div key={i} className="border border-gray-800 p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-red-400">#{i + 1} LEAK</div>
                  <div className="text-xs font-mono text-red-500">
                    {leak.evLostPer100.toFixed(1)} bb/100
                  </div>
                </div>
                <div className="text-xs text-gray-300">{leak.description}</div>
                <div className="text-xs text-gray-500 italic">{leak.recommendation}</div>
              </div>
            ))}
          </div>
        ) : leakAnalysis ? (
          <div className="text-xs text-gray-600">No significant leaks detected yet. Keep playing.</div>
        ) : (
          <div className="text-xs text-gray-600">Run analysis after 10+ hands to detect leaks.</div>
        )}
      </div>

      {/* Clear */}
      <button
        onClick={clearSession}
        className="w-full py-2 text-xs text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-900 transition-colors"
      >
        Clear Session Stats
      </button>
    </div>
  );
};
