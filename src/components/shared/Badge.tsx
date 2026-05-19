import React from 'react';
import { DecisionVerdict } from '../../types/gto';

const VERDICT_CONFIG: Record<DecisionVerdict, { label: string; classes: string }> = {
  gto:        { label: 'GTO',        classes: 'bg-emerald-900 text-emerald-300 border-emerald-700' },
  acceptable: { label: 'ACCEPTABLE', classes: 'bg-green-900 text-green-300 border-green-700' },
  marginal:   { label: 'MARGINAL',   classes: 'bg-yellow-900 text-yellow-300 border-yellow-700' },
  mistake:    { label: 'MISTAKE',    classes: 'bg-orange-900 text-orange-300 border-orange-700' },
  spew:       { label: 'SPEW',       classes: 'bg-red-900 text-red-300 border-red-700' },
};

interface BadgeProps {
  verdict: DecisionVerdict;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ verdict, size = 'md' }) => {
  const { label, classes } = VERDICT_CONFIG[verdict];
  return (
    <span
      className={`inline-block font-mono font-bold border tracking-widest
        ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}
        ${classes}`}
    >
      {label}
    </span>
  );
};
