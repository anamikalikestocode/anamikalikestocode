import { BoardCards, HandCards } from './cards';
import { Street, StreetAction, Position } from './game';
import { GTOHint, SpotType, SpotStat, LeakReport } from './gto';

export interface StreetSnapshot {
  street: Street;
  board: BoardCards;
  heroCards: HandCards;
  heroStack: number;
  pot: number;
  actions: StreetAction[];
  heroEquity: number;
  heroPosition: Position;
  hint: GTOHint | null;
  spotType: SpotType;
}

export interface HandSnapshot {
  id: string;
  handNumber: number;
  timestamp: number;
  streets: StreetSnapshot[];
  heroNet: number;
  heroCards: HandCards;
  finalBoard: BoardCards;
  heroPosition: Position;
  numPlayers: number;
  mistakes: number;
  spews: number;
  evDelta: number;
  spotTypes: SpotType[];
  shareCode?: string;
}

// Extended session stats — tracks the specific leaks identified in research
export interface SessionStats {
  handsPlayed: number;
  totalEvDelta: number;
  evPer100: number;
  mistakeCount: number;
  spewCount: number;
  optimalCount: number;
  marginalCount: number;
  bbWon: number;
  startTime: number;
  spotStats: Record<SpotType, SpotStat>;

  // Research-backed stat tracking
  vpip: { hands: number; voluntary: number };          // voluntarily put $ in preflop
  pfr: { hands: number; raised: number };              // preflop raise %
  bbDefense: { faced: number; defended: number };      // BB fold-to-steal rate
  cbetStats: {                                          // c-bet sizing by texture
    dry: { count: number; correctSize: number };
    wet: { count: number; correctSize: number };
  };
  riverThinValue: { spots: number; bet: number };      // missed thin river value
  sizingTells: SizingTell[];                           // detected range tells
  bluffFollowThrough: { started: number; completed: number }; // flop bluff → river completion
}

export interface SizingTell {
  spotType: SpotType;
  description: string;       // "You use large bets with strong hands on wet boards"
  frequency: number;         // how often this pattern appears (0-1)
  evImpact: number;          // estimated bb/100 cost
}

export interface LeakAnalysis {
  topLeaks: LeakReport[];
  generatedAt: number;
  handsAnalyzed: number;
}

export type TrainingMode = 'train' | 'drill' | 'review';

export type DrillFilter = {
  spotType: SpotType | null;
  position: Position | null;
  stackDepth: '20bb' | '40bb' | '100bb' | null;
  verdictFilter: 'mistakes_only' | 'all' | null;
};
