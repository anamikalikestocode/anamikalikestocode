import { HandKey } from '../types/gto';
import { cardRank, cardSuit, rankToChar } from '../engine/cards';

const RANK_CHARS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

export function handToKey(cards: [number, number]): HandKey {
  const r1 = cardRank(cards[0]);
  const r2 = cardRank(cards[1]);
  const s1 = cardSuit(cards[0]);
  const s2 = cardSuit(cards[1]);

  if (r1 === r2) {
    // Pocket pair
    return `${RANK_CHARS[r1]}${RANK_CHARS[r2]}`;
  }

  // Put higher rank first
  const [hi, hiSuit, lo] = r1 > r2
    ? [r1, s1, r2]
    : [r2, s2, r1];
  const suited = s1 === s2 ? 's' : 'o';
  return `${RANK_CHARS[hi]}${RANK_CHARS[lo]}${suited}`;
}

export function lookupHandFrequency(key: HandKey, combos: Record<string, number>): number {
  return combos[key] ?? 0;
}

export function isHandInRange(key: HandKey, combos: Record<string, number>, threshold = 0.5): boolean {
  return lookupHandFrequency(key, combos) >= threshold;
}
