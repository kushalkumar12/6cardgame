import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameEngine } from './engine/gameEngine';
import { AIBot } from './engine/aiBot';
import type { GameState } from './types/game';
import type { UserProfile, NetworkInfo, RoomPlayerInfo } from './types/user';
import { getRequiredDeckCount } from './engine/deck';
import { api, socket } from './services/api';

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

import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ModeSelect } from './components/ModeSelect';
import type { GamePlayMode } from './components/ModeSelect';
import { LobbyRoom } from './components/LobbyRoom';
import { InvitationToast } from './components/InvitationToast';

const USER_STORAGE_KEY = 'six_cards_user_profile_v1';
const LOCAL_STORAGE_KEY = 'six_cards_game_state_v1';

export const App: React.FC = () => {
  // User Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Network info (LAN WiFi URL)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Active UI Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDeclareVictoryConfirm, setShowDeclareVictoryConfirm] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);

  // Invitation Toast state
  const [incomingInvite, setIncomingInvite] = useState<{ fromName: string; roomCode: string } | null>(null);

  // Game Mode Selection
  const [selectedMode, setSelectedMode] = useState<GamePlayMode | null>(null);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');

  // Multiplayer Room State
  const [activeRoom, setActiveRoom] = useState<{
    roomCode: string;
    mode: 'lan' | 'online_team';
    isHost: boolean;
    players: RoomPlayerInfo[];
  } | null>(null);
  const [myGamePlayerId, setMyGamePlayerId] = useState<string | null>(null);

  // Single-player AI Bot reference
  const aiBotRef = useRef<AIBot | null>(null);
  const isAiThinkingRef = useRef<boolean>(false);

  // Local Game Engine
  const engine = useMemo(() => new GameEngine(), []);
  const [gameState, setGameState] = useState<GameState>(() => engine.getState());

  // Setup options for Pass & Play
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]);

  // Sync state helper
  const syncEngineState = React.useCallback(() => {
    const fresh = engine.getState();
    setGameState(fresh);
    try {
      if (fresh.currentPhase !== 'SETUP' && !activeRoom) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fresh));
      }
    } catch {
      // Ignore storage errors
    }
  }, [engine, activeRoom]);

  // Fetch LAN info and setup sockets on mount
  useEffect(() => {
    api.getNetworkInfo().then(setNetworkInfo).catch(() => {});

    socket.connect();

    socket.on('received_invitation', (invite: any) => {
      setIncomingInvite(invite);
    });

    socket.on('room_updated', (room: any) => {
      setActiveRoom((prev) =>
        prev
          ? {
              ...prev,
              players: room.players,
              isHost: room.hostId === currentUser?.id,
            }
          : null
      );
    });

    socket.on('game_started', ({ state, myGamePlayerId }: any) => {
      setGameState(state);
      setMyGamePlayerId(myGamePlayerId);
    });

    socket.on('room_state_update', ({ state }: any) => {
      setGameState(state);
    });

    return () => {
      socket.off('received_invitation');
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('room_state_update');
    };
  }, [currentUser]);

  // Register user on socket when logged in
  useEffect(() => {
    if (currentUser) {
      socket.emit('register_user', currentUser.id);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  // AI Turn Automation in Mode 1 ("Play with System")
  useEffect(() => {
    if (selectedMode !== 'system' || !aiBotRef.current || gameState.gameOver) return;

    const aiBot = aiBotRef.current;
    const isAiTurnInMemorize =
      gameState.currentPhase === 'INITIAL_MEMORIZATION' &&
      gameState.initialMemorizationPlayerIndex === 1;

    // AI Memorization
    if (isAiTurnInMemorize && !isAiThinkingRef.current) {
      isAiThinkingRef.current = true;
      const timer = setTimeout(() => {
        try {
          const indices = aiBot.chooseInitialMemorization();
          const revealed = engine.memorizeCards(indices);
          aiBot.recordMemorizedCards(indices, [revealed[0], revealed[1]]);
          engine.completeMemorizationForPlayer();
          engine.confirmPassDevice();
          syncEngineState();
        } catch {
          // Ignore
        } finally {
          isAiThinkingRef.current = false;
        }
      }, 700);
      return () => clearTimeout(timer);
    }

    // AI Normal Gameplay Turn
    const isAiActive =
      gameState.currentPlayerIndex === 1 &&
      (gameState.currentPhase === 'TURN_START' ||
        gameState.currentPhase === 'CARD_DRAWN' ||
        gameState.currentPhase === 'PASS_DEVICE');

    if (isAiActive && !isAiThinkingRef.current) {
      isAiThinkingRef.current = true;
      const timer = setTimeout(() => {
        try {
          if (gameState.currentPhase === 'PASS_DEVICE') {
            engine.confirmPassDevice();
            syncEngineState();
          } else if (gameState.currentPhase === 'TURN_START') {
            const decision = aiBot.decideTurnStartAction(engine);
            if (decision === 'DECLARE_VICTORY') {
              engine.declareVictory();
            } else if (decision === 'ELIMINATE') {
              const matching = aiBot.getKnownMatchingIndices(engine);
              if (matching.length > 0) {
                engine.startElimination();
                const res = engine.attemptElimination(matching);
                if (res.success) {
                  aiBot.onCardEliminated(matching);
                } else {
                  engine.acknowledgePenalty();
                }
                engine.confirmPassDevice();
              } else {
                engine.drawCard();
              }
            } else {
              engine.drawCard();
            }
            syncEngineState();
          } else if (gameState.currentPhase === 'CARD_DRAWN' && gameState.pendingDrawnCard) {
            const drawn = gameState.pendingDrawnCard;
            const decision = aiBot.decideCardDrawnAction(drawn, engine);
            if (decision.action === 'REPLACE' && decision.replaceIndex !== undefined) {
              engine.replaceCard(decision.replaceIndex);
              engine.confirmPassDevice();
            } else if (decision.action === 'USE_7' && decision.targetCardIndex !== undefined) {
              engine.startAbility7();
              engine.executeAbility7(decision.targetCardIndex);
              engine.finishAbility7();
              engine.confirmPassDevice();
            } else if (decision.action === 'USE_8' && decision.targetOpponentId && decision.targetCardIndex !== undefined) {
              engine.startAbility8();
              engine.executeAbility8(decision.targetOpponentId, decision.targetCardIndex);
              engine.finishAbility8();
              engine.confirmPassDevice();
            } else if (decision.action === 'USE_JACK' && decision.jackOwnIndex !== undefined && decision.targetOpponentId && decision.targetCardIndex !== undefined) {
              engine.startAbilityJack();
              engine.setJackSelection(decision.jackOwnIndex, decision.targetOpponentId, decision.targetCardIndex);
              engine.executeJackExchange();
              engine.confirmPassDevice();
            } else {
              engine.discardDrawnCard();
              engine.confirmPassDevice();
            }
            syncEngineState();
          }
        } catch {
          // Recovery
          syncEngineState();
        } finally {
          isAiThinkingRef.current = false;
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedMode, gameState, engine, syncEngineState]);

  // Mode 1: Start Game with System (AI Bot)
  const startSystemMatch = () => {
    setSelectedMode('system');
    aiBotRef.current = new AIBot('player-2');
    const humanName = currentUser?.username || 'Player 1';
    engine.initializeGame({
      playerNames: [humanName, 'System AI (Bot)'],
    });
    syncEngineState();
  };

  // Mode 2 / 3: Create Room (LAN or Online Team)
  const handleCreateRoom = (mode: 'lan' | 'online_team') => {
    if (!currentUser) return;
    socket.emit(
      'create_room',
      {
        userId: currentUser.id,
        displayName: currentUser.username,
        avatar: currentUser.avatar,
        mode,
        maxPlayers: 4,
      },
      (res: any) => {
        if (res.success) {
          setActiveRoom({
            roomCode: res.roomCode,
            mode,
            isHost: true,
            players: res.room.players,
          });
          setSelectedMode(mode);
        }
      }
    );
  };

  // Join Room by Code
  const handleJoinRoom = (codeToJoin?: string) => {
    const code = (codeToJoin || joinRoomCodeInput).trim().toUpperCase();
    if (!code || !currentUser) return;
    socket.emit(
      'join_room',
      {
        roomCode: code,
        userId: currentUser.id,
        displayName: currentUser.username,
        avatar: currentUser.avatar,
      },
      (res: any) => {
        if (res.success) {
          setActiveRoom({
            roomCode: res.roomCode,
            mode: res.room.mode,
            isHost: res.room.hostId === currentUser.id,
            players: res.room.players,
          });
          setSelectedMode(res.room.mode);
          setJoinRoomCodeInput('');
        } else {
          alert(res.error || 'Could not join room');
        }
      }
    );
  };

  // Toggle ready in room
  const handleToggleReady = () => {
    if (!activeRoom || !currentUser) return;
    socket.emit('toggle_ready', { roomCode: activeRoom.roomCode, userId: currentUser.id });
  };

  // Host starts room game
  const handleStartRoomGame = () => {
    if (!activeRoom) return;
    socket.emit('start_room_game', { roomCode: activeRoom.roomCode }, (res: any) => {
      if (!res.success) {
        alert(res.error || 'Could not start game');
      }
    });
  };

  // Invite player by ID
  const handleInvitePlayer = async (targetId: string): Promise<boolean> => {
    if (!activeRoom || !currentUser) return false;
    return new Promise((resolve) => {
      socket.emit(
        'invite_player',
        {
          roomCode: activeRoom.roomCode,
          targetPlayerId: targetId,
          fromName: currentUser.username,
        },
        (res: any) => {
          resolve(Boolean(res.success));
        }
      );
    });
  };

  // Leave active room
  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setSelectedMode(null);
    setGameState(engine.getState());
  };

  // Logout action
  const handleLogout = () => {
    setCurrentUser(null);
    setShowProfile(false);
    setSelectedMode(null);
    setActiveRoom(null);
  };

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const topDiscard = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // In Networked Mode, determine if it is the current client's turn
  const isMyTurnInNetwork = activeRoom
    ? activePlayer?.id === myGamePlayerId
    : true;

  return (
    <div className="app-container">
      {/* AUTHENTICATION OVERLAY */}
      {!currentUser && <AuthModal onSuccess={(u) => setCurrentUser(u)} />}

      <Header
        roundNumber={gameState.roundNumber}
        firstRoundCompleted={gameState.firstRoundCompleted}
        onOpenRules={() => setShowRules(true)}
        onRestartGame={() => {
          if (window.confirm('Leave current game?')) {
            setSelectedMode(null);
            setActiveRoom(null);
            setGameState({ ...engine.getState(), currentPhase: 'SETUP' });
          }
        }}
        isGameActive={gameState.currentPhase !== 'SETUP'}
        user={currentUser}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* USER PROFILE MODAL */}
      {showProfile && currentUser && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
          onInviteFriend={(fid) => {
            if (activeRoom) {
              handleInvitePlayer(fid);
            } else {
              alert('Create or join a room first, then invite your friends!');
            }
          }}
        />
      )}

      {/* INCOMING INVITATION POPUP TOAST */}
      {incomingInvite && (
        <InvitationToast
          fromName={incomingInvite.fromName}
          roomCode={incomingInvite.roomCode}
          onAccept={(code) => {
            setIncomingInvite(null);
            handleJoinRoom(code);
          }}
          onDecline={() => setIncomingInvite(null)}
        />
      )}

      {/* SETUP & MODE SELECTION SCREEN */}
      {gameState.currentPhase === 'SETUP' && !activeRoom && (
        <main className="setup-overlay">
          <div className="setup-card" style={{ maxWidth: '840px' }}>
            <h1>Six Cards</h1>
            <p className="setup-subtitle">
              Choose from 3 Play Modes: Play with System (AI), Same WiFi LAN, or Online Team.
            </p>

            {/* Mode Selection Cards */}
            <ModeSelect
              networkInfo={networkInfo}
              onSelectMode={(mode) => {
                if (mode === 'system') {
                  startSystemMatch();
                } else if (mode === 'lan') {
                  handleCreateRoom('lan');
                } else if (mode === 'online_team') {
                  handleCreateRoom('online_team');
                } else {
                  setSelectedMode('pass_and_play');
                }
              }}
            />

            {/* Join Room by Code Input Bar */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, margin: '18px 0', textAlign: 'left' }}>
              <label style={{ fontSize: '0.84rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
                Have a Room Code? Join Directly:
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="player-name-input"
                  style={{ flex: 1, textTransform: 'uppercase' }}
                  placeholder="Enter 4-letter Room Code (e.g. 7K2X)"
                  value={joinRoomCodeInput}
                  onChange={(e) => setJoinRoomCodeInput(e.target.value)}
                />
                <button
                  className="primary-gold-btn"
                  style={{ width: 'auto', padding: '10px 24px' }}
                  onClick={() => handleJoinRoom()}
                >
                  Join Room
                </button>
              </div>
            </div>

            {/* Classic Local Pass-and-Play Accordion */}
            {selectedMode === 'pass_and_play' && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: 12 }}>
                  Local Pass-and-Play (Single Device)
                </h3>
                <div className="setup-section">
                  <label className="setup-section-label">Select Number of Players (2 – 6)</label>
                  <div className="player-count-buttons">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`player-count-btn ${playerCount === num ? 'active' : ''}`}
                        onClick={() => {
                          setPlayerCount(num);
                          const updated = [...playerNames];
                          while (updated.length < num) updated.push(`Player ${updated.length + 1}`);
                          setPlayerNames(updated.slice(0, num));
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="deck-count-indicator">
                    <span>{getRequiredDeckCount(playerCount)} Deck(s)</span> ({getRequiredDeckCount(playerCount) * 52} cards)
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-gold-btn"
                  onClick={() => {
                    engine.initializeGame({ playerNames });
                    syncEngineState();
                  }}
                >
                  Deal Cards & Begin Pass-and-Play
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* MULTIPLAYER LOBBY ROOM SCREEN */}
      {gameState.currentPhase === 'SETUP' && activeRoom && (
        <main className="setup-overlay">
          <LobbyRoom
            roomCode={activeRoom.roomCode}
            mode={activeRoom.mode}
            isHost={activeRoom.isHost}
            myUserId={currentUser?.id || ''}
            players={activeRoom.players}
            networkInfo={networkInfo}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartRoomGame}
            onLeaveRoom={handleLeaveRoom}
            onInvitePlayerId={handleInvitePlayer}
          />
        </main>
      )}

      {/* MAIN GAMEPLAY TABLE (ALL MODES) */}
      {gameState.currentPhase !== 'SETUP' && (
        <main className="game-table">
          {/* Opponents Row */}
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

          {/* Center Arena */}
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
                {selectedMode === 'system' && gameState.currentPlayerIndex === 1
                  ? '🤖 System AI is making its move...'
                  : !isMyTurnInNetwork && activeRoom
                  ? `Waiting for ${activePlayer?.displayName}...`
                  : isReplacingMode
                  ? 'Click any card in your hand below to replace it.'
                  : gameState.currentPhase === 'CARD_DRAWN'
                  ? 'Choose an action for your drawn card below.'
                  : 'Draw a card, attempt matching elimination, or declare victory.'}
              </span>
            </div>

            {/* Drawn Card if active */}
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
                  label={`Top discard: ${topDiscard.rank} of ${topDiscard.suit}`}
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

            {/* Eliminated Zone */}
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

          {/* Action Bar (Enabled for human player on their turn) */}
          <section className="action-bar-container" aria-label="Player Actions">
            {gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork && (
              <>
                <button
                  type="button"
                  className="action-btn action-btn-draw"
                  disabled={selectedMode === 'system' && gameState.currentPlayerIndex === 1}
                  onClick={() => {
                    if (activeRoom) {
                      socket.emit('room_action', { roomCode: activeRoom.roomCode, actionType: 'DRAW' });
                    } else {
                      try {
                        engine.drawCard();
                        setIsReplacingMode(false);
                        syncEngineState();
                      } catch {
                        syncEngineState();
                      }
                    }
                  }}
                  id="draw-card-btn"
                >
                  🎴 Draw Card
                </button>

                <button
                  type="button"
                  className="action-btn action-btn-eliminate"
                  disabled={!topDiscard || (selectedMode === 'system' && gameState.currentPlayerIndex === 1)}
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
                  disabled={!gameState.firstRoundCompleted || (selectedMode === 'system' && gameState.currentPlayerIndex === 1)}
                  onClick={() => setShowDeclareVictoryConfirm(true)}
                  id="declare-victory-btn"
                >
                  🏆 Declare Victory
                </button>
              </>
            )}

            {gameState.currentPhase === 'CARD_DRAWN' && gameState.pendingDrawnCard && isMyTurnInNetwork && (
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
                    if (activeRoom) {
                      socket.emit('room_action', { roomCode: activeRoom.roomCode, actionType: 'DISCARD' });
                    } else {
                      engine.discardDrawnCard();
                      setIsReplacingMode(false);
                      syncEngineState();
                    }
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
              interactive={isReplacingMode && isMyTurnInNetwork}
              prompt={isReplacingMode ? 'Click the card position you want to replace.' : undefined}
              onCardClick={(index) => {
                if (isReplacingMode) {
                  if (activeRoom) {
                    socket.emit('room_action', {
                      roomCode: activeRoom.roomCode,
                      actionType: 'REPLACE',
                      payload: { index },
                    });
                  } else {
                    engine.replaceCard(index);
                    syncEngineState();
                  }
                  setIsReplacingMode(false);
                }
              }}
            />
          )}

          {/* Action History Log */}
          <ActionLog entries={gameState.actionHistory} />
        </main>
      )}

      {/* PASS DEVICE PRIVACY MODAL (Pass-and-play only) */}
      {gameState.currentPhase === 'PASS_DEVICE' && !activeRoom && selectedMode !== 'system' && (
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
        gameState.initialMemorizationPlayerIndex >= 0 &&
        (!activeRoom || (activeRoom && myGamePlayerId === `player-${gameState.initialMemorizationPlayerIndex + 1}`)) &&
        (selectedMode !== 'system' || gameState.initialMemorizationPlayerIndex === 0) && (
          <InitialMemorizeModal
            playerName={
              gameState.players[gameState.initialMemorizationPlayerIndex]?.displayName
            }
            cards={
              gameState.players[gameState.initialMemorizationPlayerIndex]?.cards || []
            }
            onFinishMemorization={(selectedIndices) => {
              if (activeRoom) {
                socket.emit('room_action', {
                  roomCode: activeRoom.roomCode,
                  actionType: 'MEMORIZE',
                  payload: { indices: selectedIndices },
                });
              } else {
                engine.memorizeCards(selectedIndices);
                engine.completeMemorizationForPlayer();
                if (selectedMode === 'system') {
                  engine.confirmPassDevice();
                }
                syncEngineState();
              }
            }}
          />
        )}

      {/* REVEAL MODAL (FOR 7 & 8 SPECIAL ABILITIES) */}
      {(gameState.currentPhase === 'SPECIAL_ABILITY_7' ||
        gameState.currentPhase === 'SPECIAL_ABILITY_8') &&
        isMyTurnInNetwork && (
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
              if (selectedMode === 'system') {
                engine.confirmPassDevice();
              }
              syncEngineState();
            }}
          />
        )}

      {/* JACK BLIND EXCHANGE MODAL */}
      {gameState.currentPhase === 'SPECIAL_ABILITY_JACK' && isMyTurnInNetwork && (
        <JackExchangeModal
          activePlayer={activePlayer}
          allPlayers={gameState.players}
          onConfirmExchange={(ownIdx, oppId, oppIdx) => {
            if (activeRoom) {
              socket.emit('room_action', {
                roomCode: activeRoom.roomCode,
                actionType: 'ABILITY_JACK',
                payload: { ownIndex: ownIdx, targetOpponentId: oppId, targetIndex: oppIdx },
              });
            } else {
              engine.setJackSelection(ownIdx, oppId, oppIdx);
              engine.executeJackExchange();
              if (selectedMode === 'system') {
                engine.confirmPassDevice();
              }
              syncEngineState();
            }
          }}
          onCancel={() => {
            const state = engine.getState();
            state.currentPhase = 'CARD_DRAWN';
            state.jackSelection = null;
            engine.loadState(state);
            syncEngineState();
          }}
        />
      )}

      {/* MATCHING ELIMINATION MODAL */}
      {gameState.currentPhase === 'SELECT_ELIMINATION' && topDiscard && isMyTurnInNetwork && (
        <EliminationModal
          topDiscard={topDiscard}
          activePlayer={activePlayer}
          onAttempt={(selectedIndices) => {
            if (activeRoom) {
              socket.emit('room_action', {
                roomCode: activeRoom.roomCode,
                actionType: 'ELIMINATE',
                payload: { indices: selectedIndices },
              });
            } else {
              engine.attemptElimination(selectedIndices);
              syncEngineState();
            }
          }}
          onCancel={() => {
            engine.cancelElimination();
            syncEngineState();
          }}
        />
      )}

      {/* PENALTY NOTICE MODAL */}
      {gameState.currentPhase === 'PENALTY_NOTICE' && gameState.pendingPenalty && isMyTurnInNetwork && (
        <PenaltyModal
          pendingPenalty={gameState.pendingPenalty}
          onAcknowledge={() => {
            engine.acknowledgePenalty();
            if (selectedMode === 'system') {
              engine.confirmPassDevice();
            }
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
            if (activeRoom) {
              socket.emit('room_action', {
                roomCode: activeRoom.roomCode,
                actionType: 'DECLARE_VICTORY',
              });
            } else {
              engine.declareVictory();
              syncEngineState();
            }
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
            setSelectedMode(null);
            setActiveRoom(null);
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
