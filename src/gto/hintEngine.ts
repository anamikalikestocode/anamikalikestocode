import { GameState, GameAction, Position } from '../types/game';
import { GTOHint, GTOAction, DecisionVerdict, SpotType, PostflopContext, BoardTexture, RangeData } from '../types/gto';
import { handToKey } from './ranges';
import { getOpenRange, get3BetRange, getCallVs3BetRange, getPushRange } from './rangeData';
import { estimatePostflopDecision } from './evEstimator';
import { requiredEquity, spr as calcSpr } from '../engine/potOdds';

function mapAction(a: GameAction): GTOAction {
  switch (a.type) {
    case 'PLAYER_FOLD':   return 'fold';
    case 'PLAYER_CALL':   return 'call';
    case 'PLAYER_CHECK':  return 'check';
    case 'PLAYER_RAISE':
    case 'PLAYER_ALL_IN': return 'raise';
    default:              return 'call';
  }
}

function stackDepth(stack: number): '20bb' | '40bb' | '100bb' {
  if (stack <= 22) return '20bb';
  if (stack <= 45) return '40bb';
  return '100bb';
}

export function classifyBoardTexture(board: number[]): BoardTexture {
  if (board.length < 3) return 'dry';
  const suits = board.map(c => c & 3);
  const suitCounts: Record<number, number> = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  const maxSuit = Math.max(...Object.values(suitCounts));
  if (maxSuit >= 3) return 'monotone';

  const ranks = board.map(c => c >> 2).sort((a, b) => b - a);
  const rankSet = new Set(ranks);
  if (rankSet.size < ranks.length) return 'paired';

  const gaps = ranks.slice(0, -1).map((r, i) => r - ranks[i + 1]);
  const connected = gaps.every(g => g <= 2);
  return connected ? 'wet' : 'dry';
}

function getFacingRaisers(state: GameState, heroId: number): boolean {
  return state.actionsThisStreet.some(
    a => a.type === 'RAISE' && a.playerId !== heroId
  );
}

function getNumRaisesPreflop(state: GameState): number {
  return state.actionsThisStreet.filter(a => a.type === 'RAISE').length;
}

function verdictFromFreq(freq: number, playerAction: GTOAction, gtoAction: GTOAction): DecisionVerdict {
  if (playerAction === gtoAction) {
    if (freq >= 0.85) return 'gto';
    if (freq >= 0.5)  return 'acceptable';
    return 'marginal';
  }
  // Player did something different from GTO recommendation
  if (freq < 0.15) return 'spew';   // hand almost never does this
  if (freq < 0.35) return 'mistake';
  if (freq < 0.65) return 'marginal';
  return 'acceptable';
}

