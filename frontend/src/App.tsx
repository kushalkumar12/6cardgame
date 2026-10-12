import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameEngine } from './engine/gameEngine';
import { AIBot } from './engine/aiBot';
import type { GameState } from './types/game';
import type { UserProfile, RoomPlayerInfo } from './types/user';
import { getRequiredDeckCount } from './engine/deck';
import { api, socket } from './services/api';
import { logger } from './services/logger';

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
import { FriendRequestToast } from './components/FriendRequestToast';

const USER_SESSION_KEY = 'six_cards_user_session_v1';
const USER_STORAGE_KEY = 'six_cards_user_profile_v1';
const LOCAL_STORAGE_KEY = 'six_cards_game_state_v1';

export const App: React.FC = () => {
  // User Profile State (checks sessionStorage first so multiple tabs can test independently)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const session = sessionStorage.getItem(USER_SESSION_KEY);
      if (session) return JSON.parse(session);
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Online players list across server
  const [onlinePlayers, setOnlinePlayers] = useState<{ id: string; username: string; avatar: string }[]>([]);


  // Active UI Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDeclareVictoryConfirm, setShowDeclareVictoryConfirm] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  const [isReplacingFromDiscardMode, setIsReplacingFromDiscardMode] = useState(false);

  // Invitation Toast state
  const [incomingInvite, setIncomingInvite] = useState<{
    fromName: string;
    roomCode: string;
    fromUserId?: string;
  } | null>(null);

  // Friend Request Toast state
  const [incomingFriendRequest, setIncomingFriendRequest] = useState<{
    fromUserId: string;
    fromName: string;
    fromAvatar: string;
  } | null>(null);

  // Session termination & refresh warning states
  const [sessionTerminatedMessage, setSessionTerminatedMessage] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);

  // Game Mode Selection
  const [selectedMode, setSelectedMode] = useState<GamePlayMode | null>(null);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');

  // Multiplayer Room State
  const [activeRoom, setActiveRoom] = useState<{
    roomCode: string;
    mode: 'multiplayer' | 'lan' | 'online_team';
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

  const currentUserRef = useRef<UserProfile | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Check system health, fetch online players, and setup sockets
  useEffect(() => {
    api.getHealth().catch(() => {});
    api.getOnlinePlayers().then(setOnlinePlayers).catch(() => {});

    const registerSocket = () => {
      if (currentUserRef.current) {
        socket.emit('register_user', {
          userId: currentUserRef.current.id,
          username: currentUserRef.current.username,
          avatar: currentUserRef.current.avatar,
        });
      }
      socket.emit('get_online_players');
    };

    socket.on('connect', registerSocket);

    socket.on('online_players_update', (list: any[]) => {
      if (Array.isArray(list)) {
        setOnlinePlayers(list);
      }
    });

    socket.on('received_invitation', (invite: any) => {
      setIncomingInvite(invite);
    });

    socket.on('received_friend_request', (req: any) => {
      setIncomingFriendRequest(req);
    });

    socket.on('room_updated', (room: any) => {
      setActiveRoom((prev) =>
        prev
          ? {
              ...prev,
              players: room.players,
              isHost: room.hostId === currentUserRef.current?.id,
            }
          : null
      );
    });

    socket.on('game_started', ({ state, myGamePlayerId }: any) => {
      engine.loadState(state);
      setGameState(state);
      setMyGamePlayerId(myGamePlayerId);
    });

    socket.on('room_state_update', ({ state }: any) => {
      engine.loadState(state);
      setGameState(state);
    });

    socket.on('session_terminated', ({ message }: any) => {
      handleLogout(message || 'Another session was opened from your network/IP. You have been logged out.');
      if (socket.connected) {
        socket.disconnect();
      }
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      registerSocket();
    }

    return () => {
      socket.off('connect', registerSocket);
      socket.off('online_players_update');
      socket.off('received_invitation');
      socket.off('received_friend_request');
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('room_state_update');
      socket.off('session_terminated');
    };
  }, []);

  // Sync user state and register user on socket when logged in
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      if (socket.connected) {
        socket.emit('register_user', {
          userId: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
        });
        socket.emit('get_online_players');
      }
    } else {
      sessionStorage.removeItem(USER_SESSION_KEY);
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
            } else if (decision === 'REPLACE_FROM_DISCARD') {
              const replaceIdx = aiBot.getBestDiscardReplacementIndex(engine);
              if (replaceIdx !== -1 && gameState.discardPile.length > 0) {
                const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
                engine.replaceCardFromDiscard(replaceIdx);
                aiBot.onCardReplacedFromDiscard(replaceIdx, topDiscard);
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

  // Mode 1: Start Game with System (AI Bot - Bot Plays First)
  const startSystemMatch = () => {
    setSelectedMode('system');
    aiBotRef.current = new AIBot('player-2');
    const humanName = currentUser?.username || 'You';
    engine.initializeGame({
      playerNames: [humanName, 'Bot'],
      firstPlayerIndex: 1, // Bot plays first!
      mode: 'system',
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

  // Invite player by ID or Username
  const handleInvitePlayer = async (targetId: string): Promise<{ success: boolean; message?: string }> => {
    if (!activeRoom || !currentUser) {
      return { success: false, message: 'Room or user session is not ready.' };
    }
    return new Promise((resolve) => {
      socket.emit(
        'invite_player',
        {
          roomCode: activeRoom.roomCode,
          targetPlayerId: targetId,
          fromName: currentUser.username,
          fromUserId: currentUser.id,
        },
        (res: any) => {
          if (res?.success) {
            resolve({
              success: true,
              message: `Invite sent to ${res.targetName || targetId} (${res.targetId || targetId})!`,
            });
          } else {
            resolve({
              success: false,
              message: res?.error || 'Failed to send invite (player may be offline).',
            });
          }
        }
      );
    });
  };

  // Leave active room
  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setSelectedMode(null);
    setMyGamePlayerId(null);
    aiBotRef.current = null;
    isAiThinkingRef.current = false;
    const freshState = engine.reset();
    setGameState(freshState);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
  };

  // Active match detection
  const isGameActive = (Boolean(selectedMode) || Boolean(activeRoom)) && !gameState.gameOver;

  // Track active match in sessionStorage & warn on page refresh
  useEffect(() => {
    if (isGameActive) {
      try {
        sessionStorage.setItem('six_cards_game_in_progress', 'true');
      } catch {}
    } else {
      try {
        sessionStorage.removeItem('six_cards_game_in_progress');
      } catch {}
    }
  }, [isGameActive]);

  // Intercept refresh / reload attempts while actively in a match
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameActive) {
        e.preventDefault();
        e.returnValue = 'You have a match in progress! Refreshing will disrupt or forfeit your game.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGameActive]);

  // Check on mount if user previously refreshed during an active match
  useEffect(() => {
    try {
      const wasInGame = sessionStorage.getItem('six_cards_game_in_progress');
      if (wasInGame === 'true') {
        sessionStorage.removeItem('six_cards_game_in_progress');
        setRefreshWarning('⚠️ Warning: You refreshed while a game was in progress! Your previous match was interrupted.');
        const timer = setTimeout(() => setRefreshWarning(null), 8000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Logout action
  const handleLogout = (terminatedReason?: string) => {
    const freshState = engine.reset();
    setGameState(freshState);
    setSelectedMode(null);
    setActiveRoom(null);
    setMyGamePlayerId(null);
    aiBotRef.current = null;
    isAiThinkingRef.current = false;
    setShowProfile(false);
    setShowRules(false);
    setShowDeclareVictoryConfirm(false);
    setIsReplacingMode(false);
    setIsReplacingFromDiscardMode(false);
    try {
      sessionStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      sessionStorage.removeItem('six_cards_game_in_progress');
    } catch {}
    setCurrentUser(null);
    if (terminatedReason) {
      setSessionTerminatedMessage(terminatedReason);
    }
  };

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const topDiscard = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // Local human player identification (ensures Bot is top, Human is bottom)
  const localPlayer = activeRoom && myGamePlayerId
    ? gameState.players.find((p) => p.id === myGamePlayerId) || activePlayer
    : selectedMode === 'system'
    ? gameState.players[0]
    : activePlayer;

  const opponentPlayers = gameState.players.filter((p) => p.id !== localPlayer?.id);

  // In Networked Mode or Bot Mode, determine if it is the current client's turn
  const isMyTurnInNetwork = activeRoom
    ? activePlayer?.id === myGamePlayerId
    : (selectedMode === 'system' ? gameState.currentPlayerIndex === 0 : true);

  // Jack highlight indices for visual indication (5-6s timer)
  const botHighlightedIndices = gameState.jackHighlight
    ? [
        gameState.jackHighlight.opponentPlayerId === 'player-2'
          ? gameState.jackHighlight.opponentCardIndex
          : gameState.jackHighlight.ownPlayerId === 'player-2'
          ? gameState.jackHighlight.ownCardIndex
          : -1,
      ].filter((i) => i >= 0)
    : [];

  const humanHighlightedIndices = gameState.jackHighlight
    ? [
        gameState.jackHighlight.opponentPlayerId === 'player-1'
          ? gameState.jackHighlight.opponentCardIndex
          : gameState.jackHighlight.ownPlayerId === 'player-1'
          ? gameState.jackHighlight.ownCardIndex
          : -1,
      ].filter((i) => i >= 0)
    : [];

  // Jack highlight cleanup after 5.5s
  useEffect(() => {
    if (!gameState.jackHighlight) return;
    const remaining = Math.max(0, gameState.jackHighlight.activeUntil - Date.now());
    const timer = setTimeout(() => {
      engine.clearJackHighlight();
      syncEngineState();
    }, remaining || 5500);
    return () => clearTimeout(timer);
  }, [gameState.jackHighlight, engine, syncEngineState]);

  // Only the active player who drew the card can see it face-up!
  const isDrawnByCurrentClient = activeRoom
    ? isMyTurnInNetwork
    : (selectedMode === 'system' ? activePlayer?.id !== 'player-2' : true);

  const shouldShowDrawnCardFaceUp = Boolean(
    isDrawnByCurrentClient && !gameState.pendingDrawnCard?.id.startsWith('hidden')
  );

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
            logger.info('GAME', 'Player left current game and returned to mode select');
            setSelectedMode(null);
            setActiveRoom(null);
            setMyGamePlayerId(null);
            aiBotRef.current = null;
            isAiThinkingRef.current = false;
            const fresh = engine.reset();
            setGameState(fresh);
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch {}
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
          onAccept={async (code) => {
            const hostUserId = incomingInvite.fromUserId;
            setIncomingInvite(null);
            if (currentUser && hostUserId && hostUserId !== currentUser.id) {
              await api.addFriend(currentUser.id, hostUserId).catch(() => {});
            }
            handleJoinRoom(code);
          }}
          onDecline={() => setIncomingInvite(null)}
        />
      )}

      {/* INCOMING FRIEND REQUEST POPUP TOAST */}
      {incomingFriendRequest && (
        <FriendRequestToast
          fromName={incomingFriendRequest.fromName}
          fromAvatar={incomingFriendRequest.fromAvatar}
          fromUserId={incomingFriendRequest.fromUserId}
          onAccept={async (targetUserId, targetName) => {
            setIncomingFriendRequest(null);
            if (currentUser) {
              await api.acceptFriendRequest(currentUser.id, targetUserId).catch(() => {});
              await api.addFriend(currentUser.id, targetUserId).catch(() => {});
              alert(`🎉 You and ${targetName} are now friends! Check your Profile -> Friends tab.`);
            }
          }}
          onDecline={() => setIncomingFriendRequest(null)}
        />
      )}

      {/* SETUP & MODE SELECTION SCREEN */}
      {gameState.currentPhase === 'SETUP' && !activeRoom && (
        <main className="setup-overlay">
          <div className="setup-card" style={{ maxWidth: '840px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 }}>
              <img
                src="/logo.png"
                alt="Six Cards Logo"
                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 12, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
              />
              <h1 style={{ margin: 0 }}>Six Cards</h1>
            </div>
            <p className="setup-subtitle">
              Play with System AI or jump into live Multiplayer with friends.
            </p>

            {/* Mode Selection Cards */}
            <ModeSelect
              onSelectMode={(mode) => {
                if (mode === 'system') {
                  startSystemMatch();
                } else if (mode === 'multiplayer' || mode === 'online_team' || mode === 'lan') {
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
            onlinePlayers={onlinePlayers}
            networkInfo={null}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartRoomGame}
            onLeaveRoom={handleLeaveRoom}
            onInvitePlayerId={handleInvitePlayer}
            onAddFriend={async (targetId) => {
              if (!currentUser) return false;
              await api.sendFriendRequest(currentUser.id, targetId);
              await api.addFriend(currentUser.id, targetId);
              alert('Friend added! Check your Profile -> Friends tab.');
              return true;
            }}
          />
        </main>
      )}

      {/* MAIN GAMEPLAY TABLE (ALL MODES) */}
      {gameState.currentPhase !== 'SETUP' && (
        <main className="game-table">
          {/* Opponents Row (Always Bot at top in Bot mode) */}
          <section className="opponents-row" aria-label="Opponent player hands">
            {opponentPlayers.map((opp) => (
              <PlayerMat
                key={opp.id}
                player={opp}
                isActiveTurn={gameState.currentPlayerIndex === gameState.players.indexOf(opp)}
                isSelf={false}
                highlightedIndices={botHighlightedIndices}
              />
            ))}
          </section>

          {/* Center Arena */}
          <section className="table-center-arena" aria-label="Center Table Area">
            {/* Turn Announcement Banner */}
            <div className="active-turn-banner">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Active Turn
              </span>
              <span className="turn-player-name">{activePlayer?.displayName}</span>
              <span className="turn-instruction">
                {selectedMode === 'system' && gameState.currentPlayerIndex === 1
                  ? '🤖 System AI is making its move...'
                  : !isMyTurnInNetwork && activeRoom
                  ? `Waiting for ${activePlayer?.displayName}...`
                  : isReplacingFromDiscardMode
                  ? `Click any card in your hand to replace it with ${topDiscard?.rank} (${topDiscard?.pointValue} pts) from Discard.`
                  : isReplacingMode
                  ? 'Click any card in your hand below to replace it.'
                  : gameState.currentPhase === 'CARD_DRAWN'
                  ? 'Choose an action for your drawn card below.'
                  : topDiscard
                  ? 'Draw a card, replace a card with discard, attempt matching elimination, or declare victory.'
                  : 'Draw a card, attempt matching elimination, or declare victory.'}
              </span>
            </div>

            <div className="center-piles-cluster">
              {/* Draw Pile */}
              <div className="deck-pile-slot">
                <span className="deck-pile-label">Draw Pile</span>
                <CardView
                  card={null}
                  isFaceUp={false}
                  label={`Draw pile with ${gameState.drawPile.length} cards remaining`}
                />
                <span className="pile-badge" id="draw-pile-count">
                  {gameState.drawPile.length} cards
                </span>
              </div>

              {/* Drawn Card if active (Hidden from opponents!) */}
              {gameState.pendingDrawnCard && (
                <div className="deck-pile-slot">
                  <span className="deck-pile-label" style={{ color: 'var(--emerald)' }}>
                    {shouldShowDrawnCardFaceUp ? 'Your Drawn Card' : 'Drawn Card (Hidden)'}
                  </span>
                  <CardView
                    card={shouldShowDrawnCardFaceUp ? gameState.pendingDrawnCard : null}
                    isFaceUp={shouldShowDrawnCardFaceUp}
                    label={
                      shouldShowDrawnCardFaceUp
                        ? `Currently drawn: ${gameState.pendingDrawnCard.rank} of ${gameState.pendingDrawnCard.suit}`
                        : 'Drawn card is hidden to other players'
                    }
                  />
                  <span
                    className="pile-badge"
                    style={{
                      color: shouldShowDrawnCardFaceUp ? 'var(--gold-light)' : 'var(--text-muted)',
                      border: shouldShowDrawnCardFaceUp ? undefined : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {shouldShowDrawnCardFaceUp
                      ? `${gameState.pendingDrawnCard.pointValue} pts`
                      : '🔒 Secret Card'}
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
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Eliminated
                </span>
                <span className="eliminated-count">
                  {gameState.eliminatedCards.length}
                </span>
                <span style={{ fontSize: '0.72rem' }}>Removed</span>
              </div>
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
                    setIsReplacingFromDiscardMode(false);
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

                {topDiscard && selectedMode !== 'system' && (
                  <button
                    type="button"
                    className={`action-btn ${isReplacingFromDiscardMode ? 'action-btn-neutral' : 'action-btn-draw'}`}
                    onClick={() => {
                      setIsReplacingFromDiscardMode(!isReplacingFromDiscardMode);
                    }}
                    id="replace-card-btn"
                  >
                    🔄 {isReplacingFromDiscardMode ? 'Cancel Replacement' : `Replace the Card (${topDiscard.pointValue} pts)`}
                  </button>
                )}

                {topDiscard && (
                  <button
                    type="button"
                    className="action-btn action-btn-eliminate"
                    disabled={selectedMode === 'system' && gameState.currentPlayerIndex === 1}
                    onClick={() => {
                      setIsReplacingFromDiscardMode(false);
                      if (activeRoom) {
                        setGameState((prev) => ({
                          ...prev,
                          currentPhase: 'SELECT_ELIMINATION',
                          selectedEliminationIndices: [],
                        }));
                      } else {
                        try {
                          if (engine.getState().currentPhase === 'TURN_START') {
                            engine.startElimination();
                            syncEngineState();
                          }
                        } catch (err: any) {
                          console.warn('Cannot start elimination:', err);
                        }
                      }
                    }}
                    id="start-elimination-btn"
                  >
                    ⚡ Match Discard ({topDiscard.rank})
                  </button>
                )}

                {gameState.firstRoundCompleted && (
                  <button
                    type="button"
                    className="action-btn action-btn-declare"
                    disabled={selectedMode === 'system' && gameState.currentPlayerIndex === 1}
                    onClick={() => {
                      setIsReplacingFromDiscardMode(false);
                      setShowDeclareVictoryConfirm(true);
                    }}
                    id="declare-victory-btn"
                  >
                    🏆 Declare Victory
                  </button>
                )}
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
                      if (activeRoom) {
                        setGameState((prev) => ({ ...prev, currentPhase: 'SPECIAL_ABILITY_7' }));
                      } else {
                        try {
                          engine.startAbility7();
                          syncEngineState();
                        } catch (err: any) {
                          console.warn('Cannot start ability 7:', err);
                        }
                      }
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
                      if (activeRoom) {
                        setGameState((prev) => ({ ...prev, currentPhase: 'SPECIAL_ABILITY_8' }));
                      } else {
                        try {
                          engine.startAbility8();
                          syncEngineState();
                        } catch (err: any) {
                          console.warn('Cannot start ability 8:', err);
                        }
                      }
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
                      if (activeRoom) {
                        setGameState((prev) => ({ ...prev, currentPhase: 'SPECIAL_ABILITY_JACK' }));
                      } else {
                        try {
                          engine.startAbilityJack();
                          syncEngineState();
                        } catch (err: any) {
                          console.warn('Cannot start ability Jack:', err);
                        }
                      }
                    }}
                    id="use-ability-jack-btn"
                  >
                    🔀 Use Jack Ability (Blind Exchange)
                  </button>
                )}
              </>
            )}
          </section>

          {/* Local Human Player Mat (Always at bottom in Bot Mode) */}
          {localPlayer && (
            <PlayerMat
              player={localPlayer}
              isActiveTurn={gameState.currentPlayerIndex === gameState.players.indexOf(localPlayer)}
              isSelf={true}
              highlightedIndices={humanHighlightedIndices}
              interactive={(isReplacingMode || isReplacingFromDiscardMode) && isMyTurnInNetwork}
              prompt={
                isReplacingFromDiscardMode
                  ? `Click the card position in your hand to replace with ${topDiscard?.rank} (${topDiscard?.pointValue} pts).`
                  : isReplacingMode
                  ? 'Click the card position you want to replace.'
                  : undefined
              }
              onCardClick={(index) => {
                if (isReplacingFromDiscardMode) {
                  if (activeRoom) {
                    socket.emit('room_action', {
                      roomCode: activeRoom.roomCode,
                      actionType: 'REPLACE_FROM_DISCARD',
                      payload: { positionIndex: index },
                    });
                  } else {
                    engine.replaceCardFromDiscard(index);
                    syncEngineState();
                  }
                  setIsReplacingFromDiscardMode(false);
                } else if (isReplacingMode) {
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
            if (activeRoom) {
              setGameState((prev) => ({
                ...prev,
                currentPhase: 'CARD_DRAWN',
                jackSelection: null,
              }));
            } else {
              try {
                const state = engine.getState();
                state.currentPhase = 'CARD_DRAWN';
                state.jackSelection = null;
                engine.loadState(state);
                syncEngineState();
              } catch (err: any) {
                console.warn('Cannot cancel Jack selection:', err);
              }
            }
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
              try {
                engine.attemptElimination(selectedIndices);
                syncEngineState();
              } catch (err: any) {
                console.warn('Cannot attempt elimination:', err);
              }
            }
          }}
          onCancel={() => {
            if (activeRoom) {
              setGameState((prev) => ({
                ...prev,
                currentPhase: 'TURN_START',
                selectedEliminationIndices: [],
              }));
            } else {
              try {
                engine.cancelElimination();
                syncEngineState();
              } catch (err: any) {
                console.warn('Cannot cancel elimination:', err);
              }
            }
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
              try {
                engine.declareVictory();
                syncEngineState();
              } catch (err: any) {
                console.warn('Cannot declare victory:', err);
              }
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
            setMyGamePlayerId(null);
            aiBotRef.current = null;
            isAiThinkingRef.current = false;
            const fresh = engine.reset();
            setGameState(fresh);
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch {}
          }}
        />
      )}

      {/* RULES MODAL */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* REFRESH IN-GAME WARNING TOAST */}
      {refreshWarning && (
        <div className="refresh-warning-toast" id="refresh-warning-toast">
          <div className="refresh-warning-content">
            <span className="refresh-warning-icon">⚠️</span>
            <span className="refresh-warning-text">{refreshWarning}</span>
          </div>
          <button
            type="button"
            className="refresh-warning-close"
            onClick={() => setRefreshWarning(null)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}

      {/* SESSION TERMINATED DUE TO ANOTHER CONNECTION FROM SAME IP */}
      {sessionTerminatedMessage && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content session-terminated-modal" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ color: '#f87171', marginBottom: '12px', fontSize: '1.35rem' }}>Session Logged Out</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '22px' }}>
              {sessionTerminatedMessage}
            </p>
            <button
              type="button"
              className="action-btn action-btn-declare"
              style={{ width: '100%', padding: '12px 18px', fontSize: '1rem' }}
              onClick={() => {
                setSessionTerminatedMessage(null);
                if (!socket.connected) socket.connect();
              }}
              id="session-terminated-ok-btn"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
