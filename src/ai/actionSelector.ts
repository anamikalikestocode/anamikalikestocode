import { GameState, GameAction, ValidActions, Difficulty } from '../types/game';
import { AIProfile } from './types';
import { handToKey } from '../gto/ranges';
import { getOpenRange } from '../gto/rangeData';

// ---- Helpers ----------------------------------------------------------------

function randomBet(min: number, max: number, fraction: number): number {
  const target = Math.round(min + (max - min) * fraction);
  return Math.max(min, Math.min(max, target));
}

function potSizeBet(pot: number, fraction: number, valid: ValidActions): number {
  const target = Math.round(pot * fraction);
  return Math.max(valid.minRaise, Math.min(valid.maxRaise, target));
}

function cardRank(c: number): number { return c >> 2; }
function cardSuit(c: number): number { return c & 3; }

// Simple preflop hand strength 0-1 (higher = stronger)
function preflopStrength(cards: [number, number]): number {
  const r1 = cardRank(cards[0]);
  const r2 = cardRank(cards[1]);
  const s1 = cardSuit(cards[0]);
  const s2 = cardSuit(cards[1]);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const suited = s1 === s2 ? 0.05 : 0;
  const pairBonus = r1 === r2 ? 0.15 : 0;
  // Base strength: hi rank scaled + gap penalty + suited bonus
  const base = (hi / 12) * 0.6 + (lo / 12) * 0.3;
  const gap = r1 !== r2 ? ((hi - lo - 1) * 0.03) : 0;
  return Math.min(1, base + suited + pairBonus - gap);
}

function hasPair(cards: [number, number], board: number[]): boolean {
  const r1 = cardRank(cards[0]);
  const r2 = cardRank(cards[1]);
  return board.some(c => cardRank(c) === r1 || cardRank(c) === r2);
}

function hasFlushDraw(cards: [number, number], board: number[]): boolean {
  const allCards = [...cards, ...board];
  const suitCounts: Record<number, number> = {};
  for (const c of allCards) {
    const s = cardSuit(c);
    suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  }
  return Object.values(suitCounts).some(n => n === 4);
}

function hasStraightDraw(cards: [number, number], board: number[]): boolean {
  const ranks = [...cards, ...board].map(cardRank);
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  for (let i = 0; i <= unique.length - 4; i++) {
    if (unique[i + 3] - unique[i] <= 4) return true;
  }
  return false;
}

// ---- Calling Station -------------------------------------------------------

function callingStationAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;

  if (state.street === 'preflop') {
    if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };
    const str = preflopStrength(cards);
    // Premium: raise. Otherwise: call everything, fold only junk to huge bet
    if (str > 0.82 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: call with any pair/draw, fold nothing
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- Nit -------------------------------------------------------------------

const NIT_HANDS = new Set([
  'AA','KK','QQ','JJ','TT','99','AKs','AKo','AQs','AQo','AJs','KQs',
]);

function nitAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;

  if (state.street === 'preflop') {
    if (!cards) return { type: 'PLAYER_FOLD', playerId };
    const key = handToKey(cards);
    if (NIT_HANDS.has(key)) {
      if (valid.canRaise) return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 1.0, valid) };
      if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    }
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: only continue with top pair+ or better
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };
  const topPair = hasPair(cards, state.communityCards);
  if (topPair) {
    if (valid.canRaise && Math.random() < 0.3) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.75, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_CHECK', playerId };
  }
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- TAG -------------------------------------------------------------------

// Open frequencies by position (% of time TAG opens first-in)
const TAG_OPEN_FREQ: Record<string, number> = {
  BTN: 0.40, CO: 0.25, HJ: 0.20, LJ: 0.18, UTG: 0.14, UTG1: 0.14, UTG2: 0.12, SB: 0.35, BB: 0,
};

function tagAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;

  if (state.street === 'preflop') {
    if (!cards) return { type: 'PLAYER_FOLD', playerId };
    const str = preflopStrength(cards);
    const openFreq = TAG_OPEN_FREQ[player.position] ?? 0.15;
    const facingRaise = state.currentBet > 1;

    if (!facingRaise) {
      if (str >= (1 - openFreq) && valid.canRaise) {
        return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.8, valid) };
      }
      if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
      return { type: 'PLAYER_FOLD', playerId };
    }
    // Facing raise: call with top 15%, re-raise premiums
    if (str > 0.88 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.5, valid) };
    }
    if (str > 0.72 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };
  const pair = hasPair(cards, state.communityCards);
  const draw = hasFlushDraw(cards, state.communityCards) || hasStraightDraw(cards, state.communityCards);
  const cbetFreq = player.position === 'BTN' ? 0.65 : 0.45;

  if (pair || draw) {
    if (valid.canRaise && Math.random() < cbetFreq) {
      const frac = state.communityCards.length <= 3 ? 0.5 : 0.65;
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, frac, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_CHECK', playerId };
  }
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- LAG -------------------------------------------------------------------

function lagAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;

  if (state.street === 'preflop') {
    if (!cards) return { type: 'PLAYER_FOLD', playerId };
    const str = preflopStrength(cards);
    const facingRaise = state.currentBet > 1;

    if (!facingRaise && str > 0.38 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.85, valid) };
    }
    // 3-bet light
    if (facingRaise && (str > 0.80 || (str > 0.55 && Math.random() < 0.25)) && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.8, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: aggressive, high c-bet, bluffs frequently
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };
  const pair = hasPair(cards, state.communityCards);
  const draw = hasFlushDraw(cards, state.communityCards) || hasStraightDraw(cards, state.communityCards);
  const aggr = pair || draw || Math.random() < 0.25; // bluff 25%

  if (aggr && valid.canRaise) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.75, valid) };
  }
  if (valid.canCall && (pair || draw)) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- GTO -------------------------------------------------------------------

function gtoAIAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const key = handToKey(cards);
    const range = getOpenRange(player.position, player.stack <= 22 ? '20bb' : player.stack <= 45 ? '40bb' : '100bb');
    const freq = range ? (range.combos[key] ?? 0) : 0;
    // Mixed strategy: raise with probability = freq, fold otherwise
    const deviation = (Math.random() - 0.5) * 0.15; // ±15% noise
    const adjustedFreq = Math.max(0, Math.min(1, freq + deviation));

    if (state.currentBet <= 1) {
      if (adjustedFreq >= 0.5 && valid.canRaise) {
        return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
      }
      if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
      return { type: 'PLAYER_FOLD', playerId };
    }
    // Facing raise: simplified
    if (adjustedFreq >= 0.75 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.5, valid) };
    }
    if (adjustedFreq >= 0.4 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: balanced bet sizing
  const str = preflopStrength(cards);
  const board = state.communityCards;
  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);
  const noise = (Math.random() - 0.5) * 0.2;
  const playFreq = (pair ? 0.75 : draw ? 0.55 : 0.25) + noise;

  if (playFreq >= 0.5 && valid.canRaise) {
    const bet = board.length <= 3 ? 0.4 : board.length === 4 ? 0.55 : 0.65;
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, bet, valid) };
  }
  if (valid.canCall && (pair || draw)) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- Exploitative Reg ------------------------------------------------------

function exploitativeAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  // Exploitative reg: reads tendencies, punishes limps, attacks weakness
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  const str = preflopStrength(cards);

  if (state.street === 'preflop') {
    const heroLimped = state.actionsThisStreet.some(
      a => a.type === 'CALL' && state.players.find(p => p.id === a.playerId)?.isHero
    );
    // Isolate limpers with wide range
    if (heroLimped && str > 0.45 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 1.2, valid) };
    }
    if (str > 0.55 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
    }
    if (str > 0.40 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: attack checks, thin value bet, bluff-catch
  const board = state.communityCards;
  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);
  const heroChecked = state.actionsThisStreet.some(
    a => a.type === 'CHECK' && state.players.find(p => p.id === a.playerId)?.isHero
  );

  if (heroChecked && valid.canRaise && (pair || draw || Math.random() < 0.35)) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.65, valid) };
  }
  if (pair && valid.canRaise && Math.random() < 0.5) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.55, valid) };
  }
  if ((pair || draw) && valid.canCall) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- Selector --------------------------------------------------------------

export function selectAIAction(
  state: GameState,
  playerId: number,
  profile: AIProfile,
  validActions: ValidActions,
): GameAction {
  // If only one valid action, return it
  if (!validActions.canFold && !validActions.canCheck && !validActions.canCall && !validActions.canRaise) {
    return { type: 'PLAYER_CHECK', playerId };
  }

  switch (profile.difficulty) {
    case 'calling_station': return callingStationAction(state, playerId, validActions);
    case 'nit':             return nitAction(state, playerId, validActions);
    case 'tag':             return tagAction(state, playerId, validActions);
    case 'lag':             return lagAction(state, playerId, validActions);
    case 'gto':             return gtoAIAction(state, playerId, validActions);
    case 'exploitative_reg': return exploitativeAction(state, playerId, validActions);
    default:                return tagAction(state, playerId, validActions);
  }
}
