import React, { useState } from 'react';
import { PokerTable } from '../table/PokerTable';
import { ReviewView } from './ReviewView';
import { StatsView } from './StatsView';
import { SettingsModal } from '../modals/SettingsModal';

type Tab = 'play' | 'review' | 'stats';

const TAB_CONFIG: { id: Tab; icon: string; label: string }[] = [
  { id: 'play',   icon: '♠', label: 'Play'    },
  { id: 'review', icon: '↺', label: 'History' },
  { id: 'stats',  icon: '▦', label: 'Stats'   },
];

export const AppShell: React.FC = () => {
  const [tab, setTab] = useState<Tab>('play');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-950 max-w-lg mx-auto relative">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-base leading-none">◆</span>
          <span className="text-sm font-bold text-gray-100">GTO Trainer</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none transition-colors p-1"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'play'   && <PokerTable />}
        {tab === 'review' && <ReviewView />}
        {tab === 'stats'  && <StatsView />}
      </div>

      {/* Bottom nav */}
      <div className="flex border-t border-gray-800 bg-gray-950 shrink-0">
        {TAB_CONFIG.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
              tab === id
                ? 'text-emerald-400'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[10px] uppercase tracking-widest font-medium">{label}</span>
          </button>
        ))}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
