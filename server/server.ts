import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameEngine } from '../src/engine/gameEngine';
import type { GameState } from '../src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

// Helper to get local WiFi/LAN IP
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// User Profile Data Models
export interface UserRecord {
  id: string; // e.g., "P-4821"
  username: string;
  avatar: string;
  authProvider: 'guest' | 'local' | 'google';
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  chips: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    bestScore: number;
    zeroCardWins: number;
  };
  friendIds: string[];
  createdAt: number;
}

interface DBData {
  users: Record<string, UserRecord>;
}

function loadDB(): DBData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    // Return empty on failure
  }
  return { users: {} };
}

function saveDB(data: DBData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save data.json', err);
  }
}

const db = loadDB();

// Pre-populate demo / system users for testing if empty
if (Object.keys(db.users).length === 0) {
  db.users['P-1001'] = {
    id: 'P-1001',
    username: 'System Ace',
    avatar: '👑',
    authProvider: 'local',
    referralCode: 'ACE100',
    referralCount: 4,
    chips: 1500,
    stats: { gamesPlayed: 24, gamesWon: 16, bestScore: 2, zeroCardWins: 3 },
    friendIds: [],
    createdAt: Date.now() - 86400000 * 5,
  };
  db.users['P-1002'] = {
    id: 'P-1002',
    username: 'CardShark_99',
    avatar: '🦈',
    authProvider: 'local',
    referralCode: 'SHARK99',
    referralCount: 2,
    chips: 850,
    stats: { gamesPlayed: 18, gamesWon: 9, bestScore: 4, zeroCardWins: 1 },
    friendIds: [],
    createdAt: Date.now() - 86400000 * 3,
  };
  saveDB(db);
}

// --- REST API ENDPOINTS ---

// Network Info (for Same WiFi Localhost connection)
app.get('/api/network', (_req, res) => {
  const localIp = getLocalIp();
  res.json({
    localIp,
    lanUrl: `http://${localIp}:5173`,
    serverUrl: `http://${localIp}:${PORT}`,
  });
});