function buildPreflop(
  state: GameState,
  heroAction: GameAction,
  heroCards: [number, number],
  hero: (typeof state.players)[0]
): GTOHint {
  const playerAction = mapAction(heroAction);
  const depth = stackDepth(hero.stack);
  const handKey = handToKey(heroCards);
  const numRaises = getNumRaisesPreflop(state);
  const facingRaise = getFacingRaisers(state, hero.id);

  let rangeData: RangeData | null = null;
  let gtoAction: GTOAction = 'fold';
  let gtoFreq = 0;
  let spotType: SpotType = 'preflop_open';
  let explanation = '';

  if (depth !== '100bb') {
    // Short stack: push/fold
    rangeData = getPushRange(hero.position, depth);
    spotType = 'preflop_push_fold';
    gtoFreq = rangeData ? (rangeData.combos[handKey] ?? 0) : 0;
    gtoAction = gtoFreq >= 0.5 ? 'raise' : 'fold';
    explanation = `Push/fold territory at ${depth}. ${handKey} pushes ${(gtoFreq * 100).toFixed(0)}% GTO.`;
  } else if (!facingRaise) {
    // First-in open
    rangeData = getOpenRange(hero.position, '100bb');
    spotType = 'preflop_open';
    gtoFreq = rangeData ? (rangeData.combos[handKey] ?? 0) : 0;
    gtoAction = gtoFreq >= 0.5 ? 'raise' : 'fold';
    explanation = `${hero.position} open: ${handKey} opens ${(gtoFreq * 100).toFixed(0)}% GTO.`;
  } else if (numRaises === 1) {
    // Facing open — 3-bet or call/fold
    const aggressorPos = state.actionsThisStreet.find(a => a.type === 'RAISE')
      ? state.players.find(p => p.id === state.lastAggressor)?.position ?? 'BTN'
      : 'BTN';

    if (playerAction === 'raise') {
      rangeData = get3BetRange(hero.position, aggressorPos as Position, '100bb');
      spotType = 'preflop_3bet';
    } else {
      rangeData = getCallVs3BetRange(hero.position, '100bb');
      spotType = 'preflop_vs_open';
    }
    gtoFreq = rangeData ? (rangeData.combos[handKey] ?? 0) : 0;
    gtoAction = gtoFreq >= 0.5 ? playerAction : (playerAction === 'fold' ? 'raise' : 'fold');
    explanation = `${hero.position} vs ${aggressorPos} open: ${handKey} is ${playerAction} — GTO frequency ${(gtoFreq * 100).toFixed(0)}%.`;
  } else {
    // vs 3-bet or squeeze
    spotType = numRaises >= 2 ? 'preflop_squeeze' : 'preflop_vs_3bet';
    rangeData = getCallVs3BetRange(hero.position, '100bb');
    gtoFreq = rangeData ? (rangeData.combos[handKey] ?? 0) : 0;
    gtoAction = gtoFreq >= 0.5 ? 'call' : 'fold';
    explanation = `${hero.position} vs ${numRaises}-bet: ${handKey} calls ${(gtoFreq * 100).toFixed(0)}% GTO.`;
  }

  const verdict = verdictFromFreq(gtoFreq, playerAction, gtoAction);
  const evDeltaBB = verdict === 'gto' || verdict === 'acceptable' ? 0 :
    verdict === 'spew' ? -3.0 :
    verdict === 'mistake' ? -1.5 :
    -0.5;

  return {
    verdict,
    gtoAction,
    gtoRaiseFreq: gtoAction === 'raise' ? gtoFreq : 0,
    gtoCallFreq:  gtoAction === 'call'  ? gtoFreq : 0,
    gtoFoldFreq:  gtoAction === 'fold'  ? gtoFreq : 1 - gtoFreq,
    playerAction,
    explanation,
    rangeData,
    evDeltaBB,
    evDeltaPer100: evDeltaBB * 2,
    spotType,
  };
}

// ── C-bet sizing analysis (research-backed: dry=25-33%, wet=50-66%) ──────────
export interface CbetSizingAnalysis {
  texture: 'dry' | 'wet' | 'monotone' | 'paired';
  playerBetFraction: number;    // hero's bet as fraction of pot
  gtoMinFraction: number;
  gtoMaxFraction: number;
  isCorrect: boolean;
  sizingNote: string;
}

export function analyzeCbetSizing(
  betAmount: number,
  pot: number,
  texture: BoardTexture,
): CbetSizingAnalysis {
  const frac = pot > 0 ? betAmount / pot : 0;

  const ranges: Record<BoardTexture, { min: number; max: number; label: string }> = {
    dry:              { min: 0.25, max: 0.40, label: 'dry board — GTO: 25–40% pot' },
    wet:              { min: 0.50, max: 0.75, label: 'wet board — GTO: 50–75% pot' },
    paired:           { min: 0.25, max: 0.45, label: 'paired board — GTO: 25–45% pot' },
    monotone:         { min: 0.45, max: 0.70, label: 'monotone board — GTO: 45–70% pot' },
    rainbow_connected:{ min: 0.45, max: 0.65, label: 'connected board — GTO: 45–65% pot' },
  };

  const range = ranges[texture] ?? ranges.dry;
  const isCorrect = frac >= range.min && frac <= range.max;

  let sizingNote = '';
  if (!isCorrect) {
    if (frac < range.min) {
      sizingNote = `Bet too small (${(frac * 100).toFixed(0)}% pot) on ${range.label}. Draws call too cheaply.`;
    } else {
      sizingNote = `Bet too large (${(frac * 100).toFixed(0)}% pot) on ${range.label}. Over-sizing is a range tell — it signals strong hands only.`;
    }
  } else {
    sizingNote = `Good sizing (${(frac * 100).toFixed(0)}% pot) for ${range.label}.`;
  }

  return {
    texture: texture === 'rainbow_connected' ? 'wet' : texture as any,
    playerBetFraction: frac,
    gtoMinFraction: range.min,
    gtoMaxFraction: range.max,
    isCorrect,
    sizingNote,
  };
}

// ── River thin value detection ───────────────────────────────────────────────
// Research shows checking back 55–70% equity on river is top-3 leak
export function isRiverThinValueSpot(
  equity: number,
  playerAction: GTOAction,
  facingBet: boolean,
): { isThinValue: boolean; missedValue: boolean } {
  const isThinValue = equity >= 0.54 && equity <= 0.72 && !facingBet;
  const missedValue = isThinValue && (playerAction === 'check');
  return { isThinValue, missedValue };
}

