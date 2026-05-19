import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HandSnapshot, SessionStats, StreetSnapshot, LeakAnalysis, DrillFilter } from '../types/training';
import { HandCards, BoardCards } from '../types/cards';
import { Position } from '../types/game';
import { SpotType, SpotStat, LeakReport } from '../types/gto';

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
  };
}

function computeLeaks(history: HandSnapshot[]): LeakReport[] {
  if (history.length < 10) return [];

  // Aggregate EV delta by spot type
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
    flop_vs_cbet: 'Review GTO calling ranges vs c-bet by board texture. On wet boards, defend wider; on dry boards, fold marginal hands.',
    river_bluff_catch: 'Study MDF (minimum defense frequency). You must call ~1/(1 + bet/pot) of your range regardless of hand strength.',
    river_bluff: 'Ensure bluffs have blockers to villain\'s value range. Avoid bluffing boards that connect with villain\'s range.',
    preflop_vs_3bet: 'Tighten your 4-bet and expand your flat-call range. Many hands are marginal folds vs 3-bets out of position.',
    flop_cbet: 'C-bet based on range advantage and board texture, not hand strength alone. Check strong hands on some boards.',
    turn_vs_barrel: 'Re-evaluate equity on the turn. Many flop calls become clear folds on blank turns.',
    preflop_squeeze: 'Tighten squeeze range. Value squeezes need strong equity vs wide coldcall ranges.',
  };

  const leaks: LeakReport[] = Object.entries(spotMap)
    .filter(([, v]) => v.count >= 5 && v.evDelta < -0.5)
    .map(([spot, v]) => {
      const spotType = spot as SpotType;
      const evLostPer100 = (v.evDelta / history.length) * 100;
      return {
        spotType,
        description: `You are losing EV in ${SPOT_LABELS[spotType] ?? spot}`,
        evLostPer100,
        sampleSize: v.count,
        recommendation: SPOT_RECS[spotType] ?? 'Review GTO ranges for this spot type.',
      };
    })
    .sort((a, b) => a.evLostPer100 - b.evLostPer100) // most negative first
    .slice(0, 3);

  return leaks;
}

interface TrainingState {
  sessionStats: SessionStats;
  handHistory: HandSnapshot[];
  currentStreetSnapshots: StreetSnapshot[];
  selectedHandId: string | null;
  leakAnalysis: LeakAnalysis | null;
  drillFilter: DrillFilter;

  recordStreetSnapshot: (snapshot: StreetSnapshot) => void;
  finalizeHand: (
    handNumber: number,
    heroCards: HandCards,
    finalBoard: BoardCards,
    heroNet: number,
    heroPosition: Position,
    numPlayers: number
  ) => void;
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
      drillFilter: { spotType: null, position: null, stackDepth: null, verdictFilter: null },

      recordStreetSnapshot: (snapshot) =>
        set((s) => ({ currentStreetSnapshots: [...s.currentStreetSnapshots, snapshot] })),

      finalizeHand: (handNumber, heroCards, finalBoard, heroNet, heroPosition, numPlayers) => {
        const { currentStreetSnapshots, sessionStats, handHistory } = get();

        const mistakes = currentStreetSnapshots.filter(
          (s) => s.hint?.verdict === 'mistake'
        ).length;
        const spews = currentStreetSnapshots.filter(
          (s) => s.hint?.verdict === 'spew'
        ).length;
        const optimals = currentStreetSnapshots.filter(
          (s) => s.hint?.verdict === 'gto' || s.hint?.verdict === 'acceptable'
        ).length;
        const marginals = currentStreetSnapshots.filter(
          (s) => s.hint?.verdict === 'marginal'
        ).length;
        const evDelta = currentStreetSnapshots.reduce(
          (sum, s) => sum + (s.hint?.evDeltaBB ?? 0),
          0
        );
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
        const { handHistory } = get();
        const topLeaks = computeLeaks(handHistory);
        set({
          leakAnalysis: {
            topLeaks,
            generatedAt: Date.now(),
            handsAnalyzed: handHistory.length,
          },
        });
      },

      setDrillFilter: (filter) =>
        set((s) => ({ drillFilter: { ...s.drillFilter, ...filter } })),

      clearSession: () =>
        set({
          sessionStats: freshStats(),
          currentStreetSnapshots: [],
          selectedHandId: null,
        }),

      getFilteredHistory: () => {
        const { handHistory, drillFilter } = get();
        return handHistory.filter((h) => {
          if (drillFilter.position && h.heroPosition !== drillFilter.position) return false;
          if (drillFilter.spotType && !h.spotTypes.includes(drillFilter.spotType)) return false;
          if (drillFilter.verdictFilter === 'mistakes_only') {
            if (h.mistakes === 0 && h.spews === 0) return false;
          }
          return true;
        });
      },
    }),
    {
      name: 'poker-trainer-history',
      partialize: (s) => ({ handHistory: s.handHistory }),
    }
  )
);
