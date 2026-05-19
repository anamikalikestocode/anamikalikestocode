import { Deck } from './cards';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Phase = 'waiting' | 'dealing' | 'betting' | 'advancing' | 'showdown' | 'complete';
export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG1' | 'UTG2' | 'LJ' | 'HJ' | 'CO';

export type Difficulty = 'calling_station' | 'nit' | 'tag' | 'lag' | 'gto' | 'exploitative_reg';

export interface Player {
  id: number;
  name: string;
  stack: number;
  holeCards: [number, number] | null;
  position: Position;
  isHero: boolean;
  isAI: boolean;
  difficulty?: Difficulty;
  currentBet: number;
  totalBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: number[];
}

export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export interface PlayerAction {
  type: ActionType;
  amount?: number;
  playerId: number;
}

export interface StreetAction extends PlayerAction {
  street: Street;
}

export type GameAction =
  | { type: 'DEAL_HAND' }
  | { type: 'POST_BLIND'; playerId: number; amount: number }
  | { type: 'PLAYER_FOLD'; playerId: number }
  | { type: 'PLAYER_CALL'; playerId: number }
  | { type: 'PLAYER_RAISE'; playerId: number; amount: number }
  | { type: 'PLAYER_CHECK'; playerId: number }
  | { type: 'PLAYER_ALL_IN'; playerId: number }
  | { type: 'ADVANCE_STREET' }
  | { type: 'SHOWDOWN' }
  | { type: 'AWARD_POT'; winnerId: number; amount: number }
  | { type: 'NEW_HAND' };

export interface GameState {
  street: Street;
  phase: Phase;
  deck: Deck;
  communityCards: number[];
  players: Player[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  lastRaiseSize: number;
  toAct: number;
  lastAggressor: number | null;
  handNumber: number;
  dealerPosition: number;
  actionsThisStreet: StreetAction[];
  winners: number[];
  isHandOver: boolean;
}

export interface ValidActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number;
}

export const POSITIONS_BY_COUNT: Record<number, Position[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'SB', 'BB', 'UTG'],
  5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
  7: ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'HJ', 'CO'],
  8: ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'LJ', 'HJ', 'CO'],
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO'],
};
