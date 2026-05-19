import React from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useSettingsStore } from '../../store/settingsStore';
import { EVChart } from '../training/EVChart';
import { formatEV, formatPercent } from '../../utils/format';

// GTO baselines from benchmark research
const GTO_VPIP: Record<number, number> = { 2: 0.68, 3: 0.52, 4: 0.42, 5: 0.36, 6: 0.30, 7: 0.27, 8: 0.25, 9: 0.24 };
const GTO_PFR: Record<number, number> = { 2: 0.60, 3: 0.42, 4: 0.32, 5: 0.26, 6: 0.22, 7: 0.19, 8: 0.17, 9: 0.16 };

interface StatRowProps {
  label: string;
  value: string;
  gto?: string;
  status?: 'ok' | 'warn' | 'bad' | null;
  note?: string;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, gto, status, note }) => (
  <div className="flex items-baseline justify-between py-1.5 border-b border-gray-900">
    <div className="text-xs text-gray-400 flex-1">{label}</div>
    <div className="flex items-baseline gap-3">
      {gto && <span className="text-xs text-gray-600">gto: {gto}</span>}
      <span className={`text-sm font-mono font-bold ${
        status === 'bad' ? 'text-red-400' :
        status === 'warn' ? 'text-yellow-400' :
        status === 'ok' ? 'text-emerald-400' :
        'text-gray-200'
      }`}>{value}</span>
    </div>
  </div>
);

