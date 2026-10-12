import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameEngine } from './engine/gameEngine';
import { AIBot } from './engine/aiBot';
import type { GameState } from './types/game';
import type { UserProfile, RoomPlayerInfo } from './types/user';
import { api, socket } from './services/api';
import { logger } from './services/logger';

import { Header } from './components/Header';
import { BottomBar } from './components/BottomBar';
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

import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ModeSelect } from './components/ModeSelect';
import type { GamePlayMode } from './components/ModeSelect';
import { LobbyRoom } from './components/LobbyRoom';
import { MultiplayerRoomModal } from './components/MultiplayerRoomModal';
import { InvitationToast } from './components/InvitationToast';
import { FriendRequestToast } from './components/FriendRequestToast';

import { soundManager } from './services/soundManager';

const USER_SESSION_KEY = 'six_cards_user_session_v1';
const USER_STORAGE_KEY = 'six_cards_user_profile_v1';
const LOCAL_STORAGE_KEY = 'six_cards_game_state_v1';

export const App: React.FC = () => {
  // User Profile State
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

  // Audio Toggles from SoundManager
  const [isMusicOn, setIsMusicOn] = useState(() => soundManager.getMusicStatus());
  const [isSoundOn, setIsSoundOn] = useState(() => soundManager.getSoundStatus());

  // Active UI Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [showRoomDrawer, setShowRoomDrawer] = useState(false);
  const [showActionLog, setShowActionLog] = useState(false);
  const [showDeclareVictoryConfirm, setShowDeclareVictoryConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isReplacingMode, setIsReplacingMode] = useState(false);
  const [isReplacingFromDiscardMode, setIsReplacingFromDiscardMode] = useState(false);

  // Sound Synthesizer Helper
  const playSfx = (type: 'click' | 'deal' | 'victory' | 'eliminate') => {
    if (type === 'click') soundManager.playClick();
    else if (type === 'deal') soundManager.playCardDraw();
    else if (type === 'victory') soundManager.playVictory();
    else if (type === 'eliminate') soundManager.playEliminate();
  };

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
            const decision = aiBot.decideTurnStartAction(engine, false);
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
    playSfx('deal');
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

  // Mode 2: Create Room (LAN, Online Team, or Multiplayer)
  const handleCreateRoom = (mode: 'lan' | 'online_team' | 'multiplayer' = 'online_team', maxPlayers: number = 4) => {
    if (!currentUser) return;
    playSfx('click');
    socket.emit(
      'create_room',
      {
        userId: currentUser.id,
        displayName: currentUser.username,
        avatar: currentUser.avatar,
        mode,
        maxPlayers,
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
          setShowMultiplayerModal(false);
        } else {
          alert(res.error || 'Failed to create room');
        }
      }
    );
  };

  // Join Room by Code
  const handleJoinRoom = (codeToJoin?: string) => {
    const code = (codeToJoin || joinRoomCodeInput).trim().toUpperCase();
    if (!code || !currentUser) return;
    playSfx('click');
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
          setShowMultiplayerModal(false);
          setShowRoomDrawer(false);
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
    playSfx('deal');
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
              message: `Invite sent to ${res.targetName || targetId}!`,
            });
          } else {
            resolve({
              success: false,
              message: res?.error || 'Failed to send invite.',
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

  // Logout action
  const handleLogout = () => {
    soundManager.stopAmbientMusic();
    const freshState = engine.reset();
    setGameState(freshState);
    setSelectedMode(null);
    setActiveRoom(null);
    setMyGamePlayerId(null);
    aiBotRef.current = null;
    isAiThinkingRef.current = false;
    setShowProfile(false);
    setShowRules(false);
    setShowMultiplayerModal(false);
    setShowRoomDrawer(false);
    setShowActionLog(false);
    setShowDeclareVictoryConfirm(false);
    setShowExitConfirm(false);
    setIsReplacingMode(false);
    setIsReplacingFromDiscardMode(false);
    try {
      sessionStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    setCurrentUser(null);
  };

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const topDiscard = gameState.discardPile.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // Local human player identification
  const localPlayer = activeRoom && myGamePlayerId
    ? gameState.players.find((p) => p.id === myGamePlayerId) || activePlayer
    : selectedMode === 'system'
    ? gameState.players[0]
    : activePlayer;

  const opponentPlayers = gameState.players.filter((p) => p.id !== localPlayer?.id);

  // In Networked Mode, determine if it is the current client's turn
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

  const shouldShowDrawnCardFaceUp = Boolean(
    isMyTurnInNetwork && !gameState.pendingDrawnCard?.id.startsWith('hidden')
  );

  if (!currentUser) {
    return (
      <div className="phone-wrapper">
        <AuthModal
          onSuccess={(u) => {
            setCurrentUser(u);
            try {
              sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(u));
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
            } catch {}
            // Start game audio & ambient lounge music only once entering game lobby
            soundManager.warmUpAudio();
            soundManager.playClick();
            if (isMusicOn) {
              soundManager.startAmbientMusic();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="phone-wrapper">

      {/* HEADER BAR (Six Cards, 6-Dots button, Smiley Avatar) */}
      <Header
        roundNumber={gameState.roundNumber}
        firstRoundCompleted={gameState.firstRoundCompleted}
        onOpenRules={() => {
          soundManager.playClick();
          setShowRules(true);
        }}
        onRestartGame={() => {
          if (window.confirm('Leave current game?')) {
            logger.info('GAME', 'Player left current game');
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
        onOpenProfile={() => {
          soundManager.playClick();
          setShowProfile(true);
        }}
      />

      <div className="app-content-area">

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
            onUpdateAvatar={(newAvatar) => {
              const updated = { ...currentUser, avatar: newAvatar };
              setCurrentUser(updated);
              sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(updated));
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
            }}
          />
        )}

        {/* MULTIPLAYER ROOM SELECTION MODAL */}
        <MultiplayerRoomModal
          isOpen={showMultiplayerModal}
          onClose={() => setShowMultiplayerModal(false)}
          onCreateRoom={(mode, max) => handleCreateRoom(mode, max)}
          onJoinRoom={(code) => handleJoinRoom(code)}
          onlinePlayersCount={onlinePlayers.length}
          onlinePlayers={onlinePlayers}
          currentUserId={currentUser?.id}
        />

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
                alert(`🎉 You and ${targetName} are now friends!`);
              }
            }}
            onDecline={() => setIncomingFriendRequest(null)}
          />
        )}

        {/* SCREEN 1: MODE SELECTION & SETUP */}
        {gameState.currentPhase === 'SETUP' && !activeRoom && (
          <main className="setup-scroll-content">
            {/* Mode Selection Cards: Play with Bot / Multiplayer Online */}
            <ModeSelect
              onSelectMode={(mode) => {
                if (mode === 'system') {
                  startSystemMatch();
                } else if (mode === 'multiplayer' || mode === 'online_team' || mode === 'lan') {
                  setShowMultiplayerModal(true);
                } else {
                  setSelectedMode('pass_and_play');
                }
              }}
            />

            {/* Classic Pass-and-Play Option */}
            {selectedMode === 'pass_and_play' && (
              <div style={{ marginTop: 12, padding: 14, background: 'var(--bg-surface)', borderRadius: 16 }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--blue-sky)', marginBottom: 8 }}>
                  Pass-and-Play Setup
                </h3>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className="game-action-btn"
                      style={{
                        backgroundColor: playerCount === num ? 'var(--blue-primary)' : undefined,
                      }}
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
                <button
                  type="button"
                  className="primary-blue-btn"
                  onClick={() => {
                    engine.initializeGame({ playerNames });
                    syncEngineState();
                  }}
                >
                  Deal Cards
                </button>
              </div>
            )}
          </main>
        )}

        {/* MULTIPLAYER LOBBY ROOM SCREEN */}
        {gameState.currentPhase === 'SETUP' && activeRoom && (
          <main className="setup-scroll-content">
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

        {/* SCREEN 3: GAMEPLAY ARENA */}
        {gameState.currentPhase !== 'SETUP' && (
          <main className="gameplay-screen">
            {/* TOP PLAYER: OPPONENT ("Bot" in single player or opponents in multiplayer) */}
            <section
              aria-label="Opponent Player Area"
              style={{
                display: 'flex',
                flexDirection: opponentPlayers.length > 1 ? 'row' : 'column',
                overflowX: opponentPlayers.length > 1 ? 'auto' : 'visible',
                gap: 8,
                paddingBottom: opponentPlayers.length > 1 ? 4 : 0,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {opponentPlayers.map((opp) => (
                <div
                  key={opp.id}
                  style={{
                    minWidth: opponentPlayers.length > 1 ? '85%' : '100%',
                    flex: opponentPlayers.length > 1 ? '0 0 auto' : '1 1 auto',
                  }}
                >
                  <PlayerMat
                    player={opp}
                    isActiveTurn={gameState.currentPlayerIndex === gameState.players.indexOf(opp)}
                    isSelf={false}
                    highlightedIndices={botHighlightedIndices}
                  />
                </div>
              ))}
            </section>

            {/* Active Turn Announcement Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 12px',
                background: isMyTurnInNetwork ? 'rgba(37, 99, 235, 0.22)' : 'rgba(15, 23, 42, 0.65)',
                border: isMyTurnInNetwork ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                margin: '4px 0',
                fontSize: '0.74rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: isMyTurnInNetwork ? '#38bdf8' : '#94a3b8', fontWeight: 800 }}>
                  {isMyTurnInNetwork ? '🎯 YOUR TURN' : `⏳ ${activePlayer?.displayName || 'Opponent'}'s Turn`}
                </span>
              </div>
              <span
                style={{
                  color: '#cbd5e1',
                  fontSize: '0.72rem',
                  maxWidth: '62%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'right',
                }}
              >
                {selectedMode === 'system' && gameState.currentPlayerIndex === 1
                  ? '🤖 Bot is thinking...'
                  : !isMyTurnInNetwork && activeRoom
                  ? 'Waiting for move...'
                  : isReplacingFromDiscardMode
                  ? 'Tap hand card to swap with discard'
                  : isReplacingMode
                  ? 'Tap hand card to swap with drawn'
                  : gameState.currentPhase === 'CARD_DRAWN'
                  ? 'Choose action below'
                  : topDiscard
                  ? 'Draw card or match discard'
                  : 'Draw card to play'}
              </span>
            </div>

            {/* CENTER ARENA: 3 AREAS (LEFT: DRAW PILE, MIDDLE: DRAWN CARD, RIGHT: DISCARD PILE) */}
            <section className="center-field-arena" aria-label="Center Field Arena">
              {/* LEFT AREA: DRAW PILE (STARTS WITH 40 CARDS) */}
              <div
                className="center-slot-column"
                onClick={() => {
                  if (gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork) {
                    playSfx('deal');
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
                  }
                }}
                style={{ cursor: gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork ? 'pointer' : 'default' }}
              >
                <div className="center-card-frame-wrapper">
                  <CardView
                    card={null}
                    isFaceUp={false}
                    size="medium"
                    cardTheme="question"
                    interactive={gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork}
                    label={`Draw pile with ${gameState.drawPile.length} cards`}
                  />
                </div>
                <span className="center-slot-label-bottom">{gameState.drawPile.length} Cards</span>
              </div>

              {/* MIDDLE AREA: NEWLY DRAWN CARD (INSPECT & CHOOSE ACTION) */}
              <div className="center-slot-column">
                <div className="center-card-frame-wrapper">
                  {gameState.pendingDrawnCard ? (
                    <CardView
                      card={shouldShowDrawnCardFaceUp ? gameState.pendingDrawnCard : null}
                      isFaceUp={shouldShowDrawnCardFaceUp}
                      size="medium"
                      cardTheme="light"
                      label={
                        shouldShowDrawnCardFaceUp
                          ? `Drawn: ${gameState.pendingDrawnCard.rank} (${gameState.pendingDrawnCard.pointValue} pts)`
                          : 'Drawn Card'
                      }
                    />
                  ) : (
                    <div
                      className="card-frame size-medium is-face-down"
                      style={{
                        border: '2px dashed rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        borderRadius: '10px',
                        padding: '4px',
                      }}
                    >
                      Drawn Card
                    </div>
                  )}
                </div>
                <span className="center-slot-label-bottom">
                  {gameState.pendingDrawnCard && shouldShowDrawnCardFaceUp
                    ? `${gameState.pendingDrawnCard.pointValue} pts`
                    : 'Middle Area'}
                </span>
              </div>

              {/* RIGHT AREA: DISCARD PILE (VISIBLE, USED FOR ELIMINATION) */}
              <div
                className="center-slot-column"
                onClick={() => {
                  if (selectedMode !== 'system' && gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork && topDiscard) {
                    soundManager.playClick();
                    setIsReplacingFromDiscardMode(!isReplacingFromDiscardMode);
                  }
                }}
              >
                <div className="center-card-frame-wrapper">
                  {topDiscard ? (
                    <CardView
                      card={topDiscard}
                      isFaceUp
                      size="medium"
                      label={`Discard pile top: ${topDiscard.rank}`}
                    />
                  ) : (
                    <div
                      className="card-frame size-medium is-face-down"
                      style={{
                        border: '2px dashed rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontSize: '0.75rem',
                        borderRadius: '10px',
                      }}
                    >
                      Empty
                    </div>
                  )}
                </div>
                <span className="center-slot-label-bottom">
                  {topDiscard ? `Discard (${topDiscard.rank})` : 'Discard (0)'}
                </span>
              </div>
            </section>

            {/* ACTION BUTTONS STRIP */}
            <section className="action-buttons-strip" aria-label="Game Actions">
              {gameState.currentPhase === 'TURN_START' && isMyTurnInNetwork && (
                <>
                  <button
                    type="button"
                    className="game-action-btn btn-primary"
                    onClick={() => {
                      playSfx('deal');
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
                      className={`game-action-btn ${isReplacingFromDiscardMode ? 'btn-primary' : ''}`}
                      onClick={() => setIsReplacingFromDiscardMode(!isReplacingFromDiscardMode)}
                      id="replace-card-btn"
                    >
                      🔄 {isReplacingFromDiscardMode ? 'Cancel' : `Replace (${topDiscard.pointValue}p)`}
                    </button>
                  )}

                  <button
                    type="button"
                    className="game-action-btn"
                    disabled={!topDiscard}
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
                    ⚡ Match Discard
                  </button>

                  {gameState.firstRoundCompleted && (
                    <button
                      type="button"
                      className="game-action-btn btn-gold"
                      onClick={() => {
                        setIsReplacingFromDiscardMode(false);
                        setShowDeclareVictoryConfirm(true);
                      }}
                      id="declare-victory-btn"
                    >
                      🏆 Victory
                    </button>
                  )}
                </>
              )}

              {gameState.currentPhase === 'CARD_DRAWN' && gameState.pendingDrawnCard && isMyTurnInNetwork && (
                <>
                  <button
                    type="button"
                    className={`game-action-btn ${isReplacingMode ? 'btn-primary' : ''}`}
                    onClick={() => setIsReplacingMode(!isReplacingMode)}
                    id="toggle-replace-btn"
                  >
                    🔄 {isReplacingMode ? 'Cancel' : 'Replace in Hand'}
                  </button>

                  <button
                    type="button"
                    className="game-action-btn"
                    onClick={() => {
                      playSfx('click');
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
                    🗑️ Discard
                  </button>

                  {gameState.pendingDrawnCard.rank === '7' && (
                    <button
                      type="button"
                      className="game-action-btn btn-primary"
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
                      👁️ Peek Own (7)
                    </button>
                  )}

                  {gameState.pendingDrawnCard.rank === '8' && (
                    <button
                      type="button"
                      className="game-action-btn btn-primary"
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
                      👁️ Peek Opponent (8)
                    </button>
                  )}

                  {gameState.pendingDrawnCard.rank === 'J' && (
                    <button
                      type="button"
                      className="game-action-btn btn-primary"
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
                      🔀 Blind Exchange (J)
                    </button>
                  )}
                </>
              )}
            </section>

            {/* BOTTOM PLAYER: "YOU" */}
            {localPlayer && (
              <PlayerMat
                player={localPlayer}
                isActiveTurn={gameState.currentPlayerIndex === gameState.players.indexOf(localPlayer)}
                isSelf={true}
                highlightedIndices={humanHighlightedIndices}
                interactive={(isReplacingMode || isReplacingFromDiscardMode) && isMyTurnInNetwork}
                prompt={
                  isReplacingFromDiscardMode
                    ? `Tap position to replace with ${topDiscard?.rank}.`
                    : isReplacingMode
                    ? 'Tap position to replace.'
                    : undefined
                }
                onMenuClick={() => setShowActionLog(!showActionLog)}
                onCardClick={(index) => {
                  playSfx('click');
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

            {/* DRAWER ACTION LOG */}
            {showActionLog && gameState.actionHistory.length > 0 && (
              <div className="action-log-drawer">
                {gameState.actionHistory.slice(-3).map((entry, idx) => (
                  <div key={entry.id || idx}>{entry.text}</div>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <BottomBar
        isMusicOn={isMusicOn}
        onToggleMusic={() => {
          const next = soundManager.toggleMusic();
          setIsMusicOn(next);
        }}
        isSoundOn={isSoundOn}
        onToggleSound={() => {
          const next = soundManager.toggleSound();
          setIsSoundOn(next);
        }}
        showRoomButton={gameState.currentPhase === 'SETUP'}
        onRoomClick={() => {
          soundManager.playClick();
          if (activeRoom) {
            alert(`Current Room: ${activeRoom.roomCode} (${activeRoom.players.length} players)`);
          } else {
            setShowRoomDrawer(true);
          }
        }}
        onExitClick={() => {
          soundManager.playClick();
          setShowExitConfirm(true);
        }}
      />

        {/* ROOM POPUP DRAWER */}
        {showRoomDrawer && (
          <div className="modal-backdrop" onClick={() => setShowRoomDrawer(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3 style={{ fontSize: '1.15rem' }}>Multiplayer Room</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowRoomDrawer(false)}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  type="text"
                  className="phone-text-input"
                  placeholder="ENTER ROOM CODE (e.g. 7K2X)"
                  value={joinRoomCodeInput}
                  onChange={(e) => setJoinRoomCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="primary-blue-btn"
                  onClick={() => handleJoinRoom()}
                >
                  Join Room
                </button>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  — or create your own —
                </div>
                <button
                  type="button"
                  className="secondary-ghost-btn"
                  onClick={() => {
                    setShowRoomDrawer(false);
                    handleCreateRoom('online_team');
                  }}
                >
                  Create New Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: INITIAL MEMORIZATION MODAL */}
        {gameState.currentPhase === 'INITIAL_MEMORIZATION' &&
          gameState.initialMemorizationPlayerIndex >= 0 &&
          (!activeRoom || (activeRoom && myGamePlayerId === `player-${gameState.initialMemorizationPlayerIndex + 1}`)) &&
          (selectedMode !== 'system' || gameState.initialMemorizationPlayerIndex === 0) && (
            <InitialMemorizeModal
              playerName={
                gameState.players[gameState.initialMemorizationPlayerIndex]?.displayName || 'You'
              }
              cards={
                gameState.players[gameState.initialMemorizationPlayerIndex]?.cards || []
              }
              onFinishMemorization={(selectedIndices) => {
                playSfx('click');
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

        {/* EXIT CONFIRMATION MODAL */}
        {showExitConfirm && (
          <div className="modal-backdrop" onClick={() => setShowExitConfirm(false)}>
            <div
              className="modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 330, textAlign: 'center' }}
            >
              <h3 style={{ fontSize: '1.2rem', marginBottom: 10 }}>Exit to Menu?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
                Are you sure you want to exit the current match and return to the main menu?
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="secondary-ghost-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    soundManager.playClick();
                    setShowExitConfirm(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-blue-btn"
                  id="confirm-exit-btn"
                  style={{ flex: 1, backgroundColor: 'var(--red-accent)', borderColor: 'transparent' }}
                  onClick={() => {
                    soundManager.playClick();
                    setShowExitConfirm(false);
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
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default App;
