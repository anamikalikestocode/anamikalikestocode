import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HandSnapshot, SessionStats, StreetSnapshot,
  LeakAnalysis, DrillFilter, SizingTell,
} from '../types/training';
import { HandCards, BoardCards } from '../types/cards';
import { Position } from '../types/game';
import { SpotType, SpotStat, LeakReport } from '../types/gto';

// ── GTO baselines drawn from research ────────────────────────────────────────
const GTO_VPIP_BY_PLAYERS: Record<number, number> = {
  2: 0.68, 3: 0.52, 4: 0.42, 5: 0.36, 6: 0.30, 7: 0.27, 8: 0.25, 9: 0.24,
};
const GTO_PFR_BY_PLAYERS: Record<number, number> = {
  2: 0.60, 3: 0.42, 4: 0.32, 5: 0.26, 6: 0.22, 7: 0.19, 8: 0.17, 9: 0.16,
};
const GTO_BB_DEFENSE = 0.52; // defend >52% vs BTN steal at 100bb (MDF)

function freshStats(): SessionStats {
  return {
    handsPlayed: 0,
    totalEvDelta: 0,
    evPer100: 0,
    mistakeCount: 0,
    spewCount: 0,
    optimalCount: 0,
    marginalCount: 0,
    bbWon: 0,
    startTime: Date.now(),
    spotStats: {} as Record<SpotType, SpotStat>,
    vpip: { hands: 0, voluntary: 0 },
    pfr: { hands: 0, raised: 0 },
    bbDefense: { faced: 0, defended: 0 },
    cbetStats: {
      dry: { count: 0, correctSize: 0 },
      wet: { count: 0, correctSize: 0 },
    },
    riverThinValue: { spots: 0, bet: 0 },
    sizingTells: [],
    bluffFollowThrough: { started: 0, completed: 0 },
    preflopSizing: { opens: 0, oversized: 0 },
  };
}

// ── Leak detection with research-backed specific leaks ───────────────────────

const SPOT_LABELS: Partial<Record<SpotType, string>> = {
  flop_vs_cbet: 'c-bets on the flop',
  river_bluff_catch: 'river bluff-catch spots',
  river_bluff: 'river bluffs',
  preflop_vs_3bet: '3-bet pots preflop',
  flop_cbet: 'c-betting the flop',
  turn_vs_barrel: 'turn barrels',
  preflop_squeeze: 'squeeze spots',
};

const SPOT_RECS: Partial<Record<SpotType, string>> = {
  flop_vs_cbet: 'Over-folding to c-bets is the #1 measured LLM leak (1–3 bb/100). On wet boards defend wider; on dry boards be selective. Use MDF: call at least pot/(pot+bet) of your range regardless of hand.',
  river_bluff_catch: 'MDF applies on river too. You must call ~pot/(pot+bet) of your range. A solver never over-folds vs reasonable bets. Catching one bluff per session recovers significant EV.',
  river_bluff: 'Completing bluffs started on earlier streets is critical. If you fired flop+turn as a bluff, folding river is almost always a mistake — your opponent can fold better hands. Finish the story.',
  preflop_vs_3bet: 'Tighten your 4-bet and expand your flat-call range vs 3-bets. UTG/CO opens facing a BB 3-bet should flat AQs-AJs, KQs rather than folding.',
  flop_cbet: 'C-bet size should match board texture: 25–33% on dry paired boards, 50–66% on connected/wet boards. Uniform sizing is a range tell — it makes you predictable.',
  turn_vs_barrel: 'On the turn, re-evaluate your equity. Many flop calls become clear folds on blanks. But do not over-fold — if you defended flop correctly, defend turn proportionally.',
  preflop_squeeze: 'Squeeze range needs to be tight and strong. Avoid squeezing weak aces and low suited connectors — they play poorly when called by the original raiser.',
};

