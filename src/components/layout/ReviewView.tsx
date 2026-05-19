import React from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { HandReplay } from '../training/HandReplay';
import { Badge } from '../shared/Badge';
import { Card } from '../shared/Card';
import { formatEV } from '../../utils/format';

export const ReviewView: React.FC = () => {
  const { handHistory, selectedHandId, selectHand, getFilteredHistory } = useTrainingStore();
  const filtered = getFilteredHistory();
  const selected = handHistory.find(h => h.id === selectedHandId) ?? null;

  if (selected) {
    return (
      <div className="h-full">
        <HandReplay hand={selected} onClose={() => selectHand(null)} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-600">
        No hands played yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-gray-800">
        {filtered.map(hand => {
          const worstVerdict = hand.spews > 0 ? 'spew' :
            hand.mistakes > 0 ? 'mistake' :
            hand.streets.some(s => s.hint?.verdict === 'marginal') ? 'marginal' :
            'gto';

          return (
            <button
              key={hand.id}
              onClick={() => selectHand(hand.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-900 transition-colors text-left"
            >
              <div className="flex gap-1 shrink-0">
                <Card card={hand.heroCards[0]} size="xs" />
                <Card card={hand.heroCards[1]} size="xs" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{hand.handNumber}</span>
                  <span className="text-xs text-gray-600">{hand.heroPosition}</span>
                  <Badge verdict={worstVerdict as any} size="sm" />
                </div>
                <div className="flex gap-3 mt-0.5">
                  {hand.mistakes > 0 && (
                    <span className="text-xs text-red-500">{hand.mistakes} mistake{hand.mistakes > 1 ? 's' : ''}</span>
                  )}
                  {hand.spews > 0 && (
                    <span className="text-xs text-red-600">{hand.spews} spew{hand.spews > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-mono font-bold ${hand.heroNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatEV(hand.heroNet)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
