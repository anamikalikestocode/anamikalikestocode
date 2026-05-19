import React, { useState } from 'react';
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
  tooltip?: string;
  current?: number;
  target?: number;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, gto, status, note, tooltip, current, target }) => {
  const barMax = current !== undefined && target !== undefined
    ? Math.max(current, target) * 1.1
    : null;
  const currentPct = barMax && current !== undefined ? Math.min((current / barMax) * 100, 100) : 0;
  const targetPct  = barMax && target  !== undefined ? Math.min((target  / barMax) * 100, 100) : 0;

  const barColor =
    status === 'bad'  ? 'bg-red-500' :
    status === 'warn' ? 'bg-yellow-500' :
    status === 'ok'   ? 'bg-emerald-500' :
    'bg-gray-500';

  return (
    <div className="py-2 border-b border-gray-900 space-y-1">
      <div className="flex items-baseline justify-between">
        <div
          className="text-xs text-gray-400 flex-1 font-sans"
          title={tooltip}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-3">
          {gto && <span className="text-xs text-gray-600 font-sans">gto: {gto}</span>}
          <span className={`text-sm font-mono font-bold ${
            status === 'bad'  ? 'text-red-400'     :
            status === 'warn' ? 'text-yellow-400'  :
            status === 'ok'   ? 'text-emerald-400' :
            'text-gray-200'
          }`}>{value}</span>
        </div>
      </div>
      {barMax !== null && (
        <div className="relative h-[3px] bg-gray-800 overflow-visible" style={{ borderRadius: 2 }}>
          <div
            className={`absolute top-0 left-0 h-full ${barColor} transition-all`}
            style={{ width: `${currentPct}%`, borderRadius: 2 }}
          />
          {/* GTO target tick */}
          <div
            className="absolute top-[-2px] w-[2px] h-[7px] bg-white/60"
            style={{ left: `${targetPct}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const StatsView: React.FC = () => {
  const { sessionStats, handHistory, leakAnalysis, generateLeakReport, clearSession, numPlayers } = useTrainingStore();
  const { numOpponents } = useSettingsStore();
  const tableSize = numPlayers || (numOpponents + 1);
  const [expandedLeaks, setExpandedLeaks] = useState<Record<number, boolean>>({});

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

  const toggleLeak = (i: number) =>
    setExpandedLeaks(prev => ({ ...prev, [i]: !prev[i] }));

  // Empty state
  if (sessionStats.handsPlayed === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
        <div className="text-gray-600 text-2xl">▦</div>
        <div className="text-sm text-gray-400 font-sans">No hands played yet.</div>
        <div className="text-xs text-gray-600 font-sans">Start playing to see your stats.</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">

      {/* Core session */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 border border-gray-800 p-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Hands</div>
          <div className="text-base font-mono font-bold text-gray-100 mt-1">{sessionStats.handsPlayed}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 text-center">
          <div
            className="text-[11px] font-medium uppercase tracking-widest text-gray-500 cursor-help"
            title="How many chips your decisions earned or lost per 100 hands — luck removed."
          >
            Decision Score
          </div>
          <div className="text-[10px] text-gray-700 font-sans">per 100 hands</div>
          <div className="text-base font-mono font-bold text-gray-100 mt-0.5">
            {sessionStats.handsPlayed > 0 ? sessionStats.evPer100.toFixed(1) : '—'}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Net Won</div>
          <div className="text-base font-mono font-bold text-gray-100 mt-1">{formatEV(sessionStats.bbWon)}</div>
        </div>
      </div>

      {/* Decision quality */}
      {totalDecisions > 0 && (
        <div className="bg-gray-900 border border-gray-800 p-3 space-y-2.5">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Decision Quality</div>
          {[
            { label: 'Good',    count: sessionStats.optimalCount,  color: 'bg-emerald-600' },
            { label: 'Close',   count: sessionStats.marginalCount,  color: 'bg-yellow-600' },
            { label: 'Mistake', count: sessionStats.mistakeCount,   color: 'bg-orange-600' },
            { label: 'Blunder', count: sessionStats.spewCount,      color: 'bg-red-700'    },
          ].map(({ label, count, color }) => {
            const pct = totalDecisions > 0 ? Math.round((count / totalDecisions) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="w-28 text-xs text-gray-400 shrink-0 font-sans">{label}</div>
                <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${(count / totalDecisions) * 100}%` }} />
                </div>
                <div className="text-xs font-mono text-gray-400 w-12 text-right">
                  {count} <span className="text-gray-600">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Research-backed stats with GTO baselines */}
      <div className="bg-gray-900 border border-gray-800 p-3">
        <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-1">
          Playing Stats{' '}
          <span className="text-gray-700 normal-case font-normal text-[10px]">(vs optimal, {tableSize}-handed)</span>
        </div>
        <div className="space-y-0">
          <StatRow
            label={`Hands you entered (${sessionStats.vpip.hands} played)`}
            value={vpipRate !== null ? formatPercent(vpipRate) : '—'}
            gto={formatPercent(gtoVpip)}
            status={vpipStatus()}
            tooltip="How often you voluntarily put chips in preflop by calling or raising. Excludes forced blinds. Optimal rate varies by table size."
            current={vpipRate ?? undefined}
            target={gtoVpip}
          />
          <StatRow
            label={`Pre-flop raises (${sessionStats.pfr.hands} hands)`}
            value={pfrRate !== null ? formatPercent(pfrRate) : '—'}
            gto={formatPercent(gtoPfr)}
            status={pfrRate !== null ? (pfrRate < gtoPfr - 0.06 ? 'warn' : pfrRate > gtoPfr + 0.08 ? 'warn' : 'ok') : null}
            tooltip="How often you raise (not just call) before the flop. If this is much lower than your 'hands entered' rate, you're calling too passively."
            current={pfrRate ?? undefined}
            target={gtoPfr}
          />
          <StatRow
            label={`Big blind defense (${sessionStats.bbDefense.faced} spots)`}
            value={bbDefRate !== null ? formatPercent(bbDefRate) : '—'}
            gto="≥52%"
            status={bbDefRate !== null ? (bbDefRate < 0.44 ? 'bad' : bbDefRate < 0.50 ? 'warn' : 'ok') : null}
            tooltip="When someone raises and you're in the big blind, how often you call or re-raise. Folding more than 48% gives opponents a free profit on their steal."
            current={bbDefRate ?? undefined}
            target={0.52}
          />
          <StatRow
            label={`Continuation bet — dry boards (${sessionStats.cbetStats.dry.count})`}
            value={cbetDryRate !== null ? `${(cbetDryRate * 100).toFixed(0)}% correct` : '—'}
            gto="25–40% pot"
            status={cbetDryRate !== null ? (cbetDryRate < 0.4 ? 'bad' : cbetDryRate < 0.65 ? 'warn' : 'ok') : null}
            tooltip="When you raised pre-flop and bet the flop on a dry/unconnected board: optimal size is 25–33% of the pot. Bigger tells opponents you have a strong hand."
            current={cbetDryRate ?? undefined}
            target={0.65}
          />
          <StatRow
            label={`Continuation bet — wet boards (${sessionStats.cbetStats.wet.count})`}
            value={cbetWetRate !== null ? `${(cbetWetRate * 100).toFixed(0)}% correct` : '—'}
            gto="50–75% pot"
            status={cbetWetRate !== null ? (cbetWetRate < 0.4 ? 'bad' : cbetWetRate < 0.65 ? 'warn' : 'ok') : null}
            tooltip="When you raised pre-flop and bet the flop on a wet/connected board: optimal size is 50–75% of the pot to charge flush and straight draws."
            current={cbetWetRate ?? undefined}
            target={0.65}
          />
          <StatRow
            label={`River value bets (${sessionStats.riverThinValue.spots} spots)`}
            value={riverValueRate !== null ? formatPercent(riverValueRate) : '—'}
            gto="≥65%"
            status={riverValueRate !== null ? (riverValueRate < 0.40 ? 'bad' : riverValueRate < 0.60 ? 'warn' : 'ok') : null}
            tooltip="Spots where you had 54–72% equity on the river and nobody bet — a small bet here earns 1–2 extra big blinds that checking gives away for free."
            current={riverValueRate ?? undefined}
            target={0.65}
          />
          <StatRow
            label={`Bluff follow-through (${sessionStats.bluffFollowThrough.started} started)`}
            value={bluffFTRate !== null ? formatPercent(bluffFTRate) : '—'}
            gto="≥55%"
            status={bluffFTRate !== null ? (bluffFTRate < 0.35 ? 'bad' : bluffFTRate < 0.50 ? 'warn' : 'ok') : null}
            tooltip="When you bluffed the flop and turn, how often you completed the bluff on the river. Giving up halfway wastes the chips already invested."
            current={bluffFTRate ?? undefined}
            target={0.55}
          />
          <StatRow
            label={`Bet sizing consistency (${sessionStats.preflopSizing.opens} raises)`}
            value={preflopSizingRate !== null ? formatPercent(preflopSizingRate) : '—'}
            gto="< 15%"
            status={preflopSizingRate !== null ? (preflopSizingRate > 0.40 ? 'bad' : preflopSizingRate > 0.20 ? 'warn' : 'ok') : null}
            tooltip="How often your pre-flop raise was significantly larger than standard (2.5× from Button/Cutoff, 3× from early position). Big raises with big hands is a pattern opponents will exploit."
            current={preflopSizingRate ?? undefined}
            target={0.15}
          />
        </div>
        <div className="mt-2 text-[10px] text-gray-700 font-sans">
          Stats sourced from GTO Wizard benchmark + PokerBench research (2025–2026)
        </div>
      </div>

      {/* EV chart */}
      {handHistory.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 p-3">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500 mb-2">Chips Won Over Time</div>
          <EVChart history={handHistory} />
        </div>
      )}

      {/* Leak detection */}
      <div className="bg-gray-900 border border-gray-800 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Leak Detection</div>
          <button
            onClick={generateLeakReport}
            disabled={handHistory.length < 10}
            className="text-xs text-emerald-500 hover:text-emerald-400 disabled:text-gray-700 disabled:cursor-not-allowed font-sans"
          >
            {handHistory.length < 10 ? `${handHistory.length}/10 hands` : 'Analyze'}
          </button>
        </div>

        {leakAnalysis && leakAnalysis.topLeaks.length > 0 ? (
          <div className="space-y-3">
            {leakAnalysis.topLeaks.map((leak, i) => {
              const severity = leak.evLostPer100 > 3 ? 'red' : leak.evLostPer100 > 1 ? 'amber' : 'gray';
              const isExpanded = expandedLeaks[i] ?? false;
              return (
                <div key={i} className="border border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        severity === 'red' ? 'bg-red-500' :
                        severity === 'amber' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="text-xs font-bold text-red-400 uppercase tracking-wide">
                        #{i + 1} Leak
                      </div>
                    </div>
                    <div className="text-xs font-mono text-red-500 font-bold">
                      {leak.evLostPer100.toFixed(1)} BB / 100 hands
                    </div>
                  </div>
                  <div className="text-xs text-gray-200 font-sans leading-snug">{leak.description}</div>
                  <button
                    onClick={() => toggleLeak(i)}
                    className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors font-sans"
                  >
                    {isExpanded ? 'Hide fix ↑' : 'Show fix ↓'}
                  </button>
                  {isExpanded && (
                    <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-2 font-sans">
                      {leak.recommendation}
                      <div className="text-gray-700 mt-1">{leak.sampleSize} decisions analyzed</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : leakAnalysis ? (
          <div className="text-xs text-gray-600 font-sans">No significant leaks detected yet.</div>
        ) : (
          <div className="text-xs text-gray-600 leading-relaxed font-sans">
            Analyzes big blind defense, how often you enter pots, continuation bet sizing, river value bets, and bluff follow-through — the top measured leaks from GTO Wizard + PokerBench research.
          </div>
        )}
      </div>

      <button
        onClick={clearSession}
        className="w-full py-2 text-xs text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-900 transition-colors font-sans"
      >
        Clear Session Stats
      </button>
    </div>
  );
};