function computeLeaks(history: HandSnapshot[], stats: SessionStats, numPlayers: number): LeakReport[] {
  const leaks: LeakReport[] = [];

  // 1. Spot-type EV aggregation (original logic)
  const spotMap: Record<string, { evDelta: number; count: number; mistakes: number; spews: number }> = {};
  for (const hand of history) {
    for (const street of hand.streets) {
      if (!street.hint) continue;
      const key = street.spotType;
      if (!spotMap[key]) spotMap[key] = { evDelta: 0, count: 0, mistakes: 0, spews: 0 };
      spotMap[key].evDelta += street.hint.evDeltaBB ?? 0;
      spotMap[key].count += 1;
      if (street.hint.verdict === 'mistake') spotMap[key].mistakes += 1;
      if (street.hint.verdict === 'spew') spotMap[key].spews += 1;
    }
  }

  const spotLeaks: LeakReport[] = Object.entries(spotMap)
    .filter(([, v]) => v.count >= 5 && v.evDelta < -0.5)
    .map(([spot, v]) => {
      const spotType = spot as SpotType;
      const evLostPer100 = (v.evDelta / history.length) * 100;
      return {
        spotType,
        description: `Losing EV in ${SPOT_LABELS[spotType] ?? spot}`,
        evLostPer100,
        sampleSize: v.count,
        recommendation: SPOT_RECS[spotType] ?? 'Review GTO ranges for this spot.',
      };
    })
    .sort((a, b) => a.evLostPer100 - b.evLostPer100);

  leaks.push(...spotLeaks.slice(0, 2));

  // 2. BB over-folding (research-identified #1 leak)
  if (stats.bbDefense.faced >= 10) {
    const defenseRate = stats.bbDefense.defended / stats.bbDefense.faced;
    if (defenseRate < GTO_BB_DEFENSE - 0.08) {
      const deficit = GTO_BB_DEFENSE - defenseRate;
      leaks.push({
        spotType: 'flop_vs_cbet',
        description: `BB over-folding: defending ${(defenseRate * 100).toFixed(0)}% vs GTO ${(GTO_BB_DEFENSE * 100).toFixed(0)}%`,
        evLostPer100: -(deficit * 8 * 100), // ~8bb per fold too many, scaled
        sampleSize: stats.bbDefense.faced,
        recommendation: 'Over-folding BB is the most common measured leak (1–3 bb/100). You are surrendering too much equity. Call with any hand that has ≥ pot odds equity. Defend suited connectors, suited aces, and broadway hands even without top pair.',
      });
    }
  }

  // 3. VPIP too high
  if (stats.vpip.hands >= 20) {
    const vpipRate = stats.vpip.voluntary / stats.vpip.hands;
    const gtoVpip = GTO_VPIP_BY_PLAYERS[numPlayers] ?? 0.25;
    if (vpipRate > gtoVpip + 0.08) {
      leaks.push({
        spotType: 'preflop_open',
        description: `VPIP too high: ${(vpipRate * 100).toFixed(0)}% vs GTO ${(gtoVpip * 100).toFixed(0)}% at ${numPlayers}-handed`,
        evLostPer100: -((vpipRate - gtoVpip) * 15 * 100),
        sampleSize: stats.vpip.hands,
        recommendation: `At ${numPlayers}-handed, GTO VPIP is ~${(gtoVpip * 100).toFixed(0)}%. You're playing too many hands preflop. Tighten from early positions — UTG should be ~14%, not ${(vpipRate * 100).toFixed(0)}%.`,
      });
    }
  }

  // 4. C-bet sizing tells
  const { dry, wet } = stats.cbetStats;
  if (dry.count >= 5 && (dry.correctSize / dry.count) < 0.4) {
    leaks.push({
      spotType: 'flop_cbet',
      description: 'C-bet sizing wrong on dry boards (should be 25–33%, not 50%+)',
      evLostPer100: -1.5,
      sampleSize: dry.count,
      recommendation: 'On dry/paired boards, use small c-bets (25–33% pot). Big bets on dry boards are a range tell: it signals you are value-betting a set. Small bets keep your bluffs and value bets balanced.',
    });
  }
  if (wet.count >= 5 && (wet.correctSize / wet.count) < 0.4) {
    leaks.push({
      spotType: 'flop_cbet',
      description: 'C-bet sizing too small on wet boards (should be 50–75%)',
      evLostPer100: -1.2,
      sampleSize: wet.count,
      recommendation: 'On wet/connected boards, use larger c-bets (50–75% pot) to deny equity to draws. Small bets on wet boards are too cheap for drawing hands to call.',
    });
  }

  // 5. Missed river thin value
  if (stats.riverThinValue.spots >= 5) {
    const betRate = stats.riverThinValue.bet / stats.riverThinValue.spots;
    if (betRate < 0.5) {
      leaks.push({
        spotType: 'river_value',
        description: `Missed thin river value: only betting ${(betRate * 100).toFixed(0)}% of thin value spots`,
        evLostPer100: -((1 - betRate) * 2.0),
        sampleSize: stats.riverThinValue.spots,
        recommendation: 'When you have 55–70% equity on the river, bet thin for value with a small size (25–33% pot). Checking gives up 1–2bb of EV. These thin value bets are one of the top 3 most costly missed spots.',
      });
    }
  }

  // 6. Bluff follow-through failure
  if (stats.bluffFollowThrough.started >= 5) {
    const followRate = stats.bluffFollowThrough.completed / stats.bluffFollowThrough.started;
    if (followRate < 0.45) {
      leaks.push({
        spotType: 'river_bluff',
        description: `Bluff follow-through failure: completing ${(followRate * 100).toFixed(0)}% of started bluffs on river`,
        evLostPer100: -((0.6 - followRate) * 4.0),
        sampleSize: stats.bluffFollowThrough.started,
        recommendation: 'If you bet flop and turn as a bluff, folding the river is almost always wrong. You have fold equity and you\'ve already invested chips. Complete your bluffs on rivers that are good for your range.',
      });
    }
  }

  // 7. Preflop raise sizing tell
  if (stats.preflopSizing.opens >= 15) {
    const oversizedRate = stats.preflopSizing.oversized / stats.preflopSizing.opens;
    if (oversizedRate > 0.40) {
      leaks.push({
        spotType: 'preflop_open',
        description: `Preflop raise sizing tell: ${(oversizedRate * 100).toFixed(0)}% of opens are oversized`,
        evLostPer100: -2.0,
        sampleSize: stats.preflopSizing.opens,
        recommendation: 'The Vals AI benchmark identified oversizing with strong hands as the #1 exploitable preflop tell. GTO requires UNIFORM sizing across your entire range — 2.5bb from BTN/CO, 3bb from other positions — regardless of hand strength. Raising AA to 6x while bluffing at 2.5x makes your range completely readable. Use the same size every time.',
      });
    }
  }

  return leaks.sort((a, b) => a.evLostPer100 - b.evLostPer100).slice(0, 3);
}

