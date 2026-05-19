import { GameState, GameAction, ValidActions } from '../types/game';
import { AIProfile, HeroTendencies } from './types';
import { handToKey } from '../gto/ranges';
import { getOpenRange } from '../gto/rangeData';
import { classifyBoardTexture } from '../gto/hintEngine';

// ---- Helpers ----------------------------------------------------------------

function potSizeBet(pot: number, fraction: number, valid: ValidActions): number {
  const target = Math.round(pot * fraction * 2) / 2; // round to 0.5bb
  return Math.max(valid.minRaise, Math.min(valid.maxRaise, target));
}

function cardRank(c: number): number { return c >> 2; }
function cardSuit(c: number): number { return c & 3; }

function preflopStrength(cards: [number, number]): number {
  const r1 = cardRank(cards[0]);
  const r2 = cardRank(cards[1]);
  const s1 = cardSuit(cards[0]);
  const s2 = cardSuit(cards[1]);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const suited = s1 === s2 ? 0.05 : 0;
  const pairBonus = r1 === r2 ? 0.15 : 0;
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

// Estimate postflop equity bucket from hand vs board
function estimatedEquity(cards: [number, number], board: number[]): number {
  const pair = hasPair(cards, board);
  const flush = hasFlushDraw(cards, board);
  const straight = hasStraightDraw(cards, board);
  const str = preflopStrength(cards);
  if (pair && str > 0.75) return 0.72;   // top pair good kicker / overpair
  if (pair) return 0.58;
  if (flush && straight) return 0.52;
  if (flush) return 0.42;
  if (straight) return 0.38;
  return 0.18 + str * 0.12;             // air: hand-strength proxy
}

function requiredEq(callAmt: number, pot: number): number {
  return callAmt / (pot + callAmt);
}

// ---- Calling Station -------------------------------------------------------

function callingStationAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const str = preflopStrength(cards);
    if (str > 0.82 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

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
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const key = handToKey(cards);
    if (NIT_HANDS.has(key)) {
      if (valid.canRaise) return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 1.0, valid) };
      if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    }
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

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

const TAG_OPEN_FREQ: Record<string, number> = {
  BTN: 0.40, CO: 0.25, HJ: 0.20, LJ: 0.18, UTG: 0.14, UTG1: 0.14, UTG2: 0.12, SB: 0.35, BB: 0,
};

function tagAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
  tendencies?: HeroTendencies,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const str = preflopStrength(cards);
    const baseFreq = TAG_OPEN_FREQ[player.position] ?? 0.15;
    const facingRaise = state.currentBet > 1;

    // COPER: if hero over-folds BB, steal more from late position
    const stealBonus =
      tendencies?.bbDefenseRate !== null &&
      tendencies?.bbDefenseRate !== undefined &&
      tendencies.bbDefenseRate < 0.46 &&
      (player.position === 'BTN' || player.position === 'SB' || player.position === 'CO')
        ? 0.12 : 0;
    const openFreq = Math.min(0.60, baseFreq + stealBonus);

    if (!facingRaise) {
      if (str >= (1 - openFreq) && valid.canRaise) {
        return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.8, valid) };
      }
      if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
      return { type: 'PLAYER_FOLD', playerId };
    }
    // COPER: if hero VPIP too high, 3-bet them wider
    const threeBetThresh = tendencies?.vpipRate !== null &&
      tendencies?.vpipRate !== undefined &&
      tendencies.vpipRate > 0.38 ? 0.84 : 0.88;
    if (str > threeBetThresh && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.5, valid) };
    }
    if (str > 0.72 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: use pot odds when facing a bet, texture-aware sizing when betting
  const board = state.communityCards;
  const eq = estimatedEquity(cards, board);
  const texture = classifyBoardTexture(board);
  const facingBet = state.currentBet > player.currentBet;

  if (facingBet) {
    const callAmt = state.currentBet - player.currentBet;
    const reqEq = requiredEq(callAmt, state.pot);
    if (eq < reqEq * 0.85) return { type: 'PLAYER_FOLD', playerId };
    if (eq > reqEq + 0.20 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.75, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Betting out: c-bet with texture-appropriate sizing
  const cbetFreq = texture === 'dry' ? 0.55 : 0.38;
  const cbetSize = texture === 'dry' ? 0.33 : texture === 'wet' ? 0.65 : 0.50;
  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);

  if ((pair || draw || Math.random() < cbetFreq * 0.35) && valid.canRaise && Math.random() < cbetFreq) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, cbetSize, valid) };
  }
  if ((pair || draw) && valid.canCall) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- LAG -------------------------------------------------------------------

function lagAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
  tendencies?: HeroTendencies,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const str = preflopStrength(cards);
    const facingRaise = state.currentBet > 1;

    if (!facingRaise && str > 0.38 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.85, valid) };
    }
    // COPER: 3-bet more vs loose hero
    const lightThresh = tendencies?.vpipRate !== null &&
      tendencies?.vpipRate !== undefined &&
      tendencies.vpipRate > 0.38 ? 0.20 : 0.25;
    if (facingRaise && (str > 0.80 || (str > 0.50 && Math.random() < lightThresh)) && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.8, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  const board = state.communityCards;
  const eq = estimatedEquity(cards, board);
  const facingBet = state.currentBet > player.currentBet;
  const texture = classifyBoardTexture(board);

  if (facingBet) {
    const callAmt = state.currentBet - player.currentBet;
    const reqEq = requiredEq(callAmt, state.pot);
    if (eq < reqEq * 0.80) return { type: 'PLAYER_FOLD', playerId };
    if (eq > reqEq + 0.15 && valid.canRaise && Math.random() < 0.45) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.85, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  const cbetSize = texture === 'dry' ? 0.40 : 0.75;
  const bluffFreq = tendencies?.riverFoldRate !== null &&
    tendencies?.riverFoldRate !== undefined &&
    tendencies.riverFoldRate > 0.55
    ? 0.38 : 0.25;

  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);
  const aggr = pair || draw || Math.random() < bluffFreq;

  if (aggr && valid.canRaise) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, cbetSize, valid) };
  }
  if ((pair || draw) && valid.canCall) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- GTO -------------------------------------------------------------------

const GTO_OPEN_FREQ: Record<string, number> = {
  BTN: 0.45, CO: 0.28, HJ: 0.22, LJ: 0.18, UTG: 0.15, UTG1: 0.14, UTG2: 0.12, SB: 0.40, BB: 0,
};

function gtoAIAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
  tendencies?: HeroTendencies,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  if (state.street === 'preflop') {
    const key = handToKey(cards);
    const stackDepth = player.stack <= 22 ? '20bb' : player.stack <= 45 ? '40bb' : '100bb';
    const range = getOpenRange(player.position, stackDepth);
    const freq = range ? (range.combos[key] ?? 0) : 0;
    // Tight ±8% noise (less than before) — GTO is more disciplined
    const noise = (Math.random() - 0.5) * 0.08;
    const adjustedFreq = Math.max(0, Math.min(1, freq + noise));

    // COPER: steal more vs BB over-folder
    const stealBonus =
      tendencies?.bbDefenseRate !== null &&
      tendencies?.bbDefenseRate !== undefined &&
      tendencies.bbDefenseRate < 0.44 &&
      (player.position === 'BTN' || player.position === 'SB')
        ? 0.10 : 0;

    const openFreq = GTO_OPEN_FREQ[player.position] ?? 0.15;

    if (state.currentBet <= 1) {
      const threshold = Math.max(0.30, (1 - openFreq - stealBonus));
      const openThresh = adjustedFreq + stealBonus;
      if (openThresh >= threshold && valid.canRaise) {
        return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
      }
      if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
      return { type: 'PLAYER_FOLD', playerId };
    }

    // Facing raise: 3-bet linearly wider vs loose heroes
    const threeBetThresh = tendencies?.vpipRate !== null &&
      tendencies?.vpipRate !== undefined &&
      tendencies.vpipRate > 0.38 ? 0.70 : 0.78;
    if (adjustedFreq >= threeBetThresh && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 2.5, valid) };
    }
    if (adjustedFreq >= 0.38 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Postflop: ToolPoker architecture — use solver-aware sizing by texture
  const board = state.communityCards;
  const texture = classifyBoardTexture(board);
  const eq = estimatedEquity(cards, board);
  const facingBet = state.currentBet > player.currentBet;
  const noise = (Math.random() - 0.5) * 0.08;

  if (facingBet) {
    const callAmt = state.currentBet - player.currentBet;
    const reqEq = requiredEq(callAmt, state.pot);
    const adjustedEq = eq + noise;
    if (adjustedEq < reqEq - 0.05) return { type: 'PLAYER_FOLD', playerId };
    if (adjustedEq > reqEq + 0.22 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.75, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  // Betting: GTO uses range-balanced sizing — small on dry, large on wet
  const cbetSize = texture === 'dry' ? 0.33 : texture === 'wet' ? 0.67 : texture === 'monotone' ? 0.60 : 0.50;
  const cbetFreq = texture === 'dry' ? 0.50 : 0.38; // dry: polar range, bet wide; wet: merged, bet less

  // COPER: fire more river bluffs if hero tends to fold river (experience bank)
  const bluffBonus = tendencies?.riverFoldRate !== null &&
    tendencies?.riverFoldRate !== undefined &&
    state.street === 'river' &&
    tendencies.riverFoldRate > 0.55 ? 0.12 : 0;

  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);
  const isBluff = Math.random() < cbetFreq * 0.45 + bluffBonus;
  const shouldBet = pair || (draw && eq + noise > 0.33) || isBluff;

  if (shouldBet && valid.canRaise) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, cbetSize, valid) };
  }
  if ((pair || draw) && valid.canCall) return { type: 'PLAYER_CALL', playerId };
  if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
  return { type: 'PLAYER_FOLD', playerId };
}

