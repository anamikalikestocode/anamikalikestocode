import { useMemo } from 'react';
import { GameState } from '../types/game';
import { requiredEquity, spr, mdf } from '../engine/potOdds';

export function usePotOdds(state: GameState | null, heroId: number) {
  return useMemo(() => {
    if (!state) return null;
    const hero = state.players.find(p => p.id === heroId);
    if (!hero) return null;

    const callAmount = Math.max(0, state.currentBet - hero.currentBet);
    const reqEq = callAmount > 0 ? requiredEquity(callAmount, state.pot) : null;
    const sprVal = spr(hero.stack, Math.max(1, state.pot));
    const mdfVal = callAmount > 0 ? mdf(callAmount, state.pot) : null;

    return {
      callAmount,
      requiredEquity: reqEq,
      spr: sprVal,
      mdf: mdfVal,
      pot: state.pot,
    };
  }, [state, heroId]);
}
