import React, { useState } from 'react';
import { PokerTable } from '../table/PokerTable';
import { ReviewView } from './ReviewView';
import { StatsView } from './StatsView';
import { SettingsModal } from '../modals/SettingsModal';

type Tab = 'play' | 'review' | 'stats';

export const AppShell: React.FC = () => {
  const [tab, setTab] = useState<Tab>('play');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-950 max-w-lg mx-auto relative">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2 shrink-0">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Poker Trainer</span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-gray-500 hover:text-gray-200 text-xs uppercase tracking-wide px-2 py-1 border border-gray-800 hover:border-gray-600 transition-colors"
        >
          Settings
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'play' && <PokerTable />}
        {tab === 'review' && <ReviewView />}
        {tab === 'stats' && <StatsView />}
      </div>

      {/* Bottom nav */}
      <div className="flex border-t border-gray-800 shrink-0">
        {(['play', 'review', 'stats'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs uppercase tracking-widest transition-colors ${
              tab === t
                ? 'text-emerald-400 border-t-2 border-emerald-500'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
