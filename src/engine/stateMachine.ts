import {
  GameState,
  GameAction,
  Player,
  Position,
  Street,
  SidePot,
  ValidActions,
  Difficulty,
  StreetAction,
  POSITIONS_BY_COUNT,
} from '../types/game';
import { createDeck, shuffleDeck } from './cards';

// ─── Helpers ────────────────────────────────────────────────────────────────

function nextStreet(street: Street): Street {
  switch (street) {
    case 'preflop': return 'flop';
    case 'flop':    return 'turn';
    case 'turn':    return 'river';
    case 'river':   return 'showdown';
    default:        return 'showdown';
  }
}

/** Returns number of community cards that should be present after dealing the given street. */
function communityCardsForStreet(street: Street): number {
  switch (street) {
    case 'flop':  return 3;
    case 'turn':  return 4;
    case 'river': return 5;
    default:      return 0;
  }
}

/** Players who are still active (not folded, not all-in) — i.e. can act. */
function activePlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.isFolded && !p.isAllIn);
}

/** Players who are not folded (including all-in). */
function nonFoldedPlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.isFolded);
}

/**
 * Find the next player index (in state.players array) who can act,
 * starting *after* the given index, wrapping around.
 */
function nextToAct(state: GameState, fromIndex: number): number {
  const n = state.players.length;
  for (let i = 1; i < n; i++) {
    const idx = (fromIndex + i) % n;
    if (!state.players[idx].isFolded && !state.players[idx].isAllIn) {
      return idx;
    }
  }
  return -1; // No one left who can act
}

/**
 * Determine the first player to act at the start of a post-flop street.
 * This is the first non-folded, non-all-in player to the left of the dealer.
 */
function firstToActPostflop(state: GameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.dealerPosition + i) % n;
    if (!state.players[idx].isFolded && !state.players[idx].isAllIn) {
      return idx;
    }
  }
  return -1;
}

/**
 * Determine if all remaining (non-folded) active players have put in the
 * same amount this street and everyone has had a chance to act, OR if no
 * one can act (everyone folded/all-in).
 */
function isBettingComplete(state: GameState): boolean {
  const canAct = activePlayers(state);
  if (canAct.length === 0) return true;

  // All active players must have matched currentBet and acted at least once
  // We check: every active player's currentBet === state.currentBet
  // This is sufficient because raise resets the cycle (toAct changes).
  for (const p of canAct) {
    if (p.currentBet < state.currentBet) return false;
  }
  return true;
}

/** Build side pots when one or more players are all-in. */
function buildSidePots(players: Player[]): SidePot[] {
  // Collect total bets per player (totalBet across the hand)
  const relevant = players.filter(p => !p.isFolded);
  if (relevant.length === 0) return [];

  // Sorted unique all-in amounts (as contribution levels)
  const allInLevels = relevant
    .filter(p => p.isAllIn)
    .map(p => p.totalBet)
    .sort((a, b) => a - b);

  if (allInLevels.length === 0) {
    // No all-ins: single pot
    const amount = players.reduce((sum, p) => sum + p.totalBet, 0);
    const eligible = relevant.map(p => p.id);
    return [{ amount, eligiblePlayerIds: eligible }];
  }

  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (const level of allInLevels) {
    if (level === prevLevel) continue;
    const amount = relevant.reduce((sum, p) => {
      const contrib = Math.min(p.totalBet, level) - Math.min(p.totalBet, prevLevel);
      return sum + contrib;
    }, 0);
    const eligible = relevant.filter(p => p.totalBet >= level).map(p => p.id);
    if (amount > 0) {
      pots.push({ amount, eligiblePlayerIds: eligible });
    }
    prevLevel = level;
  }

  // Remainder pot (for players not all-in)
  const remaining = relevant.reduce((sum, p) => {
    return sum + Math.max(0, p.totalBet - prevLevel);
  }, 0);
  if (remaining > 0) {
    const eligible = relevant.filter(p => !p.isAllIn).map(p => p.id);
    pots.push({ amount: remaining, eligiblePlayerIds: eligible });
  }

  return pots;
}

// ─── createInitialState ──────────────────────────────────────────────────────

