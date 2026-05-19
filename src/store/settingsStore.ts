import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Difficulty } from '../types/game';
import { TrainingMode } from '../types/training';
import { SpotType } from '../types/gto';

interface SettingsState {
  difficulty: Difficulty;
  numOpponents: number; // 1-8 (total table = numOpponents + hero)
  stackSize: 20 | 40 | 100;
  trainingMode: TrainingMode;
  showEquityRealtime: boolean;
  showGTOHints: boolean;
  drillSpotType: SpotType | null; // null = play all spots
  setDifficulty: (d: Difficulty) => void;
  setNumOpponents: (n: number) => void;
  setStackSize: (s: 20 | 40 | 100) => void;
  setTrainingMode: (m: TrainingMode) => void;
  toggleEquity: () => void;
  toggleGTOHints: () => void;
  setDrillSpotType: (s: SpotType | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      difficulty: 'tag',
      numOpponents: 1,
      stackSize: 100,
      trainingMode: 'train',
      showEquityRealtime: true,
      showGTOHints: true,
      drillSpotType: null,
      setDifficulty: (difficulty) => set({ difficulty }),
      setNumOpponents: (numOpponents) => set({ numOpponents: Math.min(8, Math.max(1, numOpponents)) }),
      setStackSize: (stackSize) => set({ stackSize }),
      setTrainingMode: (trainingMode) => set({ trainingMode }),
      toggleEquity: () => set((s) => ({ showEquityRealtime: !s.showEquityRealtime })),
      toggleGTOHints: () => set((s) => ({ showGTOHints: !s.showGTOHints })),
      setDrillSpotType: (drillSpotType) => set({ drillSpotType }),
    }),
    { name: 'poker-trainer-settings' }
  )
);
