import { Card } from '../types/cards';
import { createDeck, shuffleDeck, removeCards } from './cards';
import { evaluate7 } from './evaluator';

export interface EquityResult {
  equity: number;  // 0-1, hero win probability
  ties: number;    // fraction of ties
  samples: number;
}

export interface EquityInput {
  heroCards: [Card, Card];
  villainCards: [Card, Card] | null; // null = random hand from remaining deck
  board: Card[]; // 0-5 known board cards
  iterations: number;
}

export function calculateEquity(input: EquityInput): EquityResult {
  const { heroCards, villainCards, board, iterations } = input;

  // Cards that are fixed/known
  const knownCards: Card[] = [...heroCards];
  if (villainCards) {
    knownCards.push(...villainCards);
  }
  knownCards.push(...board);

  // Build remaining deck minus all known cards
  const fullDeck = createDeck();
  const remainingDeck = removeCards(fullDeck, knownCards);

  let wins = 0;
  let ties = 0;
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleDeck(remainingDeck);
    let idx = 0;

    // Deal villain cards if needed
    let vCards: [Card, Card];
    if (villainCards) {
      vCards = villainCards;
    } else {
      vCards = [shuffled[idx++], shuffled[idx++]];
    }

    // Complete board to 5 cards
    const boardNeeded = 5 - board.length;
    const runoutBoard: Card[] = [...board];
    for (let b = 0; b < boardNeeded; b++) {
      runoutBoard.push(shuffled[idx++]);
    }

    // Build 7-card hands
    const heroHand: [Card, Card, Card, Card, Card, Card, Card] = [
      heroCards[0], heroCards[1],
      runoutBoard[0], runoutBoard[1], runoutBoard[2], runoutBoard[3], runoutBoard[4],
    ];
    const villainHand: [Card, Card, Card, Card, Card, Card, Card] = [
      vCards[0], vCards[1],
      runoutBoard[0], runoutBoard[1], runoutBoard[2], runoutBoard[3], runoutBoard[4],
    ];

    const heroScore = evaluate7(heroHand);
    const villainScore = evaluate7(villainHand);

    if (heroScore > villainScore) {
      wins++;
    } else if (heroScore === villainScore) {
      ties++;
    }
    total++;
  }

  const equity = (wins + 0.5 * ties) / total;

  return {
    equity,
    ties: ties / total,
    samples: total,
  };
}