export function createInitialState(
  numPlayers: number,
  stackSize: number,
  _difficulty: Difficulty,
): GameState {
  const clamped = Math.min(9, Math.max(2, numPlayers));
  const positionMap: Position[] = POSITIONS_BY_COUNT[clamped] ?? POSITIONS_BY_COUNT[2];

  const players: Player[] = [];
  for (let i = 0; i < clamped; i++) {
    players.push({
      id: i,
      name: i === 0 ? 'Hero' : `Villain ${i}`,
      stack: stackSize,
      holeCards: null,
      position: positionMap[i] ?? 'UTG',
      isHero: i === 0,
      isAI: i !== 0,
      difficulty: i !== 0 ? _difficulty : undefined,
      currentBet: 0,
      totalBet: 0,
      isFolded: false,
      isAllIn: false,
      isDealer: i === 0,
    });
  }

  return {
    street: 'preflop',
    phase: 'waiting',
    deck: createDeck(),
    communityCards: [],
    players,
    pot: 0,
    sidePots: [],
    currentBet: 0,
    lastRaiseSize: 1, // 1 BB
    toAct: 0,
    lastAggressor: null,
    handNumber: 0,
    dealerPosition: 0,
    actionsThisStreet: [],
    winners: [],
    isHandOver: false,
  };
}

