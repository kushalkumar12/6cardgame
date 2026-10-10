import React, { useState, useMemo } from 'react';
import { GameEngine } from './engine/gameEngine';
import type { GameState, GameConfig } from './types/game';
import { getRequiredDeckCount } from './engine/deck';
import { Header } from './components/Header';
import { CardView } from './components/CardView';
import { PlayerMat } from './components/PlayerMat';
import { PassDeviceModal } from './components/PassDeviceModal';
import { InitialMemorizeModal } from './components/InitialMemorizeModal';
import { RevealModal } from './components/RevealModal';
import { JackExchangeModal } from './components/JackExchangeModal';
import { EliminationModal } from './components/EliminationModal';
import { PenaltyModal } from './components/PenaltyModal';
import { DeclareVictoryModal } from './components/DeclareVictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { ActionLog } from './components/ActionLog';

const LOCAL_STORAGE_KEY = 'six_cards_game_state_v1';

export const App: React.FC = () => {
  const engine = useMemo(() => {
    const eng = new GameEngine();
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed && parsed.players && parsed.players.length >= 2) {
          eng.loadState(parsed);
        }
      }
    } catch {
      // Ignore corrupt storage
    }
    return eng;
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => engine.getState());

  // Setup form states
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]);

  // UI modal toggles
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showDeclareVictoryConfirm, setShowDeclareVictoryConfirm] = useState<boolean>(false);
  const [isReplacingMode, setIsReplacingMode] = useState<boolean>(false);

  // Sync state helper that also updates localStorage
  const syncEngineState = () => {
    const fresh = engine.getState();
    setGameState(fresh);
    try {
      if (fresh.currentPhase !== 'SETUP') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fresh));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  // Handle player count change in setup
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const updatedNames = [...playerNames];
    while (updatedNames.length < count) {
      updatedNames.push(`Player ${updatedNames.length + 1}`);
    }
    setPlayerNames(updatedNames.slice(0, count));
  };

  // Handle player name input
  const handleNameChange = (index: number, newName: string) => {
    const updated = [...playerNames];
    updated[index] = newName;
    setPlayerNames(updated);
  };

  // Start new game
  const handleStartGame = () => {
    const config: GameConfig = {
      playerNames: playerNames.map((n, i) => n.trim() || `Player ${i + 1}`),
    };
    engine.initializeGame(config);
    setIsReplacingMode(false);
    syncEngineState();
  };

  // Restart / Reset game
  const handleRestartConfirm = () => {
    if (window.confirm('Are you sure you want to start a new game? Current progress will be lost.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setGameState({
        ...engine.getState(),
        currentPhase: 'SETUP',
      });
    }
  };

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const topDiscard = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  return (
    <div className="app-container">
      <Header
        roundNumber={gameState.roundNumber}
        firstRoundCompleted={gameState.firstRoundCompleted}
        onOpenRules={() => setShowRules(true)}
        onRestartGame={handleRestartConfirm}
        isGameActive={gameState.currentPhase !== 'SETUP'}
      />

      {/* SETUP SCREEN */}
      {gameState.currentPhase === 'SETUP' && (
        <main className="setup-overlay">
          <div className="setup-card">
            <h1>Six Cards</h1>
            <p className="setup-subtitle">
              High-stakes memory, card replacement, special abilities & matching elimination.
            </p>

            <div className="setup-section">
              <label className="setup-section-label">Select Number of Players (2 – 6)</label>
              <div className="player-count-buttons">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`player-count-btn ${playerCount === num ? 'active' : ''}`}
                    onClick={() => handlePlayerCountChange(num)}
                    id={`player-count-${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="deck-count-indicator">
                Configured with <span>{getRequiredDeckCount(playerCount)} Deck(s)</span> (
                {getRequiredDeckCount(playerCount) * 52} total cards).
              </div>
            </div>

            <div className="setup-section">
              <label className="setup-section-label">Player Names</label>
              <div className="player-names-grid">
                {playerNames.map((name, i) => (
                  <div key={i} className="player-name-input-wrap">
                    <label htmlFor={`player-name-input-${i}`}>Player {i + 1}</label>
                    <input
                      id={`player-name-input-${i}`}
                      type="text"
                      className="player-name-input"
                      value={name}
                      maxLength={18}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="primary-gold-btn"
              onClick={handleStartGame}
              id="start-game-btn"
            >
              Deal Cards & Begin Game
            </button>
          </div>
        </main>
      )}

      {/* MAIN GAMEPLAY TABLE */}
      {gameState.currentPhase !== 'SETUP' && (
        <main className="game-table">
          {/* Opponents Seats */}
          <section className="opponents-row" aria-label="Opponent player hands">
            {gameState.players
              .filter((_, idx) => idx !== gameState.currentPlayerIndex)
              .map((opp) => (
                <PlayerMat
                  key={opp.id}
                  player={opp}
                  isActiveTurn={false}
                  isSelf={false}
                />
              ))}
          </section>

          {/* Center Arena: Draw Pile, Discards, Eliminated count, Active Turn Prompt */}
          <section className="table-center-arena" aria-label="Center Table Area">
            {/* Draw Pile */}
            <div className="deck-pile-slot">
              <span className="deck-pile-label">Draw Pile</span>
              <CardView
                card={null}
                isFaceUp={false}
                label={`Draw pile with ${gameState.drawPile.length} cards remaining`}
              />
              <span className="pile-badge" id="draw-pile-count">
                {gameState.drawPile.length} cards left
              </span>
            </div>

            {/* Turn Announcement Banner */}
            <div className="active-turn-banner">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Active Turn
              </span>
              <span className="turn-player-name">{activePlayer?.displayName}</span>
              <span className="turn-instruction">
                {isReplacingMode
                  ? 'Click any card in your hand below to replace it with the drawn card.'
                  : gameState.currentPhase === 'CARD_DRAWN'
                  ? 'Choose an action for your drawn card below.'
                  : 'Draw a card, attempt matching elimination, or declare victory.'}
              </span>
            </div>

            {/* Drawn Card display if drawn */}
            {gameState.pendingDrawnCard && (
              <div className="deck-pile-slot">
                <span className="deck-pile-label" style={{ color: 'var(--emerald)' }}>
                  Drawn Card
                </span>
                <CardView
                  card={gameState.pendingDrawnCard}
                  isFaceUp
                  label="Currently drawn card"
                />
                <span className="pile-badge">
                  {gameState.pendingDrawnCard.pointValue} pts
                </span>
              </div>
            )}

            {/* Discard Pile */}
            <div className="deck-pile-slot">
              <span className="deck-pile-label">Discard Pile</span>
              {topDiscard ? (
                <CardView
                  card={topDiscard}
                  isFaceUp
                  label={`Top of discard pile: ${topDiscard.rank} of ${topDiscard.suit}`}
                />
              ) : (
                <div
                  className="card-frame"
                  style={{
                    border: '2px dashed rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  Empty
                </div>
              )}
              <span className="pile-badge" id="discard-pile-info">
                {topDiscard ? `${topDiscard.pointValue} pts (Top)` : '0 cards'}
              </span>
            </div>

            {/* Eliminated Zone Summary */}
            <div className="eliminated-summary-slot" id="eliminated-count-box">
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Eliminated
              </span>
              <span className="eliminated-count">
                {gameState.eliminatedCards.length}
              </span>
              <span>Cards removed</span>
            </div>
          </section>

          {/* Action Bar */}
          <section className="action-bar-container" aria-label="Player Actions">
            {gameState.currentPhase === 'TURN_START' && (
              <>
                <button
                  type="button"
                  className="action-btn action-btn-draw"
                  onClick={() => {
                    try {
                      engine.drawCard();
                      setIsReplacingMode(false);
                      syncEngineState();
                    } catch {
                      syncEngineState();
                    }
                  }}
                  id="draw-card-btn"
                >
                  🎴 Draw Card
                </button>

                <button
                  type="button"
                  className="action-btn action-btn-eliminate"
                  disabled={!topDiscard}
                  onClick={() => {
                    engine.startElimination();
                    syncEngineState();
                  }}
                  id="start-elimination-btn"
                >
                  ⚡ Match & Eliminate ({topDiscard ? `${topDiscard.pointValue} pts` : 'No Discard'})
                </button>

                <button
                  type="button"
                  className="action-btn action-btn-declare"
                  disabled={!gameState.firstRoundCompleted}
                  onClick={() => setShowDeclareVictoryConfirm(true)}
                  id="declare-victory-btn"
                >
                  🏆 Declare Victory
                </button>
              </>
            )}

            {gameState.currentPhase === 'CARD_DRAWN' && gameState.pendingDrawnCard && (
              <>
                <button
                  type="button"
                  className={`action-btn ${isReplacingMode ? 'action-btn-draw' : 'action-btn-neutral'}`}
                  onClick={() => setIsReplacingMode(!isReplacingMode)}
                  id="toggle-replace-btn"
                >
                  🔄 {isReplacingMode ? 'Cancel Replacement' : 'Replace a Card in Hand'}
                </button>

                <button
                  type="button"
                  className="action-btn action-btn-neutral"
                  onClick={() => {
                    engine.discardDrawnCard();
                    setIsReplacingMode(false);
                    syncEngineState();
                  }}
                  id="discard-drawn-btn"
                >
                  🗑️ Discard Drawn Card
                </button>

                {gameState.pendingDrawnCard.rank === '7' && (
                  <button
                    type="button"
                    className="action-btn action-btn-draw"
                    onClick={() => {
                      engine.startAbility7();
                      syncEngineState();
                    }}
                    id="use-ability-7-btn"
                  >
                    👁️ Use 7 Ability (Peek Own Card)
                  </button>
                )}

                {gameState.pendingDrawnCard.rank === '8' && (
                  <button
                    type="button"
                    className="action-btn action-btn-draw"
                    onClick={() => {
                      engine.startAbility8();
                      syncEngineState();
                    }}
                    id="use-ability-8-btn"
                  >
                    👁️ Use 8 Ability (Peek Opponent Card)
                  </button>
                )}

                {gameState.pendingDrawnCard.rank === 'J' && (
                  <button
                    type="button"
                    className="action-btn action-btn-draw"
                    onClick={() => {
                      engine.startAbilityJack();
                      syncEngineState();
                    }}
                    id="use-ability-jack-btn"
                  >
                    🔀 Use Jack Ability (Blind Exchange)
                  </button>
                )}
              </>
            )}
          </section>

          {/* Active Player Mat */}
          {activePlayer && (
            <PlayerMat
              player={activePlayer}
              isActiveTurn={true}
              isSelf={true}
              interactive={isReplacingMode}
              prompt={
                isReplacingMode
                  ? 'Click the card position you want to replace.'
                  : undefined
              }
              onCardClick={(index) => {
                if (isReplacingMode) {
                  engine.replaceCard(index);
                  setIsReplacingMode(false);
                  syncEngineState();
                }
              }}
            />
          )}

          {/* Action History Log */}
          <ActionLog entries={gameState.actionHistory} />
        </main>
      )}

      {/* PASS DEVICE PRIVACY MODAL */}
      {gameState.currentPhase === 'PASS_DEVICE' && (
        <PassDeviceModal
          playerName={
            gameState.initialMemorizationPlayerIndex >= 0
              ? gameState.players[gameState.initialMemorizationPlayerIndex]?.displayName
              : gameState.players[gameState.currentPlayerIndex]?.displayName
          }
          onConfirm={() => {
            engine.confirmPassDevice();
            syncEngineState();
          }}
        />
      )}

      {/* INITIAL MEMORIZATION MODAL */}
      {gameState.currentPhase === 'INITIAL_MEMORIZATION' &&
        gameState.initialMemorizationPlayerIndex >= 0 && (
          <InitialMemorizeModal
            playerName={
              gameState.players[gameState.initialMemorizationPlayerIndex]?.displayName
            }
            cards={
              gameState.players[gameState.initialMemorizationPlayerIndex]?.cards || []
            }
            onFinishMemorization={(selectedIndices) => {
              engine.memorizeCards(selectedIndices);
              engine.completeMemorizationForPlayer();
              syncEngineState();
            }}
          />
        )}

      {/* REVEAL MODAL (FOR 7 & 8 SPECIAL ABILITIES) */}
      {(gameState.currentPhase === 'SPECIAL_ABILITY_7' ||
        gameState.currentPhase === 'SPECIAL_ABILITY_8') && (
        <RevealModal
          abilityType={gameState.currentPhase === 'SPECIAL_ABILITY_7' ? '7' : '8'}
          activePlayer={activePlayer}
          allPlayers={gameState.players}
          peekedCard={gameState.peekedCard}
          onSelectOwnCard={(idx) => {
            engine.executeAbility7(idx);
            syncEngineState();
          }}
          onSelectOpponentCard={(oppId, idx) => {
            engine.executeAbility8(oppId, idx);
            syncEngineState();
          }}
          onFinish={() => {
            if (gameState.currentPhase === 'SPECIAL_ABILITY_7') {
              engine.finishAbility7();
            } else {
              engine.finishAbility8();
            }
            syncEngineState();
          }}
        />
      )}

      {/* JACK BLIND EXCHANGE MODAL */}
      {gameState.currentPhase === 'SPECIAL_ABILITY_JACK' && (
        <JackExchangeModal
          activePlayer={activePlayer}
          allPlayers={gameState.players}
          onConfirmExchange={(ownIdx, oppId, oppIdx) => {
            engine.setJackSelection(ownIdx, oppId, oppIdx);
            engine.executeJackExchange();
            syncEngineState();
          }}
          onCancel={() => {
            // Cancel returns to CARD_DRAWN
            const state = engine.getState();
            state.currentPhase = 'CARD_DRAWN';
            state.jackSelection = null;
            engine.loadState(state);
            syncEngineState();
          }}
        />
      )}

      {/* MATCHING ELIMINATION MODAL */}
      {gameState.currentPhase === 'SELECT_ELIMINATION' && topDiscard && (
        <EliminationModal
          topDiscard={topDiscard}
          activePlayer={activePlayer}
          onAttempt={(selectedIndices) => {
            engine.attemptElimination(selectedIndices);
            syncEngineState();
          }}
          onCancel={() => {
            engine.cancelElimination();
            syncEngineState();
          }}
        />
      )}

      {/* PENALTY NOTICE MODAL */}
      {gameState.currentPhase === 'PENALTY_NOTICE' && gameState.pendingPenalty && (
        <PenaltyModal
          pendingPenalty={gameState.pendingPenalty}
          onAcknowledge={() => {
            engine.acknowledgePenalty();
            syncEngineState();
          }}
        />
      )}

      {/* DECLARE VICTORY CONFIRMATION MODAL */}
      {showDeclareVictoryConfirm && (
        <DeclareVictoryModal
          playerName={activePlayer?.displayName || 'Active Player'}
          onConfirm={() => {
            setShowDeclareVictoryConfirm(false);
            engine.declareVictory();
            syncEngineState();
          }}
          onCancel={() => setShowDeclareVictoryConfirm(false)}
        />
      )}

      {/* GAME OVER RESULTS MODAL */}
      {gameState.currentPhase === 'GAME_OVER' && (
        <GameOverModal
          players={gameState.players}
          winnerIds={gameState.winnerIds}
          endReason={gameState.endReason}
          declaringPlayerId={gameState.declaringPlayerId}
          onPlayAgain={() => {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setGameState({
              ...engine.getState(),
              currentPhase: 'SETUP',
            });
          }}
        />
      )}

      {/* RULES MODAL */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
};

export default App;