// Auth / Profile Login
app.post('/api/auth/login', (req, res) => {
  const { username, authProvider = 'guest', googleProfile, referralCodeInput } = req.body;
  const name = username?.trim() || (googleProfile ? googleProfile.name : `Player_${Math.floor(1000 + Math.random() * 9000)}`);

  // Check if existing user by username
  let user = Object.values(db.users).find((u) => u.username.toLowerCase() === name.toLowerCase());

  if (!user) {
    const id = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    const referralCode = `REF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let referredBy: string | undefined = undefined;
    if (referralCodeInput) {
      const referrer = Object.values(db.users).find((u) => u.referralCode === referralCodeInput.toUpperCase());
      if (referrer) {
        referredBy = referrer.id;
        referrer.referralCount += 1;
        referrer.chips += 200; // referral reward
      }
    }

    user = {
      id,
      username: name,
      avatar: ['🃏', '♠️', '💎', '🔥', '🦁', '👑'][Math.floor(Math.random() * 6)],
      authProvider: authProvider as any,
      referralCode,
      referredBy,
      referralCount: 0,
      chips: 500,
      stats: { gamesPlayed: 0, gamesWon: 0, bestScore: 999, zeroCardWins: 0 },
      friendIds: [],
      createdAt: Date.now(),
    };
    db.users[user.id] = user;
    saveDB(db);
  }

  res.json({ success: true, user });
});

// Get User Profile & Stats
app.get('/api/users/profile/:id', (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Search players by ID or username
app.get('/api/users/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) return res.json([]);

  const results = Object.values(db.users)
    .filter((u) => u.id.toLowerCase().includes(query) || u.username.toLowerCase().includes(query))
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      stats: u.stats,
    }));

  res.json(results);
});

// Friends list
app.get('/api/friends/list/:userId', (req, res) => {
  const user = db.users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const friends = user.friendIds
    .map((fid) => db.users[fid])
    .filter(Boolean)
    .map((f) => ({
      id: f.id,
      username: f.username,
      avatar: f.avatar,
      stats: f.stats,
      online: isUserOnline(f.id),
    }));

  res.json(friends);
});

// Add Friend by Player ID
app.post('/api/friends/add', (req, res) => {
  const { userId, targetId } = req.body;
  const user = db.users[userId];
  const target = db.users[targetId];

  if (!user || !target) {
    return res.status(404).json({ error: 'Player ID not found' });
  }

  if (userId === targetId) {
    return res.status(400).json({ error: 'Cannot add yourself as friend' });
  }

  if (!user.friendIds.includes(targetId)) {
    user.friendIds.push(targetId);
  }
  if (!target.friendIds.includes(userId)) {
    target.friendIds.push(userId);
  }
  saveDB(db);

  res.json({ success: true, friend: { id: target.id, username: target.username, avatar: target.avatar } });
});

// Refer Code validation
app.post('/api/refer/use', (req, res) => {
  const { userId, referralCode } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.referredBy) {
    return res.status(400).json({ error: 'Referral code already used' });
  }

  const referrer = Object.values(db.users).find(
    (u) => u.referralCode.toUpperCase() === referralCode.trim().toUpperCase() && u.id !== userId
  );

  if (!referrer) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }

  user.referredBy = referrer.id;
  user.chips += 100;
  referrer.referralCount += 1;
  referrer.chips += 200;
  saveDB(db);

  res.json({ success: true, rewardChips: 100, referrerName: referrer.username });
});

// Scoreboard / Global Leaderboard
app.get('/api/scoreboard', (_req, res) => {
  const topPlayers = Object.values(db.users)
    .sort((a, b) => b.stats.gamesWon - a.stats.gamesWon || a.stats.bestScore - b.stats.bestScore)
    .slice(0, 15)
    .map((u) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      stats: u.stats,
      chips: u.chips,
    }));
  res.json(topPlayers);
});

// --- REAL-TIME ROOMS & MULTIPLAYER (LAN & ONLINE) ---

interface RoomPlayer {
  socketId: string;
  userId: string;
  displayName: string;
  avatar: string;
  ready: boolean;
  isHost: boolean;
  gamePlayerId?: string; // e.g. "player-1"
}

interface Room {
  roomCode: string;
  mode: 'lan' | 'online_team';
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
  engine: GameEngine | null;
}

const rooms: Record<string, Room> = {};

// Robust multi-socket tracking per user
// normalized userId (uppercase, no #) -> Set of active socket IDs
const userSockets = new Map<string, Set<string>>();
// socketId -> user metadata
const socketToUser = new Map<string, { userId: string; username: string; avatar: string }>();

function normalizeId(idOrName: string): string {
  return idOrName.trim().replace(/^#/, '').toUpperCase();
}

/**
 * Intelligently finds a user in DB or active sockets by ID, normalized ID, or username.
 */
function findTargetUserAndSockets(query: string): {
  foundUser: { id: string; username: string; avatar: string } | null;
  socketIds: string[];
} {
  const qClean = query.trim().replace(/^#/, '');
  const qUpper = qClean.toUpperCase();
  const qLower = qClean.toLowerCase();

  // 1. Check DB users
  let targetUser: UserRecord | undefined = undefined;

  // Exact ID match
  targetUser = Object.values(db.users).find((u) => u.id.toUpperCase() === qUpper);

  // Match with 'P-' added or removed
  if (!targetUser) {
    if (!qUpper.startsWith('P-')) {
      targetUser = Object.values(db.users).find((u) => u.id.toUpperCase() === `P-${qUpper}`);
    } else {
      targetUser = Object.values(db.users).find((u) => u.id.toUpperCase().replace(/^P-/, '') === qUpper.replace(/^P-/, ''));
    }
  }

  // Match by username (case-insensitive)
  if (!targetUser) {
    targetUser = Object.values(db.users).find((u) => u.username.toLowerCase() === qLower);
  }

  // Partial username match if unique
  if (!targetUser) {
    const matches = Object.values(db.users).filter((u) => u.username.toLowerCase().includes(qLower));
    if (matches.length === 1) {
      targetUser = matches[0];
    }
  }

  // If found in DB, collect active socket IDs
  if (targetUser) {
    const sids = Array.from(userSockets.get(normalizeId(targetUser.id)) || []);
    return {
      foundUser: { id: targetUser.id, username: targetUser.username, avatar: targetUser.avatar },
      socketIds: sids,
    };
  }

  // 2. Check active connected sockets directly by ID or username
  for (const [sid, meta] of socketToUser.entries()) {
    const userNorm = normalizeId(meta.userId);
    const idMatches =
      userNorm === qUpper ||
      userNorm === `P-${qUpper}` ||
      userNorm.replace(/^P-/, '') === qUpper.replace(/^P-/, '');
    const nameMatches =
      meta.username.toLowerCase() === qLower ||
      meta.username.toLowerCase().includes(qLower);

    if (idMatches || nameMatches) {
      const sids = Array.from(userSockets.get(userNorm) || [sid]);
      return {
        foundUser: { id: meta.userId, username: meta.username, avatar: meta.avatar },
        socketIds: sids,
      };
    }
  }

  return { foundUser: null, socketIds: [] };
}

function getOnlineUsersList(excludeUserId?: string): { id: string; username: string; avatar: string }[] {
  const result: { id: string; username: string; avatar: string }[] = [];
  const seenIds = new Set<string>();

  for (const [normId, sids] of userSockets.entries()) {
    if (sids.size === 0) continue;
    if (excludeUserId && normId === normalizeId(excludeUserId)) continue;

    // Look up in DB first
    const dbUser = Object.values(db.users).find((u) => normalizeId(u.id) === normId);
    if (dbUser) {
      if (!seenIds.has(dbUser.id)) {
        seenIds.add(dbUser.id);
        result.push({ id: dbUser.id, username: dbUser.username, avatar: dbUser.avatar });
      }
    } else {
      const firstSid = Array.from(sids)[0];
      const meta = firstSid ? socketToUser.get(firstSid) : null;
      if (meta && !seenIds.has(meta.userId)) {
        seenIds.add(meta.userId);
        result.push({ id: meta.userId, username: meta.username, avatar: meta.avatar });
      }
    }
  }

  return result;
}

function isUserOnline(userId: string): boolean {
  const sids = userSockets.get(normalizeId(userId));
  return Boolean(sids && sids.size > 0);
}

// REST API for online players list
app.get('/api/online-players', (req, res) => {
  const exclude = req.query.exclude as string | undefined;
  res.json(getOnlineUsersList(exclude));
});

/**
 * Sanitizes game state for a specific client socket so opponents' hidden cards
 * are NOT transmitted over the network (100% privacy preservation).
 */
function sanitizeStateForPlayer(state: GameState, clientGamePlayerId?: string): any {
  const clean = JSON.parse(JSON.stringify(state));
  if (clean.gameOver) return clean; // Reveal all hands on game over

  clean.players = clean.players.map((p: any) => {
    if (p.id !== clientGamePlayerId) {
      // Opponent cards: hide rank, suit, pointValue
      p.cards = p.cards.map((_c: any) => ({
        id: 'hidden',
        rank: '?',
        suit: '?',
        pointValue: 0,
      }));
    }
    return p;
  });

  return clean;
}

io.on('connection', (socket: Socket) => {
  let currentUserId: string | null = null;
  let currentRoomCode: string | null = null;

  // Register user with robust multi-socket support
  socket.on('register_user', (payload: any) => {
    const userId = typeof payload === 'string' ? payload : payload?.userId;
    const username = typeof payload === 'object' ? payload?.username : undefined;
    const avatar = typeof payload === 'object' ? payload?.avatar : undefined;

    if (!userId) return;

    currentUserId = userId;
    const normId = normalizeId(userId);

    if (!userSockets.has(normId)) {
      userSockets.set(normId, new Set());
    }
    userSockets.get(normId)!.add(socket.id);

    // Save metadata
    const userMeta = {
      userId,
      username: username || db.users[userId]?.username || `Player_${userId}`,
      avatar: avatar || db.users[userId]?.avatar || '🃏',
    };
    socketToUser.set(socket.id, userMeta);

    // Broadcast presence update and full online list to all connected clients
    io.emit('user_presence_change', { userId, online: true });
    io.emit('online_players_update', getOnlineUsersList());
  });

  // Request online players list
  socket.on('get_online_players', (_data: any, callback?: Function) => {
    const list = getOnlineUsersList(currentUserId || undefined);
    if (typeof callback === 'function') {
      callback(list);
    } else {
      socket.emit('online_players_update', list);
    }
  });

  // Create room
  socket.on('create_room', ({ userId, displayName, avatar, maxPlayers = 4, mode = 'lan' }: any, callback: Function) => {
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

    rooms[roomCode] = {
      roomCode,
      mode,
      hostId: userId,
      players: [hostPlayer],
      maxPlayers,
      status: 'lobby',
      engine: null,
    };

    socket.join(roomCode);
    callback({ success: true, roomCode, room: rooms[roomCode] });
  });

  // Join room by room code
  socket.on('join_room', ({ roomCode, userId, displayName, avatar }: any, callback: Function) => {
    const code = roomCode?.trim().toUpperCase();
    const room = rooms[code];

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    if (room.status !== 'lobby') {
      return callback({ success: false, error: 'Game already in progress' });
    }

    if (room.players.length >= room.maxPlayers) {
      return callback({ success: false, error: 'Room is full' });
    }

    // Check if already in room
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
    socket.join(code);

    io.to(code).emit('room_updated', room);
    callback({ success: true, roomCode: code, room });
  });

  // Toggle ready
  socket.on('toggle_ready', ({ roomCode, userId }: any) => {
    const room = rooms[roomCode];
    if (!room) return;
    const player = room.players.find((p) => p.userId === userId);
    if (player) {
      player.ready = !player.ready;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  // Invite player by their Player ID or Username (Intelligent matching)
  socket.on('invite_player', ({ roomCode, targetPlayerId, fromName, fromUserId }: any, callback: Function) => {
    if (!targetPlayerId || !targetPlayerId.trim()) {
      return callback({ success: false, error: 'Please enter a valid Player ID or username' });
    }

    const { foundUser, socketIds } = findTargetUserAndSockets(targetPlayerId);

    if (!foundUser) {
      return callback({
        success: false,
        error: `Player "${targetPlayerId}" was not found. Please check the ID or username.`,
      });
    }

    if (socketIds.length === 0) {
      return callback({
        success: false,
        error: `${foundUser.username} (${foundUser.id}) is currently offline.`,
      });
    }

    // Send invitation to all connected sockets of that user!
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
      targetName: foundUser.username,
      targetId: foundUser.id,
    });
  });

  // Start game from lobby
  socket.on('start_room_game', ({ roomCode }: any, callback: Function) => {
    const room = rooms[roomCode];
    if (!room) return callback({ success: false, error: 'Room not found' });

    if (room.players.length < 2) {
      return callback({ success: false, error: 'Need at least 2 players to start' });
    }

    // Initialize GameEngine
    const playerNames = room.players.map((p) => p.displayName);
    const engine = new GameEngine({ playerNames });
    room.engine = engine;
    room.status = 'playing';

    // Map room players to engine player IDs ("player-1", "player-2", ...)
    room.players.forEach((p, idx) => {
      p.gamePlayerId = `player-${idx + 1}`;
    });

    // Notify room and broadcast customized secret state to each player
    const state = engine.getState();
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

  // Execute in-game action on server authoritative engine
  socket.on('room_action', ({ roomCode, actionType, payload }: any) => {
    const room = rooms[roomCode];
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

      // Check if game ended and update player records
      const updatedState = engine.getState();
      if (updatedState.gameOver) {
        room.status = 'ended';
        // Update user stats
        room.players.forEach((p, idx) => {
          const gameId = `player-${idx + 1}`;
          const isWinner = updatedState.winnerIds.includes(gameId);
          const userRec = db.users[p.userId];
          if (userRec) {
            userRec.stats.gamesPlayed += 1;
            if (isWinner) {
              userRec.stats.gamesWon += 1;
              userRec.chips += 100;
              if (updatedState.endReason === 'ZERO_CARD_AUTOMATIC_VICTORY') {
                userRec.stats.zeroCardWins += 1;
              }
            }
          }
        });
        saveDB(db);
      }

      // Broadcast sanitized state to each player
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

  socket.on('disconnect', () => {
    socketToUser.delete(socket.id);

    if (currentUserId) {
      const normId = normalizeId(currentUserId);
      const sids = userSockets.get(normId);
      if (sids) {
        sids.delete(socket.id);
        if (sids.size === 0) {
          userSockets.delete(normId);
          io.emit('user_presence_change', { userId: currentUserId, online: false });
        }
      }
      io.emit('online_players_update', getOnlineUsersList());
    }

    if (currentRoomCode && rooms[currentRoomCode]) {
      const room = rooms[currentRoomCode];
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      if (room.players.length === 0) {
        delete rooms[currentRoomCode];
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

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`=========================================`);
  console.log(` Six Cards Game Server running on:`);
  console.log(` Local:   http://localhost:${PORT}`);
  console.log(` LAN/WiFi: http://${localIp}:${PORT}`);
  console.log(`=========================================`);
});