// ---- Exploitative Reg ------------------------------------------------------

function exploitativeAction(
  state: GameState,
  playerId: number,
  valid: ValidActions,
  tendencies?: HeroTendencies,
): GameAction {
  const player = state.players.find(p => p.id === playerId)!;
  const cards = player.holeCards;
  if (!cards) return valid.canCheck ? { type: 'PLAYER_CHECK', playerId } : { type: 'PLAYER_FOLD', playerId };

  const str = preflopStrength(cards);

  if (state.street === 'preflop') {
    const heroLimped = state.actionsThisStreet.some(
      a => a.type === 'CALL' && state.players.find(p => p.id === a.playerId)?.isHero,
    );
    if (heroLimped && str > 0.42 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 1.2, valid) };
    }

    // COPER: if hero over-folds, steal more aggressively from steal positions
    const stealThresh = tendencies?.bbDefenseRate !== null &&
      tendencies?.bbDefenseRate !== undefined &&
      tendencies.bbDefenseRate < 0.44
        ? 0.38 : 0.50;
    if (str > stealThresh && (player.position === 'BTN' || player.position === 'SB' || player.position === 'CO') && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
    }
    if (str > 0.55 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.9, valid) };
    }
    if (str > 0.40 && valid.canCall) return { type: 'PLAYER_CALL', playerId };
    if (valid.canCheck) return { type: 'PLAYER_CHECK', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  const board = state.communityCards;
  const texture = classifyBoardTexture(board);
  const eq = estimatedEquity(cards, board);
  const facingBet = state.currentBet > player.currentBet;

  if (facingBet) {
    const callAmt = state.currentBet - player.currentBet;
    const reqEq = requiredEq(callAmt, state.pot);
    if (eq < reqEq * 0.88) return { type: 'PLAYER_FOLD', playerId };
    if (eq > reqEq + 0.18 && valid.canRaise) {
      return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, 0.80, valid) };
    }
    if (valid.canCall) return { type: 'PLAYER_CALL', playerId };
    return { type: 'PLAYER_FOLD', playerId };
  }

  const heroChecked = state.actionsThisStreet.some(
    a => a.type === 'CHECK' && state.players.find(p => p.id === a.playerId)?.isHero,
  );
  const cbetSize = texture === 'dry' ? 0.40 : 0.65;
  const pair = hasPair(cards, board);
  const draw = hasFlushDraw(cards, board) || hasStraightDraw(cards, board);

  // COPER: attack checks harder if hero has weak BB defense / high fold tendencies
  const checkRaiseFreq = tendencies?.bbDefenseRate !== null &&
    tendencies?.bbDefenseRate !== undefined &&
    tendencies.bbDefenseRate < 0.46 ? 0.55 : 0.38;

  if (heroChecked && valid.canRaise && (pair || draw || Math.random() < checkRaiseFreq)) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, cbetSize, valid) };
  }
  if (pair && valid.canRaise && Math.random() < 0.55) {
    return { type: 'PLAYER_RAISE', playerId, amount: potSizeBet(state.pot, cbetSize * 0.85, valid) };
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
  tendencies?: HeroTendencies,
): GameAction {
  if (!validActions.canFold && !validActions.canCheck && !validActions.canCall && !validActions.canRaise) {
    return { type: 'PLAYER_CHECK', playerId };
  }

  switch (profile.difficulty) {
    case 'calling_station':  return callingStationAction(state, playerId, validActions);
    case 'nit':              return nitAction(state, playerId, validActions);
    case 'tag':              return tagAction(state, playerId, validActions, tendencies);
    case 'lag':              return lagAction(state, playerId, validActions, tendencies);
    case 'gto':              return gtoAIAction(state, playerId, validActions, tendencies);
    case 'exploitative_reg': return exploitativeAction(state, playerId, validActions, tendencies);
    default:                 return tagAction(state, playerId, validActions, tendencies);
  }
}
