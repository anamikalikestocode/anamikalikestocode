import React from 'react';
import { Card as CardType } from '../../types/cards';
import { cardRank, cardSuit, rankToChar, suitToChar } from '../../engine/cards';

const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
const SUIT_COLORS = [
  'text-gray-100',
  'text-red-400',
  'text-red-400',
  'text-gray-100',
];

interface CardProps {
  card: CardType | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  highlight?: boolean;
  dimmed?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-10 text-xs rounded',
  sm: 'w-9 h-13 text-sm rounded',
  md: 'w-12 h-17 text-base rounded-md',
  lg: 'w-16 h-22 text-lg rounded-md',
};

const SIZE_INNER = {
  xs: 'text-[10px] leading-tight',
  sm: 'text-xs leading-tight',
  md: 'text-sm leading-tight',
  lg: 'text-base leading-tight',
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
        className={`${SIZE_CLASSES[size]} inline-flex items-center justify-center card-shadow
          bg-blue-900 border border-blue-700 select-none
          ${dimmed ? 'opacity-40' : ''}`}
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)',
        }}
      />
    );
  }

  const rank = cardRank(card);
  const suit = cardSuit(card);
  const rankChar = rankToChar(rank);
  const suitChar = SUIT_SYMBOLS[suit];
  const colorClass = SUIT_COLORS[suit];

  return (
    <div
      className={`${SIZE_CLASSES[size]} inline-flex flex-col justify-between p-0.5 card-shadow select-none
        bg-gray-50 border ${highlight ? 'border-yellow-400 glow-yellow' : 'border-gray-200'}
        ${dimmed ? 'opacity-40' : ''}`}
    >
      <span className={`${SIZE_INNER[size]} font-bold ${colorClass} leading-none`}>
        {rankChar}{suitChar}
      </span>
      <span className={`${SIZE_INNER[size]} font-bold ${colorClass} leading-none self-end rotate-180`}>
        {rankChar}{suitChar}
      </span>
    </div>
  );
};
