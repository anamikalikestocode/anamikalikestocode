import React from 'react';
import { Card as CardType } from '../../types/cards';
import { cardRank, cardSuit, rankToChar, suitToChar } from '../../engine/cards';

const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];

// For face-up cards on white background:
// hearts/diamonds = red, spades/clubs = dark
const SUIT_COLORS = [
  'text-gray-900', // clubs
  'text-red-500',  // diamonds
  'text-red-500',  // hearts
  'text-gray-900', // spades
];

interface CardProps {
  card: CardType | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  highlight?: boolean;
  dimmed?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-10 text-xs',
  sm: 'w-9 h-13 text-sm',
  md: 'w-12 h-17 text-base',
  lg: 'w-16 h-22 text-lg',
};

const RANK_SIZE = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const SUIT_CENTER_SIZE = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

export const Card: React.FC<CardProps> = ({
  card,
  size = 'md',
  faceDown = false,
  highlight = false,
  dimmed = false,
}) => {
  if (faceDown || card === null) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} inline-flex items-center justify-center card-shadow shadow-md
          bg-gray-800 border border-gray-700 select-none
          ${dimmed ? 'opacity-30' : ''}`}
      >
        <span className="text-gray-700 text-xs">◆</span>
      </div>
    );
  }

  const rank = cardRank(card);
  const suit = cardSuit(card);
  const rankChar = rankToChar(rank);
  const suitChar = SUIT_SYMBOLS[suit];
  const colorClass = SUIT_COLORS[suit];

  return (
    <div
      className={`${SIZE_CLASSES[size]} inline-flex flex-col justify-between p-0.5 card-shadow shadow-md select-none
        bg-white border ${highlight ? 'border-emerald-400 ring-1 ring-emerald-500/30' : 'border-gray-200'}
        ${dimmed ? 'opacity-30' : ''}`}
    >
      {/* Top-left rank+suit */}
      <div className={`${RANK_SIZE[size]} font-bold ${colorClass} leading-none flex flex-col`}>
        <span>{rankChar}</span>
        <span className={`${RANK_SIZE[size]} leading-none`}>{suitChar}</span>
      </div>
      {/* Center suit symbol */}
      <div className={`${SUIT_CENTER_SIZE[size]} ${colorClass} leading-none self-center`}>
        {suitChar}
      </div>
      {/* Bottom-right rank+suit (rotated) */}
      <div className={`${RANK_SIZE[size]} font-bold ${colorClass} leading-none flex flex-col self-end rotate-180`}>
        <span>{rankChar}</span>
        <span className={`${RANK_SIZE[size]} leading-none`}>{suitChar}</span>
      </div>
    </div>
  );
};
