import { useEffect, useCallback, useRef } from 'react';
import { useGameStore, registerReducer } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTrainingStore } from '../store/trainingStore';
import { gameReducer, createInitialState, getValidActions } from '../engine/stateMachine';
import { initEvaluator, evaluate7 } from '../engine/evaluator';
import { selectAIAction } from '../ai/actionSelector';
import {
  getGTOHint, analyzeCbetSizing, isRiverThinValueSpot, classifyBoardTexture,
} from '../gto/hintEngine';
import { GameAction } from '../types/game';

registerReducer(gameReducer);

export function useGameLoop() {
  const { game, dispatch, setGame, setHint, setEvaluatorReady, isEvaluatorReady } = useGameStore();
  const { difficulty, numOpponents, stackSize } = useSettingsStore();
  const {
    recordStreetSnapshot, finalizeHand,
    recordVPIP, recordPFR, recordBBDecision,
    recordCbet, recordRiverThinValue, recordBluffFollowThrough,
  } = useTrainingStore();
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // tracks flop/turn bluffs: hero bet with equity < 0.38
  const bluffStartedRef = useRef<boolean>(false);

  useEffect(() => {
    initEvaluator().then(() => setEvaluatorReady(true));
  }, []);

  const startGame = useCallback(() => {
    const total = numOpponents + 1;
    const state = createInitialState(total, stackSize, difficulty);
    setGame(state);
  }, [numOpponents, stackSize, difficulty]);

  // Hero action handler — records research-backed stats, computes GTO hint
  const heroAction = useCallback((action: GameAction, equity?: number) => {
    const state = useGameStore.getState().game;
    if (!state) return;

    const hero = state.players.find(p => p.isHero);
    if (!hero || hero.holeCards === null) { dispatch(action); return; }

    const aType = action.type;
    const isBet    = aType === 'PLAYER_RAISE' || aType === 'PLAYER_ALL_IN';
    const isFold   = aType === 'PLAYER_FOLD';
    const isCheck  = aType === 'PLAYER_CHECK';

    // ── Preflop stats ──────────────────────────────────────────────────────────
    if (state.street === 'preflop') {
      const voluntary = aType === 'PLAYER_CALL' || isBet;
      recordVPIP(voluntary);
      recordPFR(isBet);

      // BB defense: hero is BB and facing a raise above the posted BB
      if (hero.position === 'BB' && state.currentBet > hero.currentBet + 0.5) {
        recordBBDecision(!isFold);
      }
    }

    // ── Flop c-bet sizing ──────────────────────────────────────────────────────
    if (state.street === 'flop' && isBet) {
      const texture = classifyBoardTexture(state.communityCards);
      const betAmt = (action as { amount?: number }).amount ?? 0;
      const { isCorrect } = analyzeCbetSizing(betAmt, state.pot, texture);
      const bucket: 'dry' | 'wet' = (texture === 'dry' || texture === 'paired') ? 'dry' : 'wet';
      recordCbet(bucket, isCorrect);
    }

    // ── River thin value ───────────────────────────────────────────────────────
    if (state.street === 'river' && equity !== undefined) {
      const facingBet = (state.currentBet - hero.currentBet) > 0;
      const gtoAction = isBet ? 'raise' : isCheck ? 'check' : isFold ? 'fold' : 'call';
      const { isThinValue } = isRiverThinValueSpot(equity, gtoAction, facingBet);
      if (isThinValue) {
        recordRiverThinValue(isBet);
      }
    }

    // ── Bluff follow-through ───────────────────────────────────────────────────
    if ((state.street === 'flop' || state.street === 'turn') && isBet && equity !== undefined && equity < 0.38) {
      bluffStartedRef.current = true;
    }
    if (state.street === 'river' && bluffStartedRef.current) {
      recordBluffFollowThrough(isBet);
      bluffStartedRef.current = false;
    }
    if (isFold && bluffStartedRef.current) {
      bluffStartedRef.current = false;
    }

    // ── GTO hint (deferred so it doesn't block the UI frame) ──────────────────
    setTimeout(() => {
      try {
        const hint = getGTOHint(state, action, hero.holeCards!, equity);
        setHint(hint);
      } catch { /* evaluator may not be ready */ }
    }, 0);

    dispatch(action);
  }, [dispatch, setHint, recordVPIP, recordPFR, recordBBDecision, recordCbet, recordRiverThinValue, recordBluffFollowThrough]);

  // AI turn handler
  useEffect(() => {
    if (!game || game.phase !== 'betting') return;
    const actor = game.players[game.toAct];
    if (!actor || !actor.isAI || actor.isFolded || actor.isAllIn) return;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    const delay = 600 + Math.random() * 800;
    aiTimerRef.current = setTimeout(() => {
      const currentGame = useGameStore.getState().game;
      if (!currentGame) return;

      const currentActor = currentGame.players[currentGame.toAct];
      if (!currentActor?.isAI) return;

      const validActions = getValidActions(currentGame, currentActor.id);
      const action = selectAIAction(currentGame, currentActor.id, {
        difficulty: currentActor.difficulty ?? 'tag',
        name: currentActor.name,
      }, validActions);

      dispatch(action);
    }, delay);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [game?.toAct, game?.phase, game?.handNumber]);

  // Street advancement
  useEffect(() => {
    if (!game || game.phase !== 'advancing') return;
    const timer = setTimeout(() => dispatch({ type: 'ADVANCE_STREET' }), 300);
    return () => clearTimeout(timer);
  }, [game?.phase]);

  // Showdown resolution
  useEffect(() => {
    if (!game || game.phase !== 'showdown') return;

    const timer = setTimeout(() => {
      const nonFolded = game.players.filter(p => !p.isFolded);
      if (nonFolded.length === 1) {
        dispatch({ type: 'AWARD_POT', winnerId: nonFolded[0].id, amount: game.pot });
        return;
      }

      const board = game.communityCards;
      if (board.length < 5) { dispatch({ type: 'AWARD_POT', winnerId: nonFolded[0].id, amount: game.pot }); return; }

      let bestScore = -1;
      let winnerId = nonFolded[0].id;
      for (const p of nonFolded) {
        if (!p.holeCards) continue;
        const seven: [number,number,number,number,number,number,number] = [
          p.holeCards[0], p.holeCards[1],
          board[0], board[1], board[2], board[3], board[4],
        ];
        const score = evaluate7(seven);
        if (score > bestScore) { bestScore = score; winnerId = p.id; }
      }
      dispatch({ type: 'AWARD_POT', winnerId, amount: game.pot });
    }, 500);

    return () => clearTimeout(timer);
  }, [game?.phase]);

  // Hand complete — finalize training data and start new hand
  useEffect(() => {
    if (!game || (!game.isHandOver && game.street !== 'showdown')) return;
    const hero = game.players.find(p => p.isHero);
    if (!hero) return;

    const timer = setTimeout(() => {
      bluffStartedRef.current = false; // reset bluff tracking between hands

      finalizeHand(
        game.handNumber,
        hero.holeCards ?? [0, 1],
        game.communityCards,
        hero.stack - stackSize,
        hero.position,
        game.players.length,
      );
      dispatch({ type: 'NEW_HAND' });
      setTimeout(() => dispatch({ type: 'DEAL_HAND' }), 400);
    }, 1500);

    return () => clearTimeout(timer);
  }, [game?.isHandOver, game?.winners.length]);

  return { startGame, heroAction, isEvaluatorReady };
}
