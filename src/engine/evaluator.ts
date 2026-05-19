import { Card } from '../types/cards';

// Module-level table storage
let handRankTable: Map<string, number> | null = null;

export async function initEvaluator(): Promise<void> {
  if (handRankTable !== null) return;

  const response = await fetch('/hand-rank-table.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch hand-rank-table.json: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as Record<string, number>;
  handRankTable = new Map(Object.entries(data));
}

export function evaluate5(cards: [Card, Card, Card, Card, Card]): number {
  if (!handRankTable) {
    throw new Error('Evaluator not initialized. Call initEvaluator() first.');
  }
  const key = [...cards].sort((a, b) => a - b).join(',');
  const score = handRankTable.get(key);
  if (score === undefined) {
    throw new Error(`Card combination not found in table: ${key}`);
  }
  return score;
}

export function evaluate7(cards: [Card, Card, Card, Card, Card, Card, Card]): number {
  // Try all C(7,5) = 21 combinations by dropping each pair of indices
  let best = -1;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 7; j++) {
      // Build 5-card hand excluding indices i and j
      const five: Card[] = [];
      for (let k = 0; k < 7; k++) {
        if (k !== i && k !== j) five.push(cards[k]);
      }
      const score = evaluate5(five as [Card, Card, Card, Card, Card]);
      if (score > best) best = score;
    }
  }
  return best;
}

export function handName(score: number): string {
  const category = score >> 20;
  switch (category) {
    case 0: return 'High Card';
    case 1: return 'One Pair';
    case 2: return 'Two Pair';
    case 3: return 'Three of a Kind';
    case 4: return 'Straight';
    case 5: return 'Flush';
    case 6: return 'Full House';
    case 7: return 'Four of a Kind';
    case 8: {
      // Royal Flush: Straight Flush with Ace high (straightHigh = 12)
      const highCard = score & ((1 << 20) - 1);
      if (highCard === 12) return 'Royal Flush';
      return 'Straight Flush';
    }
    default: return 'Unknown';
  }
}

export function compareHands(scoreA: number, scoreB: number): -1 | 0 | 1 {
  if (scoreA > scoreB) return -1; // A wins
  if (scoreA < scoreB) return 1;  // B wins
  return 0;                        // Tie
}