// ── Store ────────────────────────────────────────────────────────────────────

interface TrainingState {
  sessionStats: SessionStats;
  handHistory: HandSnapshot[];
  currentStreetSnapshots: StreetSnapshot[];
  selectedHandId: string | null;
  leakAnalysis: LeakAnalysis | null;
  drillFilter: DrillFilter;
  numPlayers: number;

  recordStreetSnapshot: (snapshot: StreetSnapshot) => void;
  finalizeHand: (
    handNumber: number,
    heroCards: HandCards,
    finalBoard: BoardCards,
    heroNet: number,
    heroPosition: Position,
    numPlayers: number,
  ) => void;
  recordVPIP: (voluntary: boolean) => void;
  recordPFR: (raised: boolean) => void;
  recordBBDecision: (defended: boolean) => void;
  recordCbet: (texture: 'dry' | 'wet', correctSize: boolean) => void;
  recordRiverThinValue: (bet: boolean) => void;
  recordBluffFollowThrough: (completed: boolean) => void;
  recordPreflopSizing: (oversized: boolean) => void;
  selectHand: (id: string | null) => void;
  generateLeakReport: () => void;
  setDrillFilter: (filter: Partial<DrillFilter>) => void;
  clearSession: () => void;
  getFilteredHistory: () => HandSnapshot[];
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      sessionStats: freshStats(),
      handHistory: [],
      currentStreetSnapshots: [],
      selectedHandId: null,
      leakAnalysis: null,
      numPlayers: 2,
      drillFilter: { spotType: null, position: null, stackDepth: null, verdictFilter: null },

      recordStreetSnapshot: (snapshot) =>
        set((s) => ({ currentStreetSnapshots: [...s.currentStreetSnapshots, snapshot] })),

