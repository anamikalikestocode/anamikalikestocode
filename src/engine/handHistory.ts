import { HandCards, BoardCards } from '../types/cards';
import { StreetSnapshot, HandSnapshot } from '../types/training';

/**
 * Create an immutable snapshot record for a completed hand.
 *
 * @param handNumber  Sequential hand counter (1-based).
 * @param heroCards   Hero's hole cards.
 * @param finalBoard  All 5 community cards (may be fewer if hand ended early).
 * @param streets     Per-street snapshots captured during play.
 * @param heroNet     Net BB result for the hero (positive = won, negative = lost).
 */
export function createHandSnapshot(
  handNumber: number,
  heroCards: HandCards,
  finalBoard: BoardCards,
  streets: StreetSnapshot[],
  heroNet: number,
): HandSnapshot {
  return {
    id: `hand-${handNumber}-${Date.now()}`,
    handNumber,
    timestamp: Date.now(),
    streets,
    heroNet,
    heroCards,
    finalBoard,
    mistakes: countMistakes(streets),
    evDelta: calculateHandEvDelta(streets),
  };
}

/**
 * Sum the EV delta (vs GTO) across every hinted decision in the hand.
 * evDelta values are negative when the player made a worse-than-optimal play.
 */
export function calculateHandEvDelta(streets: StreetSnapshot[]): number {
  let total = 0;
  for (const street of streets) {
    if (street.hint?.evDelta != null) {
      total += street.hint.evDelta;
    }
  }
  return total;
}

/**
 * Count how many decisions in the hand received a 'mistake' verdict.
 */
export function countMistakes(streets: StreetSnapshot[]): number {
  let count = 0;
  for (const street of streets) {
    if (street.hint?.verdict === 'mistake') {
      count++;
    }
  }
  return count;
}
