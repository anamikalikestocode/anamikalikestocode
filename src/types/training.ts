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
  heroNet: number; // BB won or lost this hand
  heroCards: HandCards;
  finalBoard: BoardCards;
  heroPosition: Position;
  numPlayers: number;
  mistakes: number;
  spews: number;
  evDelta: number; // cumulative EV delta vs GTO for this hand
  spotTypes: SpotType[]; // all spot types encountered
  shareCode?: string; // base64 encoded for sharing
}

export interface SessionStats {
  handsPlayed: number;
  totalEvDelta: number; // total EV lost to mistakes
  evPer100: number; // (totalEvDelta / handsPlayed) * 100
  mistakeCount: number;
  spewCount: number;
  optimalCount: number; // gto + acceptable
  marginalCount: number;
  bbWon: number;
  startTime: number;
  spotStats: Record<SpotType, SpotStat>;
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