export const StatsView: React.FC = () => {
  const { sessionStats, handHistory, leakAnalysis, generateLeakReport, clearSession, numPlayers } = useTrainingStore();
  const { numOpponents } = useSettingsStore();
  const tableSize = numPlayers || (numOpponents + 1);

  const gtoVpip = GTO_VPIP[tableSize] ?? 0.25;
  const gtoPfr = GTO_PFR[tableSize] ?? 0.20;

  const vpipRate = sessionStats.vpip.hands > 0
    ? sessionStats.vpip.voluntary / sessionStats.vpip.hands : null;
  const pfrRate = sessionStats.pfr.hands > 0
    ? sessionStats.pfr.raised / sessionStats.pfr.hands : null;
  const bbDefRate = sessionStats.bbDefense.faced > 0
    ? sessionStats.bbDefense.defended / sessionStats.bbDefense.faced : null;
  const cbetDryRate = sessionStats.cbetStats.dry.count > 0
    ? sessionStats.cbetStats.dry.correctSize / sessionStats.cbetStats.dry.count : null;
  const cbetWetRate = sessionStats.cbetStats.wet.count > 0
    ? sessionStats.cbetStats.wet.correctSize / sessionStats.cbetStats.wet.count : null;
  const bluffFTRate = sessionStats.bluffFollowThrough.started > 0
    ? sessionStats.bluffFollowThrough.completed / sessionStats.bluffFollowThrough.started : null;
  const riverValueRate = sessionStats.riverThinValue.spots > 0
    ? sessionStats.riverThinValue.bet / sessionStats.riverThinValue.spots : null;
  const preflopSizingRate = sessionStats.preflopSizing.opens > 0
    ? sessionStats.preflopSizing.oversized / sessionStats.preflopSizing.opens : null;

  const totalDecisions = sessionStats.optimalCount + sessionStats.marginalCount +
    sessionStats.mistakeCount + sessionStats.spewCount;

  function vpipStatus(): 'ok' | 'warn' | 'bad' | null {
    if (!vpipRate) return null;
    if (vpipRate > gtoVpip + 0.12) return 'bad';
    if (vpipRate > gtoVpip + 0.06) return 'warn';
    return 'ok';
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* Core session */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Hands', value: String(sessionStats.handsPlayed) },
          { label: 'bb/100', value: sessionStats.handsPlayed > 0 ? sessionStats.evPer100.toFixed(1) : '—' },
          { label: 'Net', value: formatEV(sessionStats.bbWon) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 p-2 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
            <div className="text-base font-mono font-bold text-gray-100 mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Decision quality */}
      {totalDecisions > 0 && (
        <div className="bg-gray-900 border border-gray-800 p-3 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Decision Quality</div>
          {[
            { label: 'GTO / Acceptable', count: sessionStats.optimalCount, color: 'bg-emerald-600' },
            { label: 'Marginal',         count: sessionStats.marginalCount, color: 'bg-yellow-600' },
            { label: 'Mistake',          count: sessionStats.mistakeCount,  color: 'bg-orange-600' },
            { label: 'Spew',             count: sessionStats.spewCount,     color: 'bg-red-700' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-28 text-xs text-gray-400 shrink-0">{label}</div>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${(count / totalDecisions) * 100}%` }} />
              </div>
              <div className="text-xs font-mono text-gray-400 w-8 text-right">{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Research-backed stats with GTO baselines */}
      <div className="bg-gray-900 border border-gray-800 p-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Playing Stats <span className="text-gray-700 normal-case">(vs GTO @ {tableSize}-handed)</span>
        </div>
        <div className="space-y-0">
          <StatRow
            label={`VPIP (${sessionStats.vpip.hands} hands)`}
            value={vpipRate !== null ? formatPercent(vpipRate) : '—'}
            gto={formatPercent(gtoVpip)}
            status={vpipStatus()}
          />
          <StatRow
            label={`PFR (${sessionStats.pfr.hands} hands)`}
            value={pfrRate !== null ? formatPercent(pfrRate) : '—'}
            gto={formatPercent(gtoPfr)}
            status={pfrRate !== null ? (pfrRate < gtoPfr - 0.06 ? 'warn' : pfrRate > gtoPfr + 0.08 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`BB Defense (${sessionStats.bbDefense.faced} spots)`}
            value={bbDefRate !== null ? formatPercent(bbDefRate) : '—'}
            gto="≥52%"
            status={bbDefRate !== null ? (bbDefRate < 0.44 ? 'bad' : bbDefRate < 0.50 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`C-bet size (dry, ${sessionStats.cbetStats.dry.count})`}
            value={cbetDryRate !== null ? `${(cbetDryRate * 100).toFixed(0)}% correct` : '—'}
            gto="25–40% pot"
            status={cbetDryRate !== null ? (cbetDryRate < 0.4 ? 'bad' : cbetDryRate < 0.65 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`C-bet size (wet, ${sessionStats.cbetStats.wet.count})`}
            value={cbetWetRate !== null ? `${(cbetWetRate * 100).toFixed(0)}% correct` : '—'}
            gto="50–75% pot"
            status={cbetWetRate !== null ? (cbetWetRate < 0.4 ? 'bad' : cbetWetRate < 0.65 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`River thin value (${sessionStats.riverThinValue.spots})`}
            value={riverValueRate !== null ? formatPercent(riverValueRate) : '—'}
            gto="≥65%"
            status={riverValueRate !== null ? (riverValueRate < 0.40 ? 'bad' : riverValueRate < 0.60 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`Bluff follow-through (${sessionStats.bluffFollowThrough.started})`}
            value={bluffFTRate !== null ? formatPercent(bluffFTRate) : '—'}
            gto="≥55%"
            status={bluffFTRate !== null ? (bluffFTRate < 0.35 ? 'bad' : bluffFTRate < 0.50 ? 'warn' : 'ok') : null}
          />
          <StatRow
            label={`Sizing consistency (${sessionStats.preflopSizing.opens} opens)`}
            value={preflopSizingRate !== null ? formatPercent(preflopSizingRate) : '—'}
            gto="< 15%"
            status={preflopSizingRate !== null ? (preflopSizingRate > 0.40 ? 'bad' : preflopSizingRate > 0.20 ? 'warn' : 'ok') : null}
          />
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Stats sourced from GTO Wizard benchmark + PokerBench research (2025–2026)
        </div>
      </div>

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
              <div key={i} className="border border-gray-800 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wide">#{i + 1} LEAK</div>
                  <div className="text-xs font-mono text-red-500 font-bold">
                    {leak.evLostPer100.toFixed(1)} bb/100
                  </div>
                </div>
                <div className="text-xs text-gray-200">{leak.description}</div>
                <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-1.5">
                  {leak.recommendation}
                </div>
                <div className="text-xs text-gray-700">{leak.sampleSize} decisions analyzed</div>
              </div>
            ))}
          </div>
        ) : leakAnalysis ? (
          <div className="text-xs text-gray-600">No significant leaks detected yet.</div>
        ) : (
          <div className="text-xs text-gray-600 leading-relaxed">
            Analyzes BB defense rate, VPIP, c-bet sizing by board texture, river thin value, and bluff follow-through — the top measured leaks from GTO Wizard + PokerBench research.
          </div>
        )}
      </div>

      <button
        onClick={clearSession}
        className="w-full py-2 text-xs text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-900 transition-colors"
      >
        Clear Session Stats
      </button>
    </div>
  );
};
