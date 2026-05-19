import React from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { HandReplay } from '../training/HandReplay';
import { Badge } from '../shared/Badge';
import { Card } from '../shared/Card';
import { formatEV } from '../../utils/format';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
        <div className="text-gray-600 text-2xl">↺</div>
        <div className="text-sm text-gray-400 font-sans">No hands reviewed yet.</div>
        <div className="text-xs text-gray-600 font-sans">Play hands to build your history.</div>
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

          const ts = (hand as any).timestamp ?? 0;

          return (
            <button
              key={hand.id}
              onClick={() => selectHand(hand.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-900 transition-colors text-left"
            >
              {/* Cards */}
              <div className="flex gap-1 shrink-0">
                <Card card={hand.heroCards[0]} size="xs" />
                <Card card={hand.heroCards[1]} size="xs" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-600 font-mono">#{hand.handNumber}</span>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-500 border border-emerald-900 px-1.5 py-0.5 leading-none">
                    {hand.heroPosition}
                  </span>
                  <Badge verdict={worstVerdict as any} size="sm" />
                  {ts > 0 && (
                    <span className="text-[10px] text-gray-700 font-sans ml-auto">{timeAgo(ts)}</span>
                  )}
                </div>
                <div className="flex gap-3">
                  {hand.mistakes > 0 && (
                    <span className="text-xs text-orange-500 font-sans">
                      {hand.mistakes} mistake{hand.mistakes > 1 ? 's' : ''}
                    </span>
                  )}
                  {hand.spews > 0 && (
                    <span className="text-xs text-red-500 font-sans">
                      {hand.spews} spew{hand.spews > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Net */}
              <span className={`text-sm font-mono font-bold shrink-0 ${hand.heroNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatEV(hand.heroNet)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