export function getGTOHint(
  state: GameState,
  heroAction: GameAction,
  heroCards: [number, number],
  heroEquity?: number,
): GTOHint {
  const hero = state.players.find(p => p.isHero);
  if (!hero) throw new Error('No hero player');

  // Preflop
  if (state.street === 'preflop') {
    return buildPreflop(state, heroAction, heroCards, hero);
  }

  // Postflop — use EV estimator
  const playerAction = mapAction(heroAction);
  const callAmount = Math.max(0, state.currentBet - hero.currentBet);
  const reqEq = callAmount > 0 ? requiredEquity(callAmount, state.pot) : 0;
  const equity = heroEquity ?? 0.5;
  const heroStack = hero.stack;
  const spr = calcSpr(heroStack, state.pot || 1);
  const inPosition = hero.id > (state.players.find(p => !p.isHero && !p.isFolded)?.id ?? 0);
  const boardTexture = classifyBoardTexture(state.communityCards);
  const facingBet = callAmount > 0;

  let spotType: SpotType = 'other';
  if (state.street === 'flop') {
    spotType = facingBet ? 'flop_vs_cbet' : 'flop_cbet';
  } else if (state.street === 'turn') {
    spotType = facingBet ? 'turn_vs_barrel' : 'turn_barrel';
  } else if (state.street === 'river') {
    if (equity < 0.35 && playerAction === 'raise') spotType = 'river_bluff';
    else if (facingBet && equity < 0.45) spotType = 'river_bluff_catch';
    else spotType = 'river_value';
  }

  const ctx: PostflopContext = {
    heroEquity: equity,
    requiredEquity: reqEq,
    spr,
    potSize: state.pot,
    betSize: callAmount,
    inPosition,
    boardTexture,
    street: state.street as 'flop' | 'turn' | 'river',
    isCheckRaise: false,
    facingBet,
  };

  const estimate = estimatePostflopDecision(playerAction, ctx);

  // Add c-bet sizing note for flop bets
  let explanation = estimate.explanation;
  if ((state.street === 'flop' || state.street === 'turn') && playerAction === 'raise' && state.pot > 0) {
    const betAmt = (heroAction as { amount?: number }).amount ?? callAmount;
    const cbetAnalysis = analyzeCbetSizing(betAmt, state.pot, boardTexture);
    if (!cbetAnalysis.isCorrect) {
      explanation += ` Sizing: ${cbetAnalysis.sizingNote}`;
    }
  }

  // Add river thin value note
  if (state.street === 'river') {
    const { isThinValue, missedValue } = isRiverThinValueSpot(equity, playerAction, facingBet);
    if (missedValue) {
      explanation += ` Thin value spot: ${(equity * 100).toFixed(0)}% equity — a small bet (25–33% pot) here earns 1–2bb. This is a top-3 measurable leak.`;
    }
  }

  return {
    verdict: estimate.verdict,
    gtoAction: estimate.recommendedAction,
    gtoRaiseFreq: estimate.recommendedAction === 'raise' ? 0.7 : 0.1,
    gtoCallFreq:  estimate.recommendedAction === 'call'  ? 0.7 : 0.2,
    gtoFoldFreq:  estimate.recommendedAction === 'fold'  ? 0.7 : 0.1,
    playerAction,
    explanation,
    rangeData: null,
    evDeltaBB: estimate.evDeltaBB,
    evDeltaPer100: estimate.evDeltaPer100,
    equity,
    requiredEquity: reqEq,
    spotType,
  };
}

export function classifySpotType(state: GameState, heroId: number): SpotType {
  const hero = state.players.find(p => p.id === heroId);
  if (!hero) return 'other';
  const depth = stackDepth(hero.stack);
  if (depth !== '100bb' && state.street === 'preflop') return 'preflop_push_fold';

  if (state.street === 'preflop') {
    const numRaises = getNumRaisesPreflop(state);
    if (numRaises === 0) return 'preflop_open';
    if (numRaises === 1) return 'preflop_vs_open';
    if (numRaises === 2) return 'preflop_vs_3bet';
    return 'preflop_squeeze';
  }

  const facingBet = (state.currentBet - (hero?.currentBet ?? 0)) > 0;
  if (state.street === 'flop') return facingBet ? 'flop_vs_cbet' : 'flop_cbet';
  if (state.street === 'turn') return facingBet ? 'turn_vs_barrel' : 'turn_barrel';
  return 'river_value';
}
