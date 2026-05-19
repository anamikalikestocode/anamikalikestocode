import { HandCards } from './cards';

// 5-tier verdict: finer granularity than 3-tier for elite players
export type DecisionVerdict = 'gto' | 'acceptable' | 'marginal' | 'mistake' | 'spew';
export type GTOAction = 'fold' | 'call' | 'raise' | 'check';

export interface RangeEntry {
  hand: string; // "AKs", "JTo", "77"
  raiseFreq: number;
  callFreq: number;
  foldFreq: number;
}

export interface RangeData {
  meta: {
    position: string;
    action: string;
    stackDepth: string;
    vsAction: string | null;
  };
  combos: Record<string, number>; // hand key -> primary action frequency
}

export interface GTOHint {
  verdict: DecisionVerdict;
  gtoAction: GTOAction;
  gtoRaiseFreq: number;
  gtoCallFreq: number;
  gtoFoldFreq: number;
  playerAction: GTOAction;
  explanation: string;
  rangeData: RangeData | null;
  evDeltaBB: number | null; // estimated EV delta in BB (per decision)
  evDeltaPer100: number | null; // annualized EV impact per 100 hands
  equity?: number;
  requiredEquity?: number;
  spotType: SpotType;
}

export type SpotType =
  | 'preflop_open'
  | 'preflop_vs_open'
  | 'preflop_3bet'
  | 'preflop_vs_3bet'
  | 'preflop_4bet'
  | 'preflop_squeeze'
  | 'preflop_push_fold'
  | 'flop_cbet'
  | 'flop_vs_cbet'
  | 'turn_barrel'
  | 'turn_vs_barrel'
  | 'river_bluff'
  | 'river_bluff_catch'
  | 'river_value'
  | 'short_stack'
  | 'other';

export interface PostflopContext {
  heroEquity: number;
  requiredEquity: number;
  spr: number;
  potSize: number;
  betSize: number;
  inPosition: boolean;
  boardTexture: BoardTexture;
  street: 'flop' | 'turn' | 'river';
  isCheckRaise: boolean;
  facingBet: boolean;
}

export type BoardTexture = 'dry' | 'wet' | 'paired' | 'monotone' | 'rainbow_connected';

export type HandKey = string; // canonical 169-key: "AKs", "JTo", "77"

// For leak detection
export interface SpotStat {
  spotType: SpotType;
  decisions: number;
  totalEvDelta: number;
  mistakeCount: number;
  spewCount: number;
}

export interface LeakReport {
  spotType: SpotType;
  description: string;
  evLostPer100: number;
  sampleSize: number;
  recommendation: string;
}
