import { GTOAction, DecisionVerdict, PostflopContext } from '../types/gto';

export interface EVEstimate {
  recommendedAction: GTOAction;
  verdict: DecisionVerdict;
  explanation: string;
  evDeltaBB: number;
  evDeltaPer100: number;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

export function estimatePostflopDecision(
  playerAction: GTOAction,
  ctx: PostflopContext,
): EVEstimate {
  const { heroEquity, requiredEquity, spr, potSize, betSize, inPosition, boardTexture, street, facingBet } = ctx;

  const margin = heroEquity - requiredEquity;
  const ipBonus = inPosition ? 0.04 : 0;
  const adjustedEquity = heroEquity + ipBonus;

  let recommendedAction: GTOAction;
  let baseExplanation: string;
  let evDeltaBB = 0;

  const isNutType = heroEquity > 0.85;
  const isDrawy = heroEquity > 0.3 && heroEquity < 0.55;

  if (isNutType) {
    recommendedAction = 'raise';
    baseExplanation = `Nut-strength hand (${pct(heroEquity)} equity). Raise for value and protection`;
  } else if (adjustedEquity > requiredEquity + 0.15) {
    recommendedAction = facingBet ? 'raise' : 'raise';
    baseExplanation = `${pct(heroEquity)} equity vs ${pct(requiredEquity)} needed — clear value spot`;
    evDeltaBB = margin * potSize * 0.7;
  } else if (adjustedEquity > requiredEquity + 0.05) {
    recommendedAction = facingBet ? 'call' : 'raise';
    baseExplanation = `${pct(heroEquity)} equity exceeds ${pct(requiredEquity)} break-even — marginal value`;
    evDeltaBB = margin * potSize * 0.3;
  } else if (Math.abs(margin) <= 0.08) {
    recommendedAction = 'call';
    baseExplanation = `${pct(heroEquity)} equity near break-even (${pct(requiredEquity)} needed)`;
    evDeltaBB = margin * potSize * 0.1;
  } else if (spr < 2) {
    recommendedAction = 'raise';
    baseExplanation = `SPR ${spr.toFixed(1)}: commit or fold territory. ${pct(heroEquity)} equity`;
    evDeltaBB = heroEquity > 0.4 ? potSize * 0.15 : -potSize * 0.1;
  } else {
    recommendedAction = 'fold';
    baseExplanation = `${pct(heroEquity)} equity below ${pct(requiredEquity)} needed — fold`;
    evDeltaBB = margin * potSize * 0.5;
  }

  // Texture modifier
  const textureNote = boardTexture === 'wet'
    ? '. Wet board increases draw equity — defend wider'
    : boardTexture === 'monotone'
      ? '. Monotone board: flush draws heavily in range'
      : boardTexture === 'paired'
        ? '. Paired board reduces flush/straight draws'
        : '';

  // Compute verdict by comparing player action to recommendation
  let verdict: DecisionVerdict;
  const evImpact = Math.abs(evDeltaBB);

  if (playerAction === recommendedAction) {
    verdict = 'gto';
    evDeltaBB = 0;
  } else if (recommendedAction === 'fold' && playerAction !== 'fold') {
    verdict = evImpact > potSize * 0.3 ? 'spew' : 'mistake';
    evDeltaBB = -evImpact;
  } else if (recommendedAction !== 'fold' && playerAction === 'fold') {
    verdict = evImpact > potSize * 0.2 ? 'mistake' : 'marginal';
    evDeltaBB = -evImpact;
  } else if (recommendedAction === 'raise' && playerAction === 'call') {
    verdict = 'marginal';
    evDeltaBB = -(evImpact * 0.4);
  } else if (recommendedAction === 'call' && playerAction === 'raise') {
    verdict = margin < -0.1 ? 'mistake' : 'acceptable';
    evDeltaBB = margin < -0.1 ? -(evImpact * 0.5) : 0;
  } else {
    verdict = 'marginal';
    evDeltaBB = -(evImpact * 0.2);
  }

  const posNote = inPosition ? ' (IP)' : ' (OOP)';
  const streetNote = street === 'river' ? ' River: no more cards to come — equity is final.' : '';

  return {
    recommendedAction,
    verdict,
    explanation: `${baseExplanation}${textureNote}${posNote}.${streetNote}`,
    evDeltaBB,
    evDeltaPer100: evDeltaBB * 2, // rough approximation
  };
}
