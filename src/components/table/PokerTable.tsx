import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getValidActions } from '../../engine/stateMachine';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useEquity } from '../../hooks/useEquity';
import { usePotOdds } from '../../hooks/usePotOdds';
import { Card } from '../shared/Card';
import { ActionPanel } from './ActionPanel';
import { EquityMeter } from '../training/EquityMeter';
import { GTOHintPanel } from '../training/GTOHintPanel';
import { cardToString } from '../../engine/cards';
import { formatStack, positionName, streetName } from '../../utils/format';

export const PokerTable: React.FC = () => {
  const { game, lastHint, pendingHint, isEvaluatorReady } = useGameStore();
  const { showEquityRealtime, showGTOHints } = useSettingsStore();
  const { startGame, heroAction, isEvaluatorReady: loopReady } = useGameLoop();
  const { equity, loading: equityLoading, calculate } = useEquity();
  const potOdds = usePotOdds(game, 0);
  const lastBoardLen = useRef(0);

  // Start game on mount — create state then deal first hand
  useEffect(() => {
    if (!isEvaluatorReady) return;
    if (!game) {
      startGame();
    }
  }, [isEvaluatorReady]);

  // Auto-deal when game is created or phase is waiting
  useEffect(() => {
    if (!game || game.phase !== 'waiting') return;
    const timer = setTimeout(() => {
      useGameStore.getState().dispatch({ type: 'DEAL_HAND' });
    }, 200);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.handNumber]);

  // Recalculate equity whenever board or hole cards change
  useEffect(() => {
    if (!game || !isEvaluatorReady) return;
    const hero = game.players.find(p => p.isHero);
    if (!hero?.holeCards) return;

    const boardChanged = game.communityCards.length !== lastBoardLen.current;
    if (boardChanged || game.street === 'preflop') {
      lastBoardLen.current = game.communityCards.length;
      calculate({
        heroCards: hero.holeCards,
        villainCards: null,
        board: game.communityCards,
        iterations: 8000,
      });
    }
  }, [game?.communityCards.length, game?.handNumber, isEvaluatorReady]);

  if (!isEvaluatorReady) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm font-sans">
        Loading evaluator...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <button
          onClick={startGame}
          className="px-6 py-3 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 text-emerald-100 font-bold uppercase tracking-wide"
        >
          Start Training
        </button>
      </div>
    );
  }

  const hero = game.players.find(p => p.isHero)!;
  const opponents = game.players.filter(p => !p.isHero);
  const isHeroTurn = game.toAct === hero.id && game.phase === 'betting' && !hero.isFolded && !hero.isAllIn;
  const validActions = isHeroTurn ? getValidActions(game, hero.id) : null;

  // Position marker chips — show instead of text for blind positions
  const PositionChip = ({ position }: { position: string }) => {
    if (position === 'BB') return (
      <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-blue-400 shadow flex items-center justify-center shrink-0" title="Big Blind">
        <span className="text-[8px] font-black text-white leading-none">BB</span>
      </div>
    );
    if (position === 'SB') return (
      <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-300 shadow flex items-center justify-center shrink-0" title="Small Blind">
        <span className="text-[8px] font-black text-yellow-900 leading-none">SB</span>
      </div>
    );
    if (position === 'BTN') return (
      <div className="w-6 h-6 rounded-full bg-white border-[3px] border-gray-200 shadow-lg flex items-center justify-center shrink-0" title="Dealer / Button">
        <span className="text-[6px] font-black text-gray-900 leading-none tracking-tight">DEAL</span>
      </div>
    );
    return <span className="text-[10px] text-gray-500 font-sans">{positionName(position)}</span>;
  };

  const Chips = ({ amount, className = '' }: { amount: number; className?: string }) => (
    <span className={`font-mono ${className}`}>
      <span className="text-yellow-600 mr-0.5">●</span>{amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1)}
    </span>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table area */}
      <div className="flex-1 felt-bg flex flex-col justify-between p-2 gap-1.5 min-h-0 overflow-hidden">
        {/* Opponents */}
        <div className="flex gap-2 justify-center flex-wrap">
          {opponents.map(opp => (
            <div
              key={opp.id}
              className={`bg-gray-900/80 border border-gray-800 px-3 py-1.5 text-center space-y-1 ${opp.isFolded ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <PositionChip position={opp.position} />
                <div className="text-xs text-gray-400 font-sans">{opp.name}</div>
              </div>
              <div className="flex gap-1 justify-center">
                <Card card={null} faceDown size="sm" />
                <Card card={null} faceDown size="sm" />
              </div>
              <Chips amount={opp.stack} className="text-xs text-gray-300" />
              {opp.currentBet > 0 && (
                <div className="text-xs text-yellow-400">
                  <Chips amount={opp.currentBet} className="text-yellow-400" /> bet
                </div>
              )}
              {opp.isFolded && <div className="text-[10px] text-gray-600 uppercase tracking-wider">Folded</div>}
            </div>
          ))}
        </div>

        {/* Community cards + pot */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-600">Pot</span>
            <span className="text-base font-bold text-gray-200">
              <Chips amount={game.pot} className="text-gray-200 text-base font-bold" />
            </span>
            {game.sidePots.length > 0 && (
              <span className="text-xs text-yellow-600 font-sans">
                +{game.sidePots.length} side pot{game.sidePots.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {[0,1,2,3,4].map(i => (
              <Card key={i} card={game.communityCards[i] ?? null} size="md" />
            ))}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 border border-gray-800 px-2 py-0.5">
            {streetName(game.street)}
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <PositionChip position={hero.position} />
            <Chips amount={hero.stack} className="text-xs text-gray-400" />
          </div>
          <div className={`flex gap-1.5 ${isHeroTurn ? 'ring-1 ring-emerald-500/40 p-1 rounded' : ''}`}>
            {hero.holeCards ? (
              <>
                <Card card={hero.holeCards[0]} size="lg" highlight={isHeroTurn} />
                <Card card={hero.holeCards[1]} size="lg" highlight={isHeroTurn} />
              </>
            ) : (
              <>
                <Card card={null} faceDown size="lg" />
                <Card card={null} faceDown size="lg" />
              </>
            )}
          </div>
          {hero.currentBet > 0 && (
            <div className="text-xs text-yellow-400">
              <Chips amount={hero.currentBet} className="text-yellow-400" /> in
            </div>
          )}
          {hero.isFolded && <div className="text-xs text-red-600 uppercase tracking-wide">Folded</div>}
        </div>
      </div>

      {/* Training overlays */}
      {showEquityRealtime && hero.holeCards && (
        <EquityMeter
          equity={equity}
          requiredEquity={potOdds?.requiredEquity ?? null}
          loading={equityLoading}
          potOdds={potOdds?.requiredEquity ?? undefined}
        />
      )}

      {showGTOHints && (lastHint || pendingHint) && (
        <GTOHintPanel
          hint={lastHint!}
          heroCards={hero.holeCards}
          pending={pendingHint && !lastHint}
        />
      )}

      {/* Action panel */}
      {isHeroTurn && validActions && (
        <ActionPanel
          validActions={validActions}
          pot={game.pot}
          onAction={(action, eq) => heroAction(action, eq)}
          heroId={hero.id}
          requiredEquity={potOdds?.requiredEquity}
          heroEquity={equity}
        />
      )}

      {/* Waiting indicator */}
      {!isHeroTurn && game.phase === 'betting' && (
        <div className="border-t border-gray-800 p-3 text-center">
          <span className="text-xs text-gray-600 font-sans animate-pulse">
            Waiting for opponents...
          </span>
        </div>
      )}
    </div>
  );
};
