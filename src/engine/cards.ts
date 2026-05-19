import { Card, Deck, HandCards } from '../types/cards';

export function createDeck(): Deck {
  const deck: Deck = [];
  for (let i = 0; i < 52; i++) {
    deck.push(i);
  }
  return deck;
}

export function shuffleDeck(deck: Deck): Deck {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardRank(card: Card): number {
  return card >> 2;
}

export function cardSuit(card: Card): number {
  return card & 3;
}

export function rankToChar(rank: number): string {
  const chars = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  return chars[rank];
}

export function rankToDisplay(rank: number): string {
  const chars = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return chars[rank];
}

export function suitToChar(suit: number): string {
  const chars = ['c', 'd', 'h', 's'];
  return chars[suit];
}

export function cardToString(card: Card): string {
  return rankToChar(cardRank(card)) + suitToChar(cardSuit(card));
}

export function stringToCard(s: string): Card {
  const rankChars = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suitChars = ['c', 'd', 'h', 's'];
  const rank = rankChars.indexOf(s[0]);
  const suit = suitChars.indexOf(s[1]);
  if (rank === -1 || suit === -1) {
    throw new Error(`Invalid card string: ${s}`);
  }
  return (rank << 2) | suit;
}

export function cardsToStrings(cards: Card[]): string[] {
  return cards.map(cardToString);
}

export function removeCards(deck: Deck, used: Card[]): Deck {
  const usedSet = new Set(used);
  return deck.filter(card => !usedSet.has(card));
}
