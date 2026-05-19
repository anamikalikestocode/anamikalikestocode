import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Card encoding: rank = card >> 2 (0=2..12=Ace), suit = card & 3 (0=clubs,1=diamonds,2=hearts,3=spades)

function cardRank(card: number): number {
  return card >> 2;
}

function cardSuit(card: number): number {
  return card & 3;
}

// Classify and score a 5-card hand.
// Returns a numeric score where higher = better hand.
// Score = (category << 20) | kicker_score
// Categories: 0=High card, 1=One pair, 2=Two pair, 3=Three of a kind,
//             4=Straight, 5=Flush, 6=Full house, 7=Four of a kind, 8=Straight flush
function scoreHand(cards: number[]): number {
  const ranks = cards.map(cardRank);
  const suits = cards.map(cardSuit);

  // Count rank frequencies
  const freq: number[] = new Array(13).fill(0);
  for (const r of ranks) freq[r]++;

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    }
    // Wheel: A-2-3-4-5 (Ace acts as low)
    // ranks present: 12,3,2,1,0 -> uniqueRanks sorted desc = [12,3,2,1,0]
    if (uniqueRanks[0] === 12 && uniqueRanks[1] === 3 && uniqueRanks[2] === 2 &&
        uniqueRanks[3] === 1 && uniqueRanks[4] === 0) {
      isStraight = true;
      straightHigh = 3; // 5-high straight, top non-ace card is rank 3 (=5)
    }
  }

  // Build groups: pairs, trips, quads
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (freq[r] === 4) quads.push(r);
    else if (freq[r] === 3) trips.push(r);
    else if (freq[r] === 2) pairs.push(r);
    else if (freq[r] === 1) singles.push(r);
  }

  // kicker_score: encode up to 5 ranks into base-13 number (descending importance)
  function kickerScore(rankList: number[]): number {
    let score = 0;
    for (const r of rankList) {
      score = score * 13 + r;
    }
    return score;
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return (8 << 20) | straightHigh;
  }

  // Four of a Kind
  if (quads.length === 1) {
    const kicker = singles[0] ?? pairs[0] ?? trips[0] ?? 0;
    return (7 << 20) | kickerScore([quads[0], kicker]);
  }

  // Full House
  if (trips.length === 1 && pairs.length === 1) {
    return (6 << 20) | kickerScore([trips[0], pairs[0]]);
  }

  // Flush
  if (isFlush) {
    const sortedRanks = [...ranks].sort((a, b) => b - a);
    return (5 << 20) | kickerScore(sortedRanks);
  }

  // Straight
  if (isStraight) {
    return (4 << 20) | straightHigh;
  }

  // Three of a Kind
  if (trips.length === 1) {
    const kickers = singles.slice(0, 2);
    return (3 << 20) | kickerScore([trips[0], ...kickers]);
  }

  // Two Pair
  if (pairs.length === 2) {
    const kicker = singles[0] ?? 0;
    return (2 << 20) | kickerScore([pairs[0], pairs[1], kicker]);
  }

  // One Pair
  if (pairs.length === 1) {
    return (1 << 20) | kickerScore([pairs[0], ...singles.slice(0, 3)]);
  }

  // High Card
  const sortedRanks = [...ranks].sort((a, b) => b - a);
  return (0 << 20) | kickerScore(sortedRanks);
}

async function main() {
  console.log('Building hand rank table for all C(52,5) = 2,598,960 combinations...');

  const table: Record<string, number> = {};
  let count = 0;

  for (let a = 0; a < 48; a++) {
    for (let b = a + 1; b < 49; b++) {
      for (let c = b + 1; c < 50; c++) {
        for (let d = c + 1; d < 51; d++) {
          for (let e = d + 1; e < 52; e++) {
            const cards = [a, b, c, d, e];
            const key = cards.join(',');
            table[key] = scoreHand(cards);
            count++;
            if (count % 100000 === 0) {
              console.log(`  Processed ${count.toLocaleString()} combinations...`);
            }
          }
        }
      }
    }
  }

  console.log(`Done! Total combinations: ${count.toLocaleString()}`);

  const outputPath = path.join(__dirname, '..', 'public', 'hand-rank-table.json');
  console.log(`Writing to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(table));
  console.log('hand-rank-table.json written successfully.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
