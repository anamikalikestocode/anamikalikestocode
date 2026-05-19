export function formatBB(amount: number, decimals = 1): string {
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(decimals)} big blinds`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(2)} big blinds`;
}

export function formatStack(chips: number): string {
  if (chips >= 1000) return `${(chips / 1000).toFixed(1)}k`;
  return chips.toFixed(1);
}

export function formatPot(pot: number): string {
  return `${pot.toFixed(1)} big blinds`;
}

export function positionName(pos: string): string {
  const names: Record<string, string> = {
    BTN: 'Button',
    SB: 'Small Blind',
    BB: 'Big Blind',
    UTG: 'Under the Gun',
    UTG1: 'UTG +1',
    UTG2: 'UTG +2',
    LJ: 'Lojack',
    HJ: 'Hijack',
    CO: 'Cutoff',
  };
  return names[pos] ?? pos;
}

export function streetName(street: string): string {
  const names: Record<string, string> = {
    preflop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
  };
  return names[street] ?? street;
}

export function actionLabel(type: string): string {
  const names: Record<string, string> = {
    FOLD: 'Fold', fold: 'Fold',
    CALL: 'Call', call: 'Call',
    RAISE: 'Raise', raise: 'Raise',
    CHECK: 'Check', check: 'Check',
    ALL_IN: 'All-In', all_in: 'All-In',
    BET: 'Bet', bet: 'Bet',
  };
  return names[type] ?? (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase());
}

const RANK_NAMES: Record<string, string> = {
  A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack',
  T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven',
  '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two',
};

export function handKeyToReadable(key: string): string {
  if (key.length === 2 && key[0] === key[1]) return `Pocket ${RANK_NAMES[key[0]] ?? key[0]}s`;
  if (key.endsWith('s')) return `${RANK_NAMES[key[0]] ?? key[0]}-${RANK_NAMES[key[1]] ?? key[1]} suited`;
  if (key.endsWith('o')) return `${RANK_NAMES[key[0]] ?? key[0]}-${RANK_NAMES[key[1]] ?? key[1]} offsuit`;
  return key;
}
