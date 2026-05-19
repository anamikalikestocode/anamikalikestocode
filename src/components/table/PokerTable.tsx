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
import { formatStack } from '../../utils/format';

export const PokerTable: React.FC = () => {
  const { game, lastHint, pendingHint, isEvaluatorReady } = useGameStore();
  const { showEquityRealtime, showGTOHints } = useSettingsStore();
  const { startGame, heroAction, isEvaluatorReady: loopReady } = useGameLoop();
  const { equity, loading: equityLoading, calculate } = useEquity();
  const potOdds = usePotOdds(game, 0);
  const lastBoardLen = useRef(0);

  // Start game on mount
  useEffect(() => {
    if (isEvaluatorReady && !game) startGame();
    else if (isEvaluatorReady && game && game.phase === 'waiting') {
      useGameStore.getState().dispatch({ type: 'DEAL_HAND' });
    }
  }, [isEvaluatorReady]);

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
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
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

  return (
    <div className="flex flex-col h-full">
      {/* Table area */}
      <div className="flex-1 felt-bg flex flex-col justify-between p-3 gap-2 min-h-0">
        {/* Opponents */}
        <div className="flex gap-2 justify-center flex-wrap">
          {opponents.map(opp => (
            <div key={opp.id} className={`text-center space-y-1 ${opp.isFolded ? 'opacity-40' : ''}`}>
              <div className="text-xs text-gray-400">{opp.name}</div>
              <div className="flex gap-1 justify-center">
                <Card card={null} faceDown size="sm" />
                <Card card={null} faceDown size="sm" />
              </div>
              <div className="text-xs text-gray-300 font-mono">{formatStack(opp.stack)}bb</div>
              {opp.currentBet > 0 && (
                <div className="text-xs text-yellow-400">{opp.currentBet.toFixed(1)}</div>
              )}
              {opp.isFolded && <div className="text-xs text-gray-600">FOLDED</div>}
              {opp.isDealer && <div className="text-xs text-blue-400">BTN</div>}
            </div>
          ))}
        </div>

        {/* Community cards + pot */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-gray-500 font-mono">
            POT: <span className="text-gray-200">{game.pot.toFixed(1)}bb</span>
            {game.sidePots.length > 0 && (
              <span className="ml-2 text-yellow-600">+{game.sidePots.length} side pot{game.sidePots.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <Card
                key={i}
                card={game.communityCards[i] ?? null}
                size="md"
              />
            ))}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-widest">
            {game.street}
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-xs text-gray-400">
            {hero.position} · {formatStack(hero.stack)}bb
            {hero.isDealer && <span className="ml-1 text-blue-400">BTN</span>}
          </div>
          <div className="flex gap-1.5">
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
            <div className="text-xs text-yellow-400">{hero.currentBet.toFixed(1)} in</div>
          )}
          {hero.isFolded && <div className="text-xs text-red-600">FOLDED</div>}
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
          onAction={heroAction}
          heroId={hero.id}
          requiredEquity={potOdds?.requiredEquity}
          heroEquity={equity}
        />
      )}

      {/* Waiting indicator */}
      {!isHeroTurn && game.phase === 'betting' && (
        <div className="border-t border-gray-800 p-3 text-center text-xs text-gray-600">
          {game.players[game.toAct]?.name ?? '?'} is thinking...
        </div>
      )}
    </div>
  );
};
