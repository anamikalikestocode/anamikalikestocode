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
import { positionName, streetName } from '../../utils/format';

export const PokerTable: React.FC = () => {
  const { game, lastHint, pendingHint, isEvaluatorReady } = useGameStore();
  const { showEquityRealtime, showGTOHints } = useSettingsStore();
  const { startGame, heroAction, isEvaluatorReady: loopReady } = useGameLoop();
  const { equity, loading: equityLoading, calculate } = useEquity();
  const potOdds = usePotOdds(game, 0);
  const lastBoardLen = useRef(0);

  useEffect(() => {
    if (!isEvaluatorReady) return;
    if (!game) startGame();
  }, [isEvaluatorReady]);

  useEffect(() => {
    if (!game || game.phase !== 'waiting') return;
    const timer = setTimeout(() => {
      useGameStore.getState().dispatch({ type: 'DEAL_HAND' });
    }, 200);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.handNumber]);

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
        Loading…
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

  const PositionBadge = ({ position }: { position: string }) => {
    if (position === 'BB') return (
      <div className="w-5 h-5 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center shrink-0" title="Big Blind">
        <span className="text-[7px] font-black text-white leading-none">BB</span>
      </div>
    );
    if (position === 'SB') return (
      <div className="w-5 h-5 rounded-full bg-yellow-500 border border-yellow-300 flex items-center justify-center shrink-0" title="Small Blind">
        <span className="text-[7px] font-black text-yellow-900 leading-none">SB</span>
      </div>
    );
    if (position === 'BTN') return (
      <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow flex items-center justify-center shrink-0" title="Dealer">
        <span className="text-[5px] font-black text-gray-900 leading-none">D</span>
      </div>
    );
    return <span className="text-[9px] text-gray-600 font-sans">{positionName(position)}</span>;
  };

  const Stack = ({ amount, className = '' }: { amount: number; className?: string }) => (
    <span className={`font-mono ${className}`}>
      <span className="text-yellow-600 mr-0.5">●</span>
      {amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(1)}
    </span>
  );

  const activePlayers = opponents.filter(o => !o.isFolded);
  const foldedPlayers = opponents.filter(o => o.isFolded);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table felt */}
      <div className="flex-1 felt-bg flex flex-col min-h-0 overflow-hidden" style={{ padding: '10px 8px' }}>

        {/* Opponents row */}
        <div className="flex gap-1.5 justify-center flex-wrap mb-1">
          {opponents.map(opp => (
            <div
              key={opp.id}
              className={`relative bg-gray-900/85 border px-2.5 py-1.5 text-center transition-opacity ${
                opp.isFolded
                  ? 'border-gray-800 opacity-30'
                  : game.toAct === opp.id && game.phase === 'betting'
                  ? 'border-emerald-700 shadow shadow-emerald-900/50'
                  : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <PositionBadge position={opp.position} />
                <span className="text-[10px] text-gray-400 font-medium">{opp.name}</span>
              </div>
              <div className="flex gap-0.5 justify-center">
                <Card card={null} faceDown size="sm" />
                <Card card={null} faceDown size="sm" />
              </div>
              <Stack amount={opp.stack} className="text-[10px] text-gray-500 block mt-1" />
              {opp.currentBet > 0 && (
                <div className="text-[10px] text-yellow-400 font-mono">
                  +<Stack amount={opp.currentBet} className="text-yellow-400 text-[10px]" />
                </div>
              )}
              {game.toAct === opp.id && game.phase === 'betting' && !opp.isFolded && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Community cards + pot — center of table */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          {/* Pot */}
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">Pot</span>
            <Stack amount={game.pot} className="text-gray-100 font-bold text-sm" />
            {game.sidePots.length > 0 && (
              <span className="text-[10px] text-yellow-600">
                +{game.sidePots.length} side
              </span>
            )}
          </div>

          {/* Board */}
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <Card key={i} card={game.communityCards[i] ?? null} size="md" />
            ))}
          </div>

          {/* Street label */}
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 border border-gray-800 px-2 py-0.5 bg-black/20">
            {streetName(game.street)}
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-1.5">
          {/* Hero position + stack */}
          <div className="flex items-center gap-2">
            <PositionBadge position={hero.position} />
            <Stack amount={hero.stack} className="text-xs text-gray-400" />
            {hero.currentBet > 0 && (
              <span className="text-xs text-yellow-400">
                +<Stack amount={hero.currentBet} className="text-yellow-400 text-xs" />
              </span>
            )}
          </div>

          {/* Hero cards — larger, prominent */}
          <div className={`flex gap-2 ${isHeroTurn ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : ''}`}>
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

          {hero.isFolded && (
            <div className="text-xs text-red-600 uppercase tracking-wide font-bold">Folded</div>
          )}
          {hero.isAllIn && (
            <div className="text-xs text-yellow-500 uppercase tracking-wide font-bold">All-in</div>
          )}
        </div>
      </div>

      {/* Training overlays */}
      {showEquityRealtime && hero.holeCards && game.street !== 'preflop' && (
        <EquityMeter
          equity={equity}
          requiredEquity={game.street === 'preflop' ? null : (potOdds?.requiredEquity ?? null)}
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

      {/* Waiting */}
      {!isHeroTurn && game.phase === 'betting' && (
        <div className="border-t border-gray-800 p-3 text-center">
          <span className="text-xs text-gray-600 font-sans animate-pulse">
            Waiting for opponents…
          </span>
        </div>
      )}
    </div>
  );
};