// ─── gameReducer ─────────────────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  // Clone players helper
  const clonePlayers = (): Player[] => state.players.map(p => ({ ...p }));

  switch (action.type) {
    case 'DEAL_HAND': {
      const players = clonePlayers();
      const n = players.length;
      const dealer = state.dealerPosition;

      // Reset player state
      for (const p of players) {
        p.holeCards = null;
        p.currentBet = 0;
        p.totalBet = 0;
        p.isFolded = false;
        p.isAllIn = false;
        p.isDealer = false;
      }
      players[dealer].isDealer = true;

      // Shuffle and deal 2 hole cards per player starting left of dealer
      const deck = shuffleDeck(createDeck());
      let deckIdx = 0;
      for (let i = 0; i < n; i++) {
        const pidx = (dealer + 1 + i) % n;
        players[pidx].holeCards = [deck[deckIdx++], deck[deckIdx++]];
      }

      // Post blinds automatically
      // 2 players: BTN=SB (dealer) posts 0.5bb, BB posts 1bb
      // 3+ players: SB=(dealer+1) posts 0.5bb, BB=(dealer+2) posts 1bb
      const sbIdx = n === 2 ? dealer : (dealer + 1) % n;
      const bbIdx = n === 2 ? (dealer + 1) % n : (dealer + 2) % n;

      // SB
      const sbAmount = Math.min(0.5, players[sbIdx].stack);
      players[sbIdx].stack -= sbAmount;
      players[sbIdx].currentBet = sbAmount;
      players[sbIdx].totalBet = sbAmount;

      // BB
      const bbAmount = Math.min(1, players[bbIdx].stack);
      players[bbIdx].stack -= bbAmount;
      players[bbIdx].currentBet = bbAmount;
      players[bbIdx].totalBet = bbAmount;

      const pot = sbAmount + bbAmount;

      // First to act preflop:
      // 2p: BTN/SB (dealer) already posted — but in heads-up BTN acts first preflop
      // 3+: UTG = player after BB
      let firstToAct: number;
      if (n === 2) {
        firstToAct = dealer; // BTN/SB acts first heads-up
      } else {
        firstToAct = (bbIdx + 1) % n; // UTG = after BB
      }

      return {
        ...state,
        street: 'preflop',
        phase: 'betting',
        deck: deck.slice(deckIdx),
        communityCards: [],
        players,
        pot,
        sidePots: [],
        currentBet: 1,
        lastRaiseSize: 1,
        toAct: firstToAct,
        lastAggressor: null,
        actionsThisStreet: [],
        winners: [],
        isHandOver: false,
        handNumber: state.handNumber + 1,
      };
    }

    case 'POST_BLIND': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);
      if (pidx === -1) return state;

      const p = players[pidx];
      const amount = Math.min(action.amount, p.stack);
      p.stack -= amount;
      p.currentBet = amount;
      p.totalBet += amount;
      if (p.stack === 0) p.isAllIn = true;

      const pot = state.pot + amount;
      const currentBet = Math.max(state.currentBet, amount);

      return {
        ...state,
        players,
        pot,
        currentBet,
      };
    }

    case 'PLAYER_FOLD': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);
      if (pidx === -1) return state;
      players[pidx].isFolded = true;

      const streetAction: StreetAction = {
        type: 'FOLD',
        playerId: action.playerId,
        street: state.street,
      };

      // Check if only one player remains
      const remaining = players.filter(p => !p.isFolded);
      if (remaining.length === 1) {
        return {
          ...state,
          players,
          winners: [remaining[0].id],
          isHandOver: true,
          phase: 'complete',
          actionsThisStreet: [...state.actionsThisStreet, streetAction],
        };
      }

      const next = nextToAct({ ...state, players }, pidx);
      return {
        ...state,
        players,
        toAct: next,
        actionsThisStreet: [...state.actionsThisStreet, streetAction],
      };
    }

    case 'PLAYER_CALL': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);
      if (pidx === -1) return state;

      const p = players[pidx];
      const callAmount = Math.min(state.currentBet - p.currentBet, p.stack);
      p.stack -= callAmount;
      p.currentBet += callAmount;
      p.totalBet += callAmount;
      if (p.stack === 0) p.isAllIn = true;

      const pot = state.pot + callAmount;

      const streetAction: StreetAction = {
        type: 'CALL',
        amount: callAmount,
        playerId: action.playerId,
        street: state.street,
      };

      const newState = {
        ...state,
        players,
        pot,
        actionsThisStreet: [...state.actionsThisStreet, streetAction],
      };

      if (isBettingComplete({ ...newState, toAct: nextToAct(newState, pidx) })) {
        return { ...newState, phase: 'advancing' };
      }

      return { ...newState, toAct: nextToAct(newState, pidx) };
    }

    case 'PLAYER_CHECK': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);

      const streetAction: StreetAction = {
        type: 'CHECK',
        playerId: action.playerId,
        street: state.street,
      };

      const newState = {
        ...state,
        players,
        actionsThisStreet: [...state.actionsThisStreet, streetAction],
      };

      const next = nextToAct(newState, pidx);

      // After a check, if the next player has already matched currentBet
      // and we've gone around, advance street
      if (isBettingComplete({ ...newState, toAct: next })) {
        return { ...newState, phase: 'advancing' };
      }

      return { ...newState, toAct: next };
    }

    case 'PLAYER_RAISE': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);
      if (pidx === -1) return state;

      const p = players[pidx];
      // action.amount = total amount player wants to have bet this street
      const totalRaise = Math.min(action.amount, p.stack + p.currentBet);
      const toAdd = totalRaise - p.currentBet;
      p.stack -= toAdd;
      p.currentBet = totalRaise;
      p.totalBet += toAdd;
      if (p.stack === 0) p.isAllIn = true;

      const raiseSize = totalRaise - state.currentBet;
      const pot = state.pot + toAdd;

      const streetAction: StreetAction = {
        type: 'RAISE',
        amount: totalRaise,
        playerId: action.playerId,
        street: state.street,
      };

      return {
        ...state,
        players,
        pot,
        currentBet: totalRaise,
        lastRaiseSize: raiseSize > 0 ? raiseSize : state.lastRaiseSize,
        lastAggressor: action.playerId,
        toAct: nextToAct({ ...state, players }, pidx),
        actionsThisStreet: [...state.actionsThisStreet, streetAction],
      };
    }

    case 'PLAYER_ALL_IN': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.playerId);
      if (pidx === -1) return state;

      const p = players[pidx];
      const allInAmount = p.stack;
      const newTotal = p.currentBet + allInAmount;
      p.totalBet += allInAmount;
      p.currentBet = newTotal;
      p.stack = 0;
      p.isAllIn = true;

      const pot = state.pot + allInAmount;
      const newCurrentBet = Math.max(state.currentBet, newTotal);
      const raiseSize = newTotal > state.currentBet ? newTotal - state.currentBet : state.lastRaiseSize;

      const streetAction: StreetAction = {
        type: 'ALL_IN',
        amount: newTotal,
        playerId: action.playerId,
        street: state.street,
      };

      const sidePots = buildSidePots(players);
      const next = nextToAct({ ...state, players }, pidx);

      return {
        ...state,
        players,
        pot,
        sidePots,
        currentBet: newCurrentBet,
        lastRaiseSize: raiseSize,
        lastAggressor: newTotal > state.currentBet ? action.playerId : state.lastAggressor,
        toAct: next,
        actionsThisStreet: [...state.actionsThisStreet, streetAction],
      };
    }

    case 'ADVANCE_STREET': {
      const newStreet = nextStreet(state.street);
      const players = clonePlayers();

      // Reset per-street bets
      for (const p of players) {
        p.currentBet = 0;
      }

      // Deal community cards from deck
      const communityCards = [...state.communityCards];
      const deck = [...state.deck];
      const needed = communityCardsForStreet(newStreet) - communityCards.length;
      for (let i = 0; i < needed; i++) {
        communityCards.push(deck.shift()!);
      }

      if (newStreet === 'showdown') {
        return {
          ...state,
          players,
          deck,
          communityCards,
          street: newStreet,
          phase: 'showdown',
          currentBet: 0,
          lastRaiseSize: 1,
          actionsThisStreet: [],
          toAct: firstToActPostflop({ ...state, players }),
        };
      }

      const firstActor = firstToActPostflop({ ...state, players });

      return {
        ...state,
        players,
        deck,
        communityCards,
        street: newStreet,
        phase: 'betting',
        currentBet: 0,
        lastRaiseSize: 1,
        lastAggressor: null,
        toAct: firstActor,
        actionsThisStreet: [],
      };
    }

    case 'SHOWDOWN': {
      // Determine winners — caller should use evaluator, but we set phase
      return {
        ...state,
        phase: 'showdown',
      };
    }

    case 'AWARD_POT': {
      const players = clonePlayers();
      const pidx = players.findIndex(p => p.id === action.winnerId);
      if (pidx !== -1) {
        players[pidx].stack += action.amount;
      }
      const newPot = Math.max(0, state.pot - action.amount);
      return {
        ...state,
        players,
        pot: newPot,
        winners: [...state.winners, action.winnerId],
        isHandOver: true,
        phase: 'complete',
      };
    }

    case 'NEW_HAND': {
      const players = clonePlayers();
      const n = players.length;
      const newDealer = (state.dealerPosition + 1) % n;

      const positionList: Position[] = POSITIONS_BY_COUNT[n] ?? POSITIONS_BY_COUNT[2];
      for (let i = 0; i < n; i++) {
        const posIdx = (i - newDealer + n) % n;
        players[i].position = positionList[posIdx] ?? 'UTG';
        players[i].isDealer = i === newDealer;
        players[i].holeCards = null;
        players[i].currentBet = 0;
        players[i].totalBet = 0;
        players[i].isFolded = false;
        players[i].isAllIn = false;
      }

      return {
        ...state,
        players,
        dealerPosition: newDealer,
        street: 'preflop',
        phase: 'waiting',
        communityCards: [],
        pot: 0,
        sidePots: [],
        currentBet: 0,
        lastRaiseSize: 1,
        toAct: newDealer,
        lastAggressor: null,
        actionsThisStreet: [],
        winners: [],
        isHandOver: false,
      };
    }

    default:
      return state;
  }
}

