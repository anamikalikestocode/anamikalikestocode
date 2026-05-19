import { Difficulty } from '../types/game';

export interface AIProfile {
  difficulty: Difficulty;
  name: string;
}

// Live tendencies read from session stats — AI uses these to adapt and exploit
export interface HeroTendencies {
  bbDefenseRate: number | null;   // < 0.46 → AI steals more
  vpipRate: number | null;        // > gtoVpip+0.10 → AI 3-bets wider
  riverFoldRate: number | null;   // high → AI fires more river bluffs
}

export const AI_NAMES: Record<Difficulty, string[]> = {
  calling_station: ['Fish McGee', 'CallBot', 'Loosey'],
  nit:             ['Granite', 'FoldBot', 'Rocky'],
  tag:             ['ABC Pro', 'SolidPlayer', 'RegBot'],
  lag:             ['Laggy', 'Maniac', 'PreasureBot'],
  gto:             ['Solver', 'GTO Ghost', 'Optimus'],
  exploitative_reg:['Alex', 'Jordan', 'RegHunter'],
};

export function randomAIName(difficulty: Difficulty, seed: number): string {
  const names = AI_NAMES[difficulty];
  return names[seed % names.length];
}
