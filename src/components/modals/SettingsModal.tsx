import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Difficulty } from '../../types/game';

interface SettingsModalProps {
  onClose: () => void;
}

const OPPONENT_STYLES: { id: Difficulty; name: string; sub: string; color: string }[] = [
  {
    id: 'calling_station',
    name: 'The Fish',
    sub: 'Calls almost everything, rarely folds — great to practice value betting',
    color: 'border-blue-800 bg-blue-950',
  },
  {
    id: 'nit',
    name: 'The Rock',
    sub: "Only plays the very best hands. Patient, but dangerous when they finally bet",
    color: 'border-gray-700 bg-gray-900',
  },
  {
    id: 'tag',
    name: 'Solid Player',
    sub: 'Plays tight, bets when strong, folds weak hands. Standard casino regular',
    color: 'border-yellow-800 bg-yellow-950',
  },
  {
    id: 'lag',
    name: 'Aggressive',
    sub: 'Raises a lot, applies constant pressure — will force tough decisions',
    color: 'border-orange-800 bg-orange-950',
  },
  {
    id: 'gto',
    name: 'Pro',
    sub: 'Near-perfectly balanced — hard to read, hard to exploit. Serious challenge',
    color: 'border-red-800 bg-red-950',
  },
  {
    id: 'exploitative_reg',
    name: 'The Shark',
    sub: 'Finds YOUR specific leaks and punishes them. Gets harder the more you play',
    color: 'border-red-700 bg-red-950',
  },
];

const STACK_OPTIONS: { value: 20 | 40 | 100; name: string; desc: string }[] = [
  { value: 20,  name: 'Short',  desc: 'Tournament-style — push or fold decisions' },
  { value: 40,  name: 'Medium', desc: 'Moderate depth — tests post-flop patience' },
  { value: 100, name: 'Deep',   desc: 'Full stack — all streets, full decisions'  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    difficulty, setDifficulty,
    numOpponents, setNumOpponents,
    stackSize, setStackSize,
    showEquityRealtime, toggleEquity,
    showGTOHints, toggleGTOHints,
  } = useSettingsStore();

  return (
    <div className="absolute inset-0 bg-gray-950/98 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 shrink-0">
        <div>
          <div className="text-sm font-bold text-gray-100">Training Setup</div>
          <div className="text-[11px] text-gray-500 font-sans mt-0.5">Switch modes often — each one trains different skills</div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none transition-colors p-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-7">

        {/* Opponent style */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-200 uppercase tracking-widest">Who are you playing against?</div>
            <div className="text-xs text-gray-500 font-sans mt-1">
              Switch this up regularly — each opponent exposes different weaknesses in your game.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {OPPONENT_STYLES.map(({ id, name, sub, color }) => {
              const active = difficulty === id;
              return (
                <button
                  key={id}
                  onClick={() => setDifficulty(id)}
                  className={`w-full text-left px-4 py-3 border-2 transition-all ${
                    active
                      ? `${color} border-opacity-100`
                      : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-300'}`}>
                      {name}
                    </span>
                    {active && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                        Active
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-sans mt-1 leading-snug ${active ? 'text-gray-300' : 'text-gray-600'}`}>
                    {sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opponents count */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-200 uppercase tracking-widest">Table size</div>
            <div className="text-xs text-gray-500 font-sans mt-1">
              Heads-up (1 opponent) is the most intense. More players = more patience required.
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 5, 8].map(n => (
              <button
                key={n}
                onClick={() => setNumOpponents(n)}
                className={`flex-1 py-3 text-sm font-bold border-2 transition-all ${
                  numOpponents === n
                    ? 'bg-emerald-900 border-emerald-500 text-emerald-200'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {n}
                <div className={`text-[9px] font-normal mt-0.5 ${numOpponents === n ? 'text-emerald-400' : 'text-gray-700'}`}>
                  {n === 1 ? 'heads up' : n === 2 ? '3-way' : n === 3 ? '4-way' : n === 5 ? '6-handed' : 'full ring'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stack size */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-200 uppercase tracking-widest">Starting chips</div>
            <div className="text-xs text-gray-500 font-sans mt-1">
              Fewer chips = fewer decisions per hand. Start short to learn faster.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {STACK_OPTIONS.map(({ value, name, desc }) => (
              <button
                key={value}
                onClick={() => setStackSize(value)}
                className={`py-3 px-2 text-left border-2 transition-all ${
                  stackSize === value
                    ? 'bg-emerald-900 border-emerald-500 text-emerald-200'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-bold">{name}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${stackSize === value ? 'text-emerald-500' : 'text-gray-700'}`}>
                  {value} big blinds
                </div>
                <div className={`text-[10px] font-sans mt-1 leading-tight ${stackSize === value ? 'text-gray-300' : 'text-gray-700'}`}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Training aids */}
        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold text-gray-200 uppercase tracking-widest">Training aids</div>
            <div className="text-xs text-gray-500 font-sans mt-1">
              Turn these off once you feel confident to test yourself without help.
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={toggleEquity}
              className={`w-full flex items-start gap-4 py-3.5 px-4 border-2 transition-all text-left ${
                showEquityRealtime
                  ? 'bg-emerald-950 border-emerald-700'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`text-sm font-bold mt-0.5 w-8 shrink-0 text-center ${showEquityRealtime ? 'text-emerald-400' : 'text-gray-600'}`}>
                {showEquityRealtime ? 'ON' : 'OFF'}
              </div>
              <div>
                <div className={`text-sm font-bold ${showEquityRealtime ? 'text-white' : 'text-gray-400'}`}>
                  Win odds
                </div>
                <div className={`text-xs font-sans mt-0.5 leading-snug ${showEquityRealtime ? 'text-gray-300' : 'text-gray-600'}`}>
                  Shows how likely you are to win the hand right now. Recalculates each street.
                </div>
              </div>
            </button>
            <button
              onClick={toggleGTOHints}
              className={`w-full flex items-start gap-4 py-3.5 px-4 border-2 transition-all text-left ${
                showGTOHints
                  ? 'bg-emerald-950 border-emerald-700'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`text-sm font-bold mt-0.5 w-8 shrink-0 text-center ${showGTOHints ? 'text-emerald-400' : 'text-gray-600'}`}>
                {showGTOHints ? 'ON' : 'OFF'}
              </div>
              <div>
                <div className={`text-sm font-bold ${showGTOHints ? 'text-white' : 'text-gray-400'}`}>
                  Coach mode
                </div>
                <div className={`text-xs font-sans mt-0.5 leading-snug ${showGTOHints ? 'text-gray-300' : 'text-gray-600'}`}>
                  After each decision, shows what the best play was and explains why. Turn off to test yourself.
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>

      <div className="border-t border-gray-800 p-4 shrink-0">
        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-sm font-bold tracking-wide transition-colors"
        >
          Start playing
        </button>
      </div>
    </div>
  );
};
