import { HandCards, BoardCards } from '../types/cards';
import { Position } from '../types/game';
import { SpotType } from '../types/gto';
import { StreetSnapshot, HandSnapshot } from '../types/training';

export function createHandSnapshot(
  handNumber: number,
  heroCards: HandCards,
  finalBoard: BoardCards,
  streets: StreetSnapshot[],
  heroNet: number,
  heroPosition: Position,
  numPlayers: number,
): HandSnapshot {
  return {
    id: `hand-${handNumber}-${Date.now()}`,
    handNumber,
    timestamp: Date.now(),
    streets,
    heroNet,
    heroCards,
    finalBoard,
    heroPosition,
    numPlayers,
    mistakes: countMistakes(streets),
    spews: countSpews(streets),
    evDelta: calculateHandEvDelta(streets),
    spotTypes: [...new Set(streets.map(s => s.spotType))] as SpotType[],
  };
}

export function calculateHandEvDelta(streets: StreetSnapshot[]): number {
  let total = 0;
  for (const street of streets) {
    if (street.hint?.evDeltaBB != null) {
      total += street.hint.evDeltaBB;
    }
  }
  return total;
}

export function countMistakes(streets: StreetSnapshot[]): number {
  return streets.filter(s => s.hint?.verdict === 'mistake').length;
}

export function countSpews(streets: StreetSnapshot[]): number {
  return streets.filter(s => s.hint?.verdict === 'spew').length;
}
