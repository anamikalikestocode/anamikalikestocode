import { GTOAction, DecisionVerdict, PostflopContext } from '../types/gto';

export interface EVEstimate {
  recommendedAction: GTOAction;
  verdict: DecisionVerdict;
  explanation: string;
  evDeltaBB: number;
  evDeltaPer100: number;
}

function pct(v: number): string { return `${(v * 100).toFixed(0)}%`; }

function stackDepthNote(spr: number): string {
  if (spr < 1.5) return `Not much left to play with — commit with anything reasonable.`;
  if (spr < 3)   return `Moderate chips behind — top pair or better is worth getting it in.`;
  if (spr < 6)   return `Mid-depth stack — strong draws are worth raising; weak pairs are close calls.`;
  return `Deep stack — only go big with very strong hands, big bluffs are expensive if they fail.`;
}

function textureNote(texture: PostflopContext['boardTexture'], facingBet: boolean): string {
  switch (texture) {
    case 'wet':
      return facingBet
        ? 'Lots of possible draws on this board — defend a bit wider and raise your strong draws to protect against free cards.'
        : 'Draw-heavy board: bet bigger (half to three-quarters of the pot) to make draws pay for their cards.';
    case 'monotone':
      return facingBet
        ? 'Three cards of the same suit — flush draws everywhere. Be careful re-raising without a strong flush draw yourself.'
        : 'Flush-heavy board: bet around half the pot for protection and value.';
    case 'paired':
      return facingBet
        ? 'Paired board — full houses become possible; straights and flushes less likely. Be a bit more cautious with medium-strength hands.'
        : 'Paired board: check back medium-strength hands; bet mainly strong made hands.';
    default:
      return facingBet
        ? 'Dry board with few draws — opponent\'s range is mostly weak. Call if you have any reasonable equity.'
        : 'Dry board: a small bet (25–33% of the pot) works great here. Big bets on dry boards tip off your hand strength.';
  }
}

export function estimatePostflopDecision(
  playerAction: GTOAction,
  ctx: PostflopContext,
): EVEstimate {
  const { heroEquity, requiredEquity, spr, potSize, betSize, inPosition, boardTexture, street, facingBet } = ctx;

  const ipBonus = inPosition ? 0.04 : 0;
  const adjustedEq = heroEquity + ipBonus;
  const margin = adjustedEq - requiredEquity;
  const betFrac = potSize > 0 ? betSize / potSize : 0;

  let recommendedAction: GTOAction;
  let baseExpl: string;
  let evDeltaBB = 0;

  if (heroEquity > 0.85) {
    recommendedAction = 'raise';
    baseExpl = `You're winning ${pct(heroEquity)} of the time — very strong hand. Raise to build the pot and get paid.`;
    evDeltaBB = potSize * 0.25;
  } else if (spr < 2 && heroEquity > 0.38) {
    recommendedAction = 'raise';
    baseExpl = `Not much left to play with and you're winning ${pct(heroEquity)} of the time — worth getting it in.`;
    evDeltaBB = potSize * 0.15;
  } else if (margin > 0.15) {
    recommendedAction = facingBet ? 'call' : 'raise';
    evDeltaBB = margin * potSize * 0.65;
    baseExpl = facingBet
      ? `You win ${pct(adjustedEq)} of the time and only need ${pct(requiredEquity)} to break even — clear call${inPosition ? ', and you act last which adds extra value' : ''}.`
      : `You win ${pct(adjustedEq)} of the time — strong enough to bet here${inPosition ? ', and acting last gives you extra leverage' : ''}.`;
  } else if (margin > 0.05) {
    recommendedAction = facingBet ? 'call' : 'raise';
    evDeltaBB = margin * potSize * 0.35;
    baseExpl = facingBet
      ? `You win ${pct(adjustedEq)} and need ${pct(requiredEquity)} — thin call, but you're slightly ahead of the odds.`
      : `You win ${pct(adjustedEq)} — slightly above the threshold to bet, but sizing matters.`;
  } else if (Math.abs(margin) <= 0.06) {
    recommendedAction = 'call';
    evDeltaBB = margin * potSize * 0.1;
    baseExpl = `You win ${pct(heroEquity)} and need ${pct(requiredEquity)} — nearly even odds. Calling is fine here.`;
  } else {
    recommendedAction = 'fold';
    evDeltaBB = margin * potSize * 0.45;
    baseExpl = `You only win ${pct(heroEquity)} of the time but need ${pct(requiredEquity)} to break even — the odds aren't there. Fold.`;
  }

  let verdict: DecisionVerdict;
  const evImpact = Math.abs(evDeltaBB);

  if (playerAction === recommendedAction) {
    verdict = 'gto';
    evDeltaBB = 0;
  } else if (recommendedAction === 'fold' && playerAction !== 'fold') {
    verdict = evImpact > potSize * 0.30 ? 'spew' : 'mistake';
    evDeltaBB = -evImpact;
  } else if (recommendedAction !== 'fold' && playerAction === 'fold') {
    verdict = evImpact > potSize * 0.20 ? 'mistake' : 'marginal';
    evDeltaBB = -evImpact;
  } else if (recommendedAction === 'raise' && playerAction === 'call') {
    verdict = 'marginal';
    evDeltaBB = -(evImpact * 0.4);
  } else if (recommendedAction === 'call' && playerAction === 'raise') {
    verdict = margin < -0.10 ? 'mistake' : 'acceptable';
    evDeltaBB = margin < -0.10 ? -(evImpact * 0.5) : 0;
  } else {
    verdict = 'marginal';
    evDeltaBB = -(evImpact * 0.2);
  }

  const parts: string[] = [baseExpl];

  if (facingBet && betFrac > 0.25) {
    const mdf = Math.round((1 - betFrac / (1 + betFrac)) * 100);
    parts.push(`Facing a ${pct(betFrac)} pot-sized bet, you should be calling at least ${mdf}% of the time to prevent easy bluffs.`);
  }

  parts.push(textureNote(boardTexture, facingBet));
  parts.push(stackDepthNote(spr));

  if (street === 'river') {
    parts.push('River: no more cards coming — the hand is what it is. Call or fold purely based on your odds.');
  } else if (street === 'turn') {
    parts.push('Turn: draws are nearly paid for or priced out. If you called the flop correctly, the turn decision follows the same logic.');
  }

  if (!inPosition && facingBet) {
    parts.push('Acting first is a disadvantage here — consider check-raising on turns that improved your hand.');
  }

  return {
    recommendedAction,
    verdict,
    explanation: parts.join(' '),
    evDeltaBB,
    evDeltaPer100: evDeltaBB * 2,
  };
}
