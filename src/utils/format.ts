export function formatBB(amount: number, decimals = 1): string {
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(decimals)}bb`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(2)}bb`;
}

export function formatStack(chips: number): string {
  if (chips >= 1000) return `${(chips / 1000).toFixed(1)}k`;
  return chips.toFixed(1);
}

export function formatPot(pot: number): string {
  return `${pot.toFixed(1)}bb`;
}
