import { GTOAction, DecisionVerdict, PostflopContext } from '../types/gto';

export interface EVEstimate {
  recommendedAction: GTOAction;
  verdict: DecisionVerdict;
  explanation: string;
  evDeltaBB: number;
  evDeltaPer100: number;
}

function pct(v: number): string { return `${(v * 100).toFixed(0)}%`; }
function bb(v: number): string  { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}bb`; }

function sprNote(spr: number): string {
  if (spr < 1.5) return `SPR ${spr.toFixed(1)}: trivial commit — any reasonable equity stacks.`;
  if (spr < 3)   return `SPR ${spr.toFixed(1)}: commit with top-pair+. Draws have the right price.`;
  if (spr < 6)   return `SPR ${spr.toFixed(1)}: mid-depth. Strong draws worth raising; marginal pairs call.`;
  return `SPR ${spr.toFixed(1)}: deep. Premium hands only for stacking — bloated bluffs are costly.`;
}

function mdfNote(betFrac: number): string {
  const mdf = 1 - betFrac / (1 + betFrac);
  return `MDF ${pct(mdf)}: you must defend at least ${pct(mdf)} of your range to prevent auto-profitable bluffs.`;
}

function textureNote(texture: PostflopContext['boardTexture'], facingBet: boolean): string {
  switch (texture) {
    case 'wet':
      return facingBet
        ? 'Wet board: draws dense in range — defend wider and raise stronger draws for protection.'
        : 'Wet board: polarize sizing (50–75% pot) to charge draws and protect your value range.';
    case 'monotone':
      return facingBet
        ? 'Monotone board: flush draws everywhere — MDF widens slightly; be careful raising without nut-flush equity.'
        : 'Monotone board: 45–70% pot sizing. Ranges cap at non-flush hands — bet for protection and thin value.';
    case 'paired':
      return facingBet
        ? 'Paired board: straights/flushes reduced; full houses credible — fold threshold rises slightly.'
        : 'Paired board: check back marginal hands; bet strong made hands and value-heavy bluffs only.';
    default:
      return facingBet
        ? 'Dry board: opponent\'s range is mostly air — MDF applies strictly, call with any equity.'
        : 'Dry board: 25–33% pot c-bet captures the node EV. Over-sizing is a range tell.';
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

  // ── Determine recommended action & base EV ─────────────────────────────────
  let recommendedAction: GTOAction;
  let baseExpl: string;
  let evDeltaBB = 0;

  if (heroEquity > 0.85) {
    recommendedAction = 'raise';
    baseExpl = `${pct(heroEquity)} equity — nut-strength. Raise for value and to deny runner-runner equity.`;
    evDeltaBB = potSize * 0.25;
  } else if (spr < 2 && heroEquity > 0.38) {
    recommendedAction = 'raise';
    baseExpl = `${sprNote(spr)} ${pct(heroEquity)} equity crosses the commit threshold.`;
    evDeltaBB = potSize * 0.15;
  } else if (margin > 0.15) {
    recommendedAction = facingBet ? 'call' : 'raise';
    evDeltaBB = margin * potSize * 0.65;
    const sign = facingBet ? 'call' : 'bet';
    baseExpl = `${pct(adjustedEq)} eq vs ${pct(requiredEquity)} required (+${pct(margin)} margin). Clear ${sign}${inPosition ? ' — IP adds ~4% EV' : ''}.`;
  } else if (margin > 0.05) {
    recommendedAction = facingBet ? 'call' : 'raise';
    evDeltaBB = margin * potSize * 0.35;
    baseExpl = `${pct(adjustedEq)} eq vs ${pct(requiredEquity)} (+${pct(margin)}). ${facingBet ? 'Thin call' : 'Marginal bet'} — exploitable if sized wrong.`;
  } else if (Math.abs(margin) <= 0.06) {
    recommendedAction = 'call';
    evDeltaBB = margin * potSize * 0.1;
    baseExpl = `${pct(heroEquity)} eq within 6% of break-even (${pct(requiredEquity)}). Mixed-strategy zone — call is fine.`;
  } else {
    recommendedAction = 'fold';
    evDeltaBB = margin * potSize * 0.45;
    baseExpl = `${pct(heroEquity)} eq vs ${pct(requiredEquity)} needed (${pct(Math.abs(margin))} under). Fold: ${bb(evDeltaBB)}.`;
  }

  // ── Compare player action to recommendation ────────────────────────────────
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

  // ── Build full explanation ─────────────────────────────────────────────────
  const parts: string[] = [baseExpl];

  if (facingBet && betFrac > 0.25) {
    parts.push(mdfNote(betFrac));
  }
  parts.push(textureNote(boardTexture, facingBet));
  parts.push(sprNote(spr));

  if (street === 'river') {
    parts.push('River: equity is final — no draws improve. EV is pure stack math from here.');
  } else if (street === 'turn') {
    parts.push('Turn: draws are priced in or out. If you defended flop correctly, turn defense follows proportionally.');
  }

  if (!inPosition && facingBet) {
    parts.push('OOP: consider donk-leads or check-raises on turns that improve your range but not theirs.');
  }

  return {
    recommendedAction,
    verdict,
    explanation: parts.join(' '),
    evDeltaBB,
    evDeltaPer100: evDeltaBB * 2,
  };
}
