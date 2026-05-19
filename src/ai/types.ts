import { Difficulty } from '../types/game';

export interface AIProfile {
  difficulty: Difficulty;
  name: string;
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