// ─── getValidActions ──────────────────────────────────────────────────────────

export function getValidActions(state: GameState, playerId: number): ValidActions {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.isFolded || player.isAllIn) {
    return {
      canFold: false,
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canRaise: false,
      minRaise: 0,
      maxRaise: 0,
    };
  }

  const callAmount = Math.max(0, state.currentBet - player.currentBet);
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && callAmount < player.stack;
  const canFold = callAmount > 0;

  const minRaiseTotal = state.currentBet + state.lastRaiseSize;
  const maxRaiseTotal = player.currentBet + player.stack; // all-in
  const canRaise = player.stack > callAmount && minRaiseTotal <= maxRaiseTotal;

  return {
    canFold,
    canCheck,
    canCall,
    callAmount: Math.min(callAmount, player.stack),
    canRaise,
    minRaise: Math.min(minRaiseTotal, maxRaiseTotal),
    maxRaise: maxRaiseTotal,
  };
}

// ─── isRoundOver / isHandComplete ────────────────────────────────────────────

export function isRoundOver(state: GameState): boolean {
  const remaining = nonFoldedPlayers(state);
  if (remaining.length <= 1) return true;
  return isBettingComplete(state);
}

export function isHandComplete(state: GameState): boolean {
  return state.isHandOver || state.street === 'showdown';
}
