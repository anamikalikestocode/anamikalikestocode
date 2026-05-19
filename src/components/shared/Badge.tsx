import React from 'react';
import { DecisionVerdict } from '../../types/gto';

const VERDICT_CONFIG: Record<DecisionVerdict, { label: string; classes: string }> = {
  gto:        { label: 'Optimal',    classes: 'bg-emerald-950 text-emerald-400 border-emerald-800' },
  acceptable: { label: 'Good',       classes: 'bg-green-950 text-green-400 border-green-800'       },
  marginal:   { label: 'Close call', classes: 'bg-amber-950 text-amber-400 border-amber-800'       },
  mistake:    { label: 'Mistake',    classes: 'bg-orange-950 text-orange-400 border-orange-800'    },
  spew:       { label: 'Blunder',    classes: 'bg-red-950 text-red-400 border-red-800'             },
};

interface BadgeProps {
  verdict: DecisionVerdict;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ verdict, size = 'md' }) => {
  const { label, classes } = VERDICT_CONFIG[verdict];
  return (
    <span
      className={`inline-block font-bold border tracking-widest uppercase
        ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-3 py-1'}
        ${classes}`}
    >
      {label}
    </span>
  );
};
