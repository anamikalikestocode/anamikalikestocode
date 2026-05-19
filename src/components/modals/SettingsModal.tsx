import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Difficulty } from '../../types/game';

interface SettingsModalProps {
  onClose: () => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  calling_station: 'Calling Station',
  nit: 'Nit',
  tag: 'TAG',
  lag: 'LAG',
  gto: 'GTO Solver',
  exploitative_reg: 'Exploitative Reg',
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
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Settings</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Opponent difficulty */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Opponent Archetype</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2 px-2 text-xs text-left border transition-colors ${
                  difficulty === d
                    ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Num opponents */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Opponents</div>
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
          <div className="text-xs text-gray-500 uppercase tracking-wide">Starting Stack</div>
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
          <div className="text-xs text-gray-500 uppercase tracking-wide">Training Overlays</div>
          <div className="space-y-2">
            {[
              { label: 'Real-time Equity Meter', value: showEquityRealtime, toggle: toggleEquity },
              { label: 'GTO Hints After Action', value: showGTOHints, toggle: toggleGTOHints },
            ].map(({ label, value, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                className="w-full flex items-center justify-between py-2 px-3 bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors"
              >
                <span className="text-xs text-gray-300">{label}</span>
                <span className={`text-xs font-bold ${value ? 'text-emerald-400' : 'text-gray-600'}`}>
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
          className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-sm font-bold uppercase tracking-wide"
        >
          Done
        </button>
      </div>
    </div>
  );
};
