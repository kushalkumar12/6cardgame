import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GameEngine } from '../src/engine/gameEngine';
import type { GameState } from '../src/types/game';
import { config, printProfileBanner } from './config/profiles';
import { getDatabase } from './db/database';
import { UserRepository } from './db/repositories/userRepo';
import { RoomRepository } from './db/repositories/roomRepo';
import { GameHistoryRepository } from './db/repositories/historyRepo';
import { ConnectionRepository } from './db/repositories/connectionRepo';

const app = express();
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

import { ensureDatabaseExists } from './db/createDatabase';

// Initialize Database and Schema on boot
async function initServerDatabase() {
  if (config.isDev && (config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1'))) {
    try {
      await ensureDatabaseExists();
    } catch {
      // Continue to getDatabase()
    }
  }
  await getDatabase();
}

initServerDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
});

// --- REST API ENDPOINTS ---

// Health & Environment Profile Status
app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDatabase();
    res.json({
      status: 'healthy',
      profile: config.profile,
      database: db.isUsingMock() ? 'in-memory-sql' : 'postgresql',
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Auth / Profile Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, authProvider = 'guest', googleProfile, referralCodeInput } = req.body;
    const name =
      username?.trim() ||
      (googleProfile ? googleProfile.name : `Player_${Math.floor(1000 + Math.random() * 9000)}`);

    // Check if user exists by username
    let user = await UserRepository.findByUsername(name);

    if (!user) {
      const id = `P-${Math.floor(1000 + Math.random() * 9000)}`;
      const referralCode = `REF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      let referredBy: string | null = null;
      if (referralCodeInput) {
        const matches = await UserRepository.search(referralCodeInput);
        const referrer = matches.find((m) => m.referral_code === referralCodeInput.toUpperCase());
        if (referrer) {
          referredBy = referrer.id;
          await UserRepository.incrementReferrals(referrer.id);
          await UserRepository.updateChips(referrer.id, referrer.chips + 200);
        }
      }

      user = await UserRepository.create({
        id,
        username: name,
        avatar: ['🃏', '♠️', '💎', '🔥', '🦁', '👑'][Math.floor(Math.random() * 6)],
        auth_provider: authProvider,
        referral_code: referralCode,
        referred_by: referredBy,
        referral_count: 0,
        chips: 500,
      });
    }

    const stats = await UserRepository.getStats(user.id);
    const friends = await UserRepository.getFriends(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        authProvider: user.auth_provider,
        referralCode: user.referral_code,
        referredBy: user.referred_by,
        referralCount: user.referral_count,
        chips: user.chips,
        stats: {
          gamesPlayed: stats.games_played,
          gamesWon: stats.games_won,
          bestScore: stats.best_score,
          zeroCardWins: stats.zero_card_wins,
        },
        friendIds: friends.map((f) => f.id),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Profile & Stats
app.get('/api/users/profile/:id', async (req, res) => {
  try {
    const user = await UserRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = await UserRepository.getStats(user.id);
    const friends = await UserRepository.getFriends(user.id);

    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      authProvider: user.auth_provider,
      referralCode: user.referral_code,
      referredBy: user.referred_by,
      referralCount: user.referral_count,
      chips: user.chips,
      stats: {
        gamesPlayed: stats.games_played,
        gamesWon: stats.games_won,
        bestScore: stats.best_score,
        zeroCardWins: stats.zero_card_wins,
      },
      friendIds: friends.map((f) => f.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search players by ID or username
app.get('/api/users/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json([]);

    const users = await UserRepository.search(query);
    const results = await Promise.all(
      users.slice(0, 10).map(async (u) => {
        const stats = await UserRepository.getStats(u.id);
        return {
          id: u.id,
          username: u.username,
          avatar: u.avatar,
          stats: {
            gamesPlayed: stats.games_played,
            gamesWon: stats.games_won,
            bestScore: stats.best_score,
            zeroCardWins: stats.zero_card_wins,
          },
        };
      })
    );

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Friends list
app.get('/api/friends/list/:userId', async (req, res) => {
  try {
    const friends = await UserRepository.getFriends(req.params.userId);
    const onlineIds = await ConnectionRepository.getOnlineUserIds();
    const onlineSet = new Set(onlineIds);

    const result = await Promise.all(
      friends.map(async (f) => {
        const stats = await UserRepository.getStats(f.id);
        return {
          id: f.id,
          username: f.username,
          avatar: f.avatar,
          stats: {
            gamesPlayed: stats.games_played,
            gamesWon: stats.games_won,
            bestScore: stats.best_score,
            zeroCardWins: stats.zero_card_wins,
          },
          online: onlineSet.has(f.id),
        };
      })
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Friend by Player ID
app.post('/api/friends/add', async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    if (userId === targetId) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    const [user, target] = await Promise.all([
      UserRepository.findById(userId),
      UserRepository.findById(targetId),
    ]);

    if (!user || !target) {
      return res.status(404).json({ error: 'Player ID not found' });
    }

    await UserRepository.addFriend(userId, targetId);

    // Notify connected sockets of both users in real time
    const userSids = userSockets.get(userId) ? Array.from(userSockets.get(userId)!) : [];
    const targetSids = userSockets.get(targetId) ? Array.from(userSockets.get(targetId)!) : [];
    [...userSids, ...targetSids].forEach((sid) => {
      io.to(sid).emit('friend_list_updated', { userId, targetId });
    });

    res.json({
      success: true,
      friend: { id: target.id, username: target.username, avatar: target.avatar },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Refer Code validation
app.post('/api/refer/use', async (req, res) => {
  try {
    const { userId, referralCode } = req.body;
    const user = await UserRepository.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.referred_by) {
      return res.status(400).json({ error: 'Referral code already used' });
    }

    const matches = await UserRepository.search(referralCode);
    const referrer = matches.find(
      (u) => u.referral_code === referralCode.trim().toUpperCase() && u.id !== userId
    );

    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    await UserRepository.create({
      ...user,
      referred_by: referrer.id,
      chips: user.chips + 100,
    });
    await UserRepository.incrementReferrals(referrer.id);
    await UserRepository.updateChips(referrer.id, referrer.chips + 200);

    res.json({ success: true, rewardChips: 100, referrerName: referrer.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Scoreboard / Global Leaderboard (SQL query)
app.get('/api/scoreboard', async (_req, res) => {
  try {
    const allUsers = await UserRepository.getAll();
    const withStats = await Promise.all(
      allUsers.map(async (u) => {
        const stats = await UserRepository.getStats(u.id);
        return {
          id: u.id,
          username: u.username,
          avatar: u.avatar,
          stats: {
            gamesPlayed: stats.games_played,
            gamesWon: stats.games_won,
            bestScore: stats.best_score,
            zeroCardWins: stats.zero_card_wins,
          },
          chips: u.chips,
        };
      })
    );

    const sorted = withStats
      .sort((a, b) => b.stats.gamesWon - a.stats.gamesWon || a.stats.bestScore - b.stats.bestScore)
      .slice(0, 15);

    res.json(sorted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Game History (SQL query)
app.get('/api/history', async (_req, res) => {
  try {
    const recent = await GameHistoryRepository.getRecent(15);
    res.json(recent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Online players list
app.get('/api/online-players', async (req, res) => {
  try {
    const exclude = req.query.exclude as string | undefined;
    const onlineIds = await ConnectionRepository.getOnlineUserIds();
    const users = await Promise.all(
      onlineIds.filter((id) => id !== exclude).map((id) => UserRepository.findById(id))
    );
    const valid = users.filter(Boolean).map((u) => ({
      id: u!.id,
      username: u!.username,
      avatar: u!.avatar,
    }));
    res.json(valid);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- REAL-TIME ROOMS & MULTIPLAYER (SQL & WEBSOCKETS) ---

interface RoomPlayer {
  socketId: string;
  userId: string;
  displayName: string;
  avatar: string;
  ready: boolean;
  isHost: boolean;
  gamePlayerId?: string;
}

interface ActiveRoom {
  roomCode: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
  engine: GameEngine | null;
  startTime?: number;
}

const activeRooms: Record<string, ActiveRoom> = {};

function sanitizeStateForPlayer(state: GameState, clientGamePlayerId?: string): any {
  const clean = JSON.parse(JSON.stringify(state));
  if (clean.gameOver) return clean; // Reveal all hands on game over

  clean.players = clean.players.map((p: any) => {
    if (p.id !== clientGamePlayerId) {
      p.cards = p.cards.map((_c: any, cIdx: number) => ({
        id: `hidden-${p.id}-${cIdx}`,
        rank: '?',
        suit: '?',
        pointValue: 0,
      }));
    }
    return p;
  });

  return clean;
}

async function broadcastOnlineList() {
  try {
    const onlineIds = await ConnectionRepository.getOnlineUserIds();
    const users = await Promise.all(onlineIds.map((id) => UserRepository.findById(id)));
    const list = users.filter(Boolean).map((u) => ({
      id: u!.id,
      username: u!.username,
      avatar: u!.avatar,
    }));
    io.emit('online_players_update', list);
  } catch {
    // Suppress broadcast errors
  }
}

// High-performance L1 In-Memory Socket Map (0ms latency lookup) + L2 PostgreSQL Persistence
const userSockets = new Map<string, Set<string>>();

io.on('connection', (socket: Socket) => {
  let currentUserId: string | null = null;
  let currentRoomCode: string | null = null;

  // Register user connection into SQL connections table
  socket.on('register_user', async (payload: any, callback?: Function) => {
    try {
      const userId = typeof payload === 'string' ? payload : payload?.userId;
      const username = typeof payload === 'object' ? payload?.username : undefined;
      const avatar = typeof payload === 'object' ? payload?.avatar : undefined;
      if (!userId) return;

      currentUserId = userId;

      // 1. Instant L1 memory cache update
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);

      // 2. Ensure user exists in SQL users table before adding connections FK
      const existing = await UserRepository.findById(userId);
      if (existing) {
        if (username || avatar) {
          await UserRepository.create({
            ...existing,
            username: username || existing.username,
            avatar: avatar || existing.avatar,
          });
        }
      } else {
        await UserRepository.create({
          id: userId,
          username: username || `Guest-${userId.slice(-4)}`,
          avatar: avatar || '🃏',
          auth_provider: 'guest',
          referral_code: `REF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          referral_count: 0,
          chips: 1000,
        });
      }

      // 3. Persistent L2 SQL table update (now guaranteed FK integrity)
      await ConnectionRepository.register(socket.id, userId);

      io.emit('user_presence_change', { userId, online: true });
      broadcastOnlineList();
      if (typeof callback === 'function') callback({ success: true });
    } catch (err: any) {
      console.error('Error registering user socket:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Request online players list
  socket.on('get_online_players', async (_data: any, callback?: Function) => {
    const onlineIds = await ConnectionRepository.getOnlineUserIds();
    const users = await Promise.all(
      onlineIds.filter((id) => id !== currentUserId).map((id) => UserRepository.findById(id))
    );
    const list = users.filter(Boolean).map((u) => ({
      id: u!.id,
      username: u!.username,
      avatar: u!.avatar,
    }));

    if (typeof callback === 'function') {
      callback(list);
    } else {
      socket.emit('online_players_update', list);
    }
  });

  // Create room (Persisted to SQL `rooms` table)
  socket.on('create_room', async ({ userId, displayName, avatar, maxPlayers = 4 }: any, callback: Function) => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    currentRoomCode = roomCode;

    const hostPlayer: RoomPlayer = {
      socketId: socket.id,
      userId,
      displayName,
      avatar: avatar || '🃏',
      ready: true,
      isHost: true,
    };

    activeRooms[roomCode] = {
      roomCode,
      hostId: userId,
      players: [hostPlayer],
      maxPlayers,
      status: 'lobby',
      engine: null,
    };

    await RoomRepository.create(roomCode, userId, { maxPlayers });
    await RoomRepository.addParticipant(roomCode, userId, socket.id, true);

    socket.join(roomCode);
    callback({ success: true, roomCode, room: activeRooms[roomCode] });
  });

  // Join room by code
  socket.on('join_room', async ({ roomCode, userId, displayName, avatar }: any, callback: Function) => {
    const code = roomCode?.trim().toUpperCase();
    const room = activeRooms[code];

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    if (room.status !== 'lobby') {
      return callback({ success: false, error: 'Game already in progress' });
    }

    if (room.players.length >= room.maxPlayers) {
      return callback({ success: false, error: 'Room is full' });
    }

    const existing = room.players.find((p) => p.userId === userId);
    if (!existing) {
      const newPlayer: RoomPlayer = {
        socketId: socket.id,
        userId,
        displayName,
        avatar: avatar || '🃏',
        ready: false,
        isHost: false,
      };
      room.players.push(newPlayer);
    } else {
      existing.socketId = socket.id;
    }

    currentRoomCode = code;
    await RoomRepository.addParticipant(code, userId, socket.id, false);

    socket.join(code);
    io.to(code).emit('room_updated', room);
    callback({ success: true, roomCode: code, room });
  });

  // Toggle ready status
  socket.on('toggle_ready', ({ roomCode, userId }: any) => {
    const room = activeRooms[roomCode];
    if (!room) return;
    const player = room.players.find((p) => p.userId === userId);
    if (player) {
      player.ready = !player.ready;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  // Invite player with fuzzy matching and SQL socket tracking
  socket.on('invite_player', async ({ roomCode, targetPlayerId, fromName, fromUserId }: any, callback: Function) => {
    if (!targetPlayerId || !targetPlayerId.trim()) {
      return callback({ success: false, error: 'Please enter a valid Player ID or username' });
    }

    const matches = await UserRepository.search(targetPlayerId);
    const targetUser = matches[0];

    if (!targetUser) {
      return callback({
        success: false,
        error: `Player "${targetPlayerId}" was not found. Please check the ID or username.`,
      });
    }

    const memorySockets = userSockets.get(targetUser.id);
    const socketIds = memorySockets ? Array.from(memorySockets) : [];
    if (socketIds.length === 0) {
      return callback({
        success: false,
        error: `${targetUser.username} (${targetUser.id}) is currently offline.`,
      });
    }

    for (const sid of socketIds) {
      io.to(sid).emit('received_invitation', {
        roomCode,
        fromName: fromName || 'A Player',
        fromUserId: fromUserId || currentUserId || '',
        timestamp: Date.now(),
      });
    }

    callback({
      success: true,
      targetName: targetUser.username,
      targetId: targetUser.id,
    });
  });

  // Real-Time Friend Request
  socket.on('send_friend_request', async ({ fromUserId, targetPlayerId }: any, callback?: Function) => {
    try {
      if (!targetPlayerId || !targetPlayerId.trim()) {
        if (typeof callback === 'function') callback({ success: false, error: 'Please enter a valid Player ID or username' });
        return;
      }

      const matches = await UserRepository.search(targetPlayerId);
      const targetUser = matches[0];
      if (!targetUser) {
        if (typeof callback === 'function') callback({ success: false, error: `Player "${targetPlayerId}" not found.` });
        return;
      }

      if (targetUser.id === fromUserId) {
        if (typeof callback === 'function') callback({ success: false, error: 'Cannot add yourself as friend.' });
        return;
      }

      const fromUser = await UserRepository.findById(fromUserId);
      if (!fromUser) {
        if (typeof callback === 'function') callback({ success: false, error: 'Your user profile was not found.' });
        return;
      }

      const memorySockets = userSockets.get(targetUser.id);
      const sids = memorySockets ? Array.from(memorySockets) : [];
      for (const sid of sids) {
        io.to(sid).emit('received_friend_request', {
          fromUserId: fromUser.id,
          fromName: fromUser.username,
          fromAvatar: fromUser.avatar,
          timestamp: Date.now(),
        });
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          targetUser: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar },
          online: sids.length > 0,
        });
      }
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Accept Friend Request
  socket.on('accept_friend_request', async ({ userId, friendId }: any, callback?: Function) => {
    try {
      await UserRepository.addFriend(userId, friendId);

      const userSids = userSockets.get(userId) ? Array.from(userSockets.get(userId)!) : [];
      const friendSids = userSockets.get(friendId) ? Array.from(userSockets.get(friendId)!) : [];
      [...userSids, ...friendSids].forEach((sid) => {
        io.to(sid).emit('friend_list_updated', { userId, friendId });
      });

      if (typeof callback === 'function') callback({ success: true });
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Start game from lobby
  socket.on('start_room_game', async ({ roomCode }: any, callback: Function) => {
    const room = activeRooms[roomCode];
    if (!room) return callback({ success: false, error: 'Room not found' });

    if (room.players.length < 2) {
      return callback({ success: false, error: 'Need at least 2 players to start' });
    }

    const playerNames = room.players.map((p) => p.displayName);
    const engine = new GameEngine({ playerNames });
    room.engine = engine;
    room.status = 'playing';
    room.startTime = Date.now();

    room.players.forEach((p, idx) => {
      p.gamePlayerId = `player-${idx + 1}`;
    });

    const state = engine.getState();
    await RoomRepository.updateState(roomCode, state);

    room.players.forEach((p) => {
      const personalState = sanitizeStateForPlayer(state, p.gamePlayerId);
      io.to(p.socketId).emit('game_started', {
        state: personalState,
        myGamePlayerId: p.gamePlayerId,
        room,
      });
    });

    callback({ success: true });
  });

  // Execute in-game turn action
  socket.on('room_action', async ({ roomCode, actionType, payload }: any) => {
    const room = activeRooms[roomCode];
    if (!room || !room.engine) return;

    const engine = room.engine;

    try {
      if (actionType === 'MEMORIZE') {
        engine.memorizeCards(payload.indices);
        engine.completeMemorizationForPlayer();
        engine.confirmPassDevice();
      } else if (actionType === 'DRAW') {
        engine.drawCard();
      } else if (actionType === 'REPLACE') {
        engine.replaceCard(payload.index);
        engine.confirmPassDevice();
      } else if (actionType === 'REPLACE_FROM_DISCARD') {
        engine.replaceCardFromDiscard(payload.positionIndex);
        engine.confirmPassDevice();
      } else if (actionType === 'DISCARD') {
        engine.discardDrawnCard();
        engine.confirmPassDevice();
      } else if (actionType === 'ABILITY_7') {
        engine.startAbility7();
        engine.executeAbility7(payload.index);
        engine.finishAbility7();
        engine.confirmPassDevice();
      } else if (actionType === 'ABILITY_8') {
        engine.startAbility8();
        engine.executeAbility8(payload.targetOpponentId, payload.index);
        engine.finishAbility8();
        engine.confirmPassDevice();
      } else if (actionType === 'ABILITY_JACK') {
        engine.startAbilityJack();
        engine.setJackSelection(payload.ownIndex, payload.targetOpponentId, payload.targetIndex);
        engine.executeJackExchange();
        engine.confirmPassDevice();
      } else if (actionType === 'ELIMINATE') {
        engine.startElimination();
        const res = engine.attemptElimination(payload.indices);
        if (!res.success) {
          engine.acknowledgePenalty();
        }
        engine.confirmPassDevice();
      } else if (actionType === 'DECLARE_VICTORY') {
        engine.declareVictory();
      }

      const updatedState = engine.getState();
      await RoomRepository.updateState(roomCode, updatedState);

      // Game Over: Record into SQL History & update player stats
      if (updatedState.gameOver) {
        room.status = 'ended';
        await RoomRepository.updateStatus(roomCode, 'FINISHED');

        const now = Date.now();
        const winnerUserIds: string[] = [];

        // Update stats for all participating users in SQL
        await Promise.all(
          room.players.map(async (p, idx) => {
            const gamePlayerId = `player-${idx + 1}`;
            const isWinner = updatedState.winnerIds.includes(gamePlayerId);
            if (isWinner) winnerUserIds.push(p.userId);

            const handScore = updatedState.players[idx]?.cards.reduce(
              (sum, c) => sum + c.pointValue,
              0
            ) ?? 99;
            const isZeroCard = updatedState.endReason === 'ZERO_CARD_AUTOMATIC_VICTORY';

            await UserRepository.recordMatchStats(p.userId, isWinner, handScore, isZeroCard);
            if (isWinner) {
              const u = await UserRepository.findById(p.userId);
              if (u) await UserRepository.updateChips(p.userId, u.chips + 100);
            }
          })
        );

        // Record into SQL `game_history`
        await GameHistoryRepository.record({
          room_code: roomCode,
          mode: 'multiplayer',
          start_time: room.startTime || now,
          end_time: now,
          end_reason: updatedState.endReason || 'UNKNOWN',
          winner_ids: winnerUserIds,
          participants: room.players.map((p, idx) => ({
            userId: p.userId,
            displayName: p.displayName,
            score: updatedState.players[idx]?.cards.reduce((sum, c) => sum + c.pointValue, 0) ?? 0,
            cardsLeft: updatedState.players[idx]?.cards.length ?? 0,
          })),
          round_count: updatedState.roundNumber,
        });
      }

      // Broadcast sanitized personal state to each player
      room.players.forEach((p) => {
        const personalState = sanitizeStateForPlayer(updatedState, p.gamePlayerId);
        io.to(p.socketId).emit('room_state_update', {
          state: personalState,
          myGamePlayerId: p.gamePlayerId,
        });
      });
    } catch (err: any) {
      socket.emit('action_error', { message: err?.message || 'Action failed' });
    }
  });

  socket.on('disconnect', async () => {
    if (currentUserId && userSockets.has(currentUserId)) {
      userSockets.get(currentUserId)!.delete(socket.id);
      if (userSockets.get(currentUserId)!.size === 0) {
        userSockets.delete(currentUserId);
      }
    }
    await ConnectionRepository.remove(socket.id);

    if (currentUserId) {
      const remaining = await ConnectionRepository.getSocketsForUser(currentUserId);
      if (remaining.length === 0) {
        io.emit('user_presence_change', { userId: currentUserId, online: false });
      }
      await broadcastOnlineList();
    }

    if (currentRoomCode && activeRooms[currentRoomCode]) {
      const room = activeRooms[currentRoomCode];
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      if (currentUserId) {
        await RoomRepository.removeParticipant(currentRoomCode, currentUserId);
      }

      if (room.players.length === 0) {
        delete activeRooms[currentRoomCode];
        await RoomRepository.delete(currentRoomCode);
      } else {
        if (room.hostId === currentUserId && room.players.length > 0) {
          room.hostId = room.players[0].userId;
          room.players[0].isHost = true;
        }
        io.to(currentRoomCode).emit('room_updated', room);
      }
    }
  });
});

server.listen(config.port, '0.0.0.0', () => {
  printProfileBanner();
});
