import { create } from 'zustand';
import { GameState, GameAction } from '../types/game';
import { GTOHint } from '../types/gto';

interface GameStoreState {
  game: GameState | null;
  lastHint: GTOHint | null;
  pendingHint: boolean;
  isEvaluatorReady: boolean;

  setGame: (game: GameState) => void;
  dispatch: (action: GameAction) => void;
  setHint: (hint: GTOHint | null) => void;
  setPendingHint: (pending: boolean) => void;
  setEvaluatorReady: (ready: boolean) => void;
  resetHint: () => void;
}

// The actual game reducer is wired in via the useGameLoop hook
// to avoid circular deps between store and engine
let _reducer: ((state: GameState, action: GameAction) => GameState) | null = null;

export function registerReducer(
  fn: (state: GameState, action: GameAction) => GameState
) {
  _reducer = fn;
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  game: null,
  lastHint: null,
  pendingHint: false,
  isEvaluatorReady: false,

  setGame: (game) => set({ game }),

  dispatch: (action) => {
    const { game } = get();
    if (!game || !_reducer) return;
    const next = _reducer(game, action);
    set({ game: next });
  },

  setHint: (hint) => set({ lastHint: hint, pendingHint: false }),
  setPendingHint: (pendingHint) => set({ pendingHint }),
  setEvaluatorReady: (isEvaluatorReady) => set({ isEvaluatorReady }),
  resetHint: () => set({ lastHint: null, pendingHint: false }),
}));