      recordVPIP: (voluntary) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            vpip: { hands: s.sessionStats.vpip.hands + 1, voluntary: s.sessionStats.vpip.voluntary + (voluntary ? 1 : 0) },
          },
        })),

      recordPFR: (raised) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            pfr: { hands: s.sessionStats.pfr.hands + 1, raised: s.sessionStats.pfr.raised + (raised ? 1 : 0) },
          },
        })),

      recordBBDecision: (defended) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            bbDefense: {
              faced: s.sessionStats.bbDefense.faced + 1,
              defended: s.sessionStats.bbDefense.defended + (defended ? 1 : 0),
            },
          },
        })),

      recordCbet: (texture, correctSize) =>
        set((s) => {
          const cb = { ...s.sessionStats.cbetStats };
          cb[texture] = {
            count: cb[texture].count + 1,
            correctSize: cb[texture].correctSize + (correctSize ? 1 : 0),
          };
          return { sessionStats: { ...s.sessionStats, cbetStats: cb } };
        }),

      recordRiverThinValue: (bet) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            riverThinValue: {
              spots: s.sessionStats.riverThinValue.spots + 1,
              bet: s.sessionStats.riverThinValue.bet + (bet ? 1 : 0),
            },
          },
        })),

      recordBluffFollowThrough: (completed) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            bluffFollowThrough: {
              started: s.sessionStats.bluffFollowThrough.started + 1,
              completed: s.sessionStats.bluffFollowThrough.completed + (completed ? 1 : 0),
            },
          },
        })),

      recordPreflopSizing: (oversized) =>
        set((s) => ({
          sessionStats: {
            ...s.sessionStats,
            preflopSizing: {
              opens: s.sessionStats.preflopSizing.opens + 1,
              oversized: s.sessionStats.preflopSizing.oversized + (oversized ? 1 : 0),
            },
          },
        })),

      finalizeHand: (handNumber, heroCards, finalBoard, heroNet, heroPosition, numPlayers) => {
        const { currentStreetSnapshots, sessionStats, handHistory } = get();

        const mistakes = currentStreetSnapshots.filter((s) => s.hint?.verdict === 'mistake').length;
        const spews = currentStreetSnapshots.filter((s) => s.hint?.verdict === 'spew').length;
        const optimals = currentStreetSnapshots.filter(
          (s) => s.hint?.verdict === 'gto' || s.hint?.verdict === 'acceptable',
        ).length;
        const marginals = currentStreetSnapshots.filter((s) => s.hint?.verdict === 'marginal').length;
        const evDelta = currentStreetSnapshots.reduce((sum, s) => sum + (s.hint?.evDeltaBB ?? 0), 0);
        const spotTypes = [...new Set(currentStreetSnapshots.map((s) => s.spotType))];

        const snapshot: HandSnapshot = {
          id: `${Date.now()}-${handNumber}`,
          handNumber,
          timestamp: Date.now(),
          streets: currentStreetSnapshots,
          heroNet,
          heroCards,
          finalBoard,
          heroPosition,
          numPlayers,
          mistakes,
          spews,
          evDelta,
          spotTypes,
        };

        const updated = [snapshot, ...handHistory].slice(0, 200);
        const newTotal = sessionStats.totalEvDelta + evDelta;
        const newHands = sessionStats.handsPlayed + 1;

        set({
          handHistory: updated,
          currentStreetSnapshots: [],
          numPlayers,
          sessionStats: {
            ...sessionStats,
            handsPlayed: newHands,
            totalEvDelta: newTotal,
            evPer100: (newTotal / newHands) * 100,
            mistakeCount: sessionStats.mistakeCount + mistakes,
            spewCount: sessionStats.spewCount + spews,
            optimalCount: sessionStats.optimalCount + optimals,
            marginalCount: sessionStats.marginalCount + marginals,
            bbWon: sessionStats.bbWon + heroNet,
          },
        });
      },

      selectHand: (selectedHandId) => set({ selectedHandId }),

      generateLeakReport: () => {
        const { handHistory, sessionStats, numPlayers } = get();
        const topLeaks = computeLeaks(handHistory, sessionStats, numPlayers);
        set({ leakAnalysis: { topLeaks, generatedAt: Date.now(), handsAnalyzed: handHistory.length } });
      },

      setDrillFilter: (filter) =>
        set((s) => ({ drillFilter: { ...s.drillFilter, ...filter } })),

      clearSession: () =>
        set({ sessionStats: freshStats(), currentStreetSnapshots: [], selectedHandId: null }),

      getFilteredHistory: () => {
        const { handHistory, drillFilter } = get();
        return handHistory.filter((h) => {
          if (drillFilter.position && h.heroPosition !== drillFilter.position) return false;
          if (drillFilter.spotType && !h.spotTypes.includes(drillFilter.spotType)) return false;
          if (drillFilter.verdictFilter === 'mistakes_only' && h.mistakes === 0 && h.spews === 0) return false;
          return true;
        });
      },
    }),
    {
      name: 'poker-trainer-history',
      partialize: (s) => ({ handHistory: s.handHistory }),
    },
  ),
);
