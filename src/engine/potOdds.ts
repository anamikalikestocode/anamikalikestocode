/**
 * Pot odds and poker math utilities.
 * All fractions are 0..1.
 */

/**
 * The fraction of the final pot you need to win to break even on a call.
 * potOdds = callAmount / potAfterCall
 *
 * Example: pot=100, call=50 → potAfterCall=150 → potOdds ≈ 0.333
 */
export function potOdds(callAmount: number, potAfterCall: number): number {
  if (potAfterCall <= 0) return 0;
  return callAmount / potAfterCall;
}

/**
 * Minimum equity (win %) needed to make a call break even.
 * requiredEquity = callAmount / (currentPot + callAmount)
 *
 * This is the same as pot odds expressed as a fraction of the total pot
 * you're investing into (currentPot before the call + your call).
 */
export function requiredEquity(callAmount: number, currentPot: number): number {
  const total = currentPot + callAmount;
  if (total <= 0) return 0;
  return callAmount / total;
}

/**
 * Stack-to-pot ratio: how many "pots" deep the effective stack is.
 * spr = effectiveStack / pot
 *
 * High SPR → more implied odds; low SPR → less room to manoeuvre.
 */
export function spr(effectiveStack: number, pot: number): number {
  if (pot <= 0) return Infinity;
  return effectiveStack / pot;
}

/**
 * Minimum Defence Frequency (MDF).
 * The fraction of your range you must continue with to make villain's bluff
 * break even.
 * mdf = pot / (pot + betSize)
 */
export function mdf(betSize: number, pot: number): number {
  const total = pot + betSize;
  if (total <= 0) return 0;
  return pot / total;
}

/**
 * Implied odds — accounts for money expected to be won on later streets
 * when you hit your draw.
 *
 * impliedOdds = callAmount / (currentPot + callAmount + expectedWinOnHit)
 *
 * Returns the fraction of the *total* expected pot (including future
 * winnings) that your call represents.  Lower is better.
 */
export function impliedOdds(
  callAmount: number,
  currentPot: number,
  expectedWinOnHit: number,
): number {
  const total = currentPot + callAmount + expectedWinOnHit;
  if (total <= 0) return 0;
  return callAmount / total;
}

/**
 * Convert a chip count to big-blind units.
 * bbAmount = chips / bigBlind
 */
export function bbAmount(chips: number, bigBlind: number): number {
  if (bigBlind <= 0) return 0;
  return chips / bigBlind;
}
