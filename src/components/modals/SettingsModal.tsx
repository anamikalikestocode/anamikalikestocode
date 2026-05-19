import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Difficulty } from '../../types/game';

interface SettingsModalProps {
  onClose: () => void;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string }> = {
  calling_station: { label: 'Calling Station', desc: 'Calls everything, never folds'          },
  nit:             { label: 'Nit',              desc: 'Only plays premium hands'                },
  tag:             { label: 'TAG',              desc: 'Tight-aggressive, solid fundamentals'   },
  lag:             { label: 'LAG',              desc: 'Loose-aggressive, high 3-bet frequency' },
  gto:             { label: 'GTO Solver',       desc: 'Solver-based, adapts to your tendencies'},
  exploitative_reg:{ label: 'Exploitative Reg', desc: 'Targets your specific leaks'            },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    difficulty, setDifficulty,
    numOpponents, setNumOpponents,
    stackSize, setStackSize,
    showEquityRealtime, toggleEquity,
    showGTOHints, toggleGTOHints,
  } = useSettingsStore();

  return (
    <div className="absolute inset-0 bg-gray-950/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Settings</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none transition-colors"
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Opponent difficulty */}
        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Difficulty</div>
            <div className="text-xs text-gray-600 font-sans mt-0.5">Controls opponent AI style and aggression</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => {
              const { label, desc } = DIFFICULTY_CONFIG[d];
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2.5 px-3 text-left border transition-colors space-y-0.5 ${
                    active
                      ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="text-xs font-bold">{label}</div>
                  <div className={`text-[10px] font-sans leading-tight ${active ? 'text-emerald-400/70' : 'text-gray-600'}`}>
                    {desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Num opponents */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Opponents</div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 5, 8].map(n => (
              <button
                key={n}
                onClick={() => setNumOpponents(n)}
                className={`flex-1 py-2 text-xs border transition-colors ${
                  numOpponents === n
                    ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Stack depth */}
        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Starting Stack</div>
            <div className="text-xs text-gray-600 font-sans mt-0.5">Affects preflop push/fold ranges and stack-off thresholds</div>
          </div>
          <div className="flex gap-1.5">
            {([20, 40, 100] as const).map(s => (
              <button
                key={s}
                onClick={() => setStackSize(s)}
                className={`flex-1 py-2 text-xs border transition-colors ${
                  stackSize === s
                    ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {s}bb
              </button>
            ))}
          </div>
        </div>

        {/* Training overlays */}
        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">Training Overlays</div>
            <div className="text-xs text-gray-600 font-sans mt-0.5">Toggle real-time training aids</div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Real-time Equity Meter', value: showEquityRealtime, toggle: toggleEquity },
              { label: 'GTO Hints After Action',  value: showGTOHints,       toggle: toggleGTOHints },
            ].map(({ label, value, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                className="w-full flex items-center justify-between py-2.5 px-3 bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors"
              >
                <span className="text-xs text-gray-300 font-sans">{label}</span>
                <span className={`text-xs font-bold font-mono ${value ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {value ? 'ON' : 'OFF'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 p-3">
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-sm font-bold uppercase tracking-wide transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
