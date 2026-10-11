import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/profiles';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  initSchema(): Promise<void>;
  close(): Promise<void>;
  isUsingMock(): boolean;
}

// -------------------------------------------------------------
// Real PostgreSQL Database Implementation
// -------------------------------------------------------------
class PostgresDatabase implements IDatabase {
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.ssl,
      max: config.isProd ? 20 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL Pool Error:', err);
    });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(sql, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount ?? res.rows.length,
      };
    } finally {
      client.release();
    }
  }

  async initSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await this.pool.query(schemaSql);
      console.log('✅ PostgreSQL Schema initialized successfully');
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  isUsingMock(): boolean {
    return false;
  }
}

// -------------------------------------------------------------
// High-Fidelity In-Memory Mock Database (for Test / Standalone)
// -------------------------------------------------------------
export class MockDatabase implements IDatabase {
  public users = new Map<string, any>();
  public userStats = new Map<string, any>();
  public friends: Array<{ user_id: string; friend_id: string; created_at: number }> = [];
  public rooms = new Map<string, any>();
  public roomParticipants: Array<{ room_code: string; user_id: string; socket_id: string; is_host: boolean; joined_at: number }> = [];
  public connections = new Map<string, any>();
  public gameHistory: any[] = [];

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    const now = Date.now();
    this.users.set('P-1001', {
      id: 'P-1001',
      username: 'Kushal',
      avatar: '👑',
      auth_provider: 'guest',
      referral_code: 'KUSH1001',
      referred_by: null,
      referral_count: 3,
      chips: 2500,
      created_at: now,
      updated_at: now,
    });
    this.userStats.set('P-1001', {
      user_id: 'P-1001',
      games_played: 12,
      games_won: 8,
      best_score: 2,
      zero_card_wins: 3,
      updated_at: now,
    });

    this.users.set('P-1002', {
      id: 'P-1002',
      username: 'Aiden',
      avatar: '🦊',
      auth_provider: 'guest',
      referral_code: 'AIDEN1002',
      referred_by: 'P-1001',
      referral_count: 1,
      chips: 1400,
      created_at: now,
      updated_at: now,
    });
    this.userStats.set('P-1002', {
      user_id: 'P-1002',
      games_played: 7,
      games_won: 4,
      best_score: 5,
      zero_card_wins: 1,
      updated_at: now,
    });
  }

  async initSchema(): Promise<void> {
    // In-memory mock ready
  }

  async close(): Promise<void> {
    // No-op
  }

  isUsingMock(): boolean {
    return true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const norm = sql.trim().toUpperCase();

    // 1. SELECT * FROM users WHERE id = $1
    if (norm.includes('FROM USERS') && norm.includes('WHERE ID =')) {
      const id = params[0];
      const user = this.users.get(id);
      return { rows: user ? [user as T] : [], rowCount: user ? 1 : 0 };
    }

    // 2. SELECT * FROM users WHERE LOWER(username) = LOWER($1)
    if (norm.includes('FROM USERS') && norm.includes('LOWER(USERNAME) = LOWER')) {
      const name = String(params[0]).toLowerCase();
      const match = Array.from(this.users.values()).find((u) => u.username.toLowerCase() === name);
      return { rows: match ? [match as T] : [], rowCount: match ? 1 : 0 };
    }

    // 3. Search users (ILIKE)
    if (norm.includes('FROM USERS') && (norm.includes('ILIKE') || norm.includes('LIKE'))) {
      const raw = String(params[0] ?? '').replace(/%/g, '').toLowerCase().trim();
      const matches: any[] = [];
      for (const u of this.users.values()) {
        const uid = (u.id || '').toLowerCase();
        const uname = (u.username || '').toLowerCase();
        const uref = (u.referral_code || '').toLowerCase();
        if (uid.includes(raw) || uname.includes(raw) || uref.includes(raw)) {
          matches.push(u);
        }
      }
      return { rows: matches as T[], rowCount: matches.length };
    }

    // 4. SELECT ALL users
    if (norm.startsWith('SELECT') && norm.includes('FROM USERS') && !norm.includes('WHERE')) {
      return { rows: Array.from(this.users.values()) as T[], rowCount: this.users.size };
    }

    // 5. INSERT INTO users
    if (norm.startsWith('INSERT INTO USERS')) {
      const [id, username, avatar, auth_provider, referral_code, referred_by, referral_count, chips, created_at, updated_at] = params;
      const rec = { id, username, avatar, auth_provider, referral_code, referred_by, referral_count, chips, created_at, updated_at };
      this.users.set(id, rec);
      return { rows: [rec as T], rowCount: 1 };
    }

    // 6. UPDATE users
    if (norm.startsWith('UPDATE USERS')) {
      const id = params[params.length - 1];
      const existing = this.users.get(id);
      if (existing) {
        if (norm.includes('CHIPS = $1')) existing.chips = params[0];
        if (norm.includes('REFERRAL_COUNT = REFERRAL_COUNT + 1')) existing.referral_count = (existing.referral_count || 0) + 1;
        existing.updated_at = Date.now();
      }
      return { rows: existing ? [existing as T] : [], rowCount: existing ? 1 : 0 };
    }

    // 7. SELECT user_stats WHERE user_id = $1
    if (norm.includes('FROM USER_STATS') && norm.includes('WHERE USER_ID =')) {
      const uid = params[0];
      const stats = this.userStats.get(uid);
      return { rows: stats ? [stats as T] : [], rowCount: stats ? 1 : 0 };
    }

    // 8. INSERT/UPDATE user_stats
    if (norm.startsWith('INSERT INTO USER_STATS')) {
      if (params.length === 2) {
        // Default insert from getStats: [userId, now]
        const [user_id, updated_at] = params;
        if (!this.userStats.has(user_id)) {
          const stats = { user_id, games_played: 0, games_won: 0, best_score: 999, zero_card_wins: 0, updated_at };
          this.userStats.set(user_id, stats);
        }
      } else {
        // [userId, updatedPlayed, updatedWon, updatedBest, updatedZero, now]
        const [user_id, games_played, games_won, best_score, zero_card_wins, updated_at] = params;
        const stats = { user_id, games_played, games_won, best_score, zero_card_wins, updated_at };
        this.userStats.set(user_id, stats);
      }
      return { rows: [], rowCount: 1 };
    }

    // 9. FRIENDS
    if (norm.includes('FROM USERS U') && norm.includes('INNER JOIN FRIENDS F')) {
      const uid = params[0];
      const friendIds = this.friends
        .filter((f) => f.user_id === uid || f.friend_id === uid)
        .map((f) => (f.user_id === uid ? f.friend_id : f.user_id));
      const uniqueFriendIds = Array.from(new Set(friendIds)).filter((id) => id !== uid);
      const friendUsers = uniqueFriendIds.map((fid) => this.users.get(fid)).filter(Boolean);
      return { rows: friendUsers as T[], rowCount: friendUsers.length };
    }
    if (norm.startsWith('INSERT INTO FRIENDS')) {
      const [user_id, friend_id, created_at] = params;
      if (!this.friends.some((f) => f.user_id === user_id && f.friend_id === friend_id)) {
        this.friends.push({ user_id, friend_id, created_at });
      }
      return { rows: [], rowCount: 1 };
    }

    // 10. ROOMS
    if (norm.startsWith('INSERT INTO ROOMS')) {
      const [room_code, host_user_id, status, configJson, game_state, created_at, updated_at] = params;
      const room = {
        room_code,
        host_user_id,
        status: status || 'WAITING',
        config: typeof configJson === 'string' ? JSON.parse(configJson) : configJson,
        game_state: game_state ? (typeof game_state === 'string' ? JSON.parse(game_state) : game_state) : null,
        created_at,
        updated_at,
      };
      this.rooms.set(room_code, room);
      return { rows: [room as T], rowCount: 1 };
    }
    if (norm.includes('FROM ROOMS WHERE ROOM_CODE =')) {
      const code = params[0];
      const room = this.rooms.get(code);
      return { rows: room ? [room as T] : [], rowCount: room ? 1 : 0 };
    }
    if (norm.startsWith('UPDATE ROOMS')) {
      const code = params[params.length - 1];
      const room = this.rooms.get(code);
      if (room) {
        if (norm.includes('STATUS = $1')) {
          room.status = params[0];
        } else if (norm.includes('GAME_STATE = $1')) {
          room.game_state = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
          room.status = params[1] || 'IN_PROGRESS';
        }
        room.updated_at = Date.now();
      }
      return { rows: room ? [room as T] : [], rowCount: room ? 1 : 0 };
    }
    if (norm.startsWith('DELETE FROM ROOMS')) {
      const code = params[0];
      const deleted = this.rooms.delete(code);
      return { rows: [], rowCount: deleted ? 1 : 0 };
    }

    // 11. ROOM PARTICIPANTS
    if (norm.startsWith('INSERT INTO ROOM_PARTICIPANTS')) {
      const [room_code, user_id, socket_id, is_host, joined_at] = params;
      const existing = this.roomParticipants.find((p) => p.room_code === room_code && p.user_id === user_id);
      if (existing) {
        existing.socket_id = socket_id;
        existing.is_host = is_host;
      } else {
        this.roomParticipants.push({ room_code, user_id, socket_id, is_host, joined_at });
      }
      return { rows: [], rowCount: 1 };
    }
    if (norm.includes('FROM ROOM_PARTICIPANTS WHERE ROOM_CODE =')) {
      const code = params[0];
      const parts = this.roomParticipants.filter((p) => p.room_code === code);
      return { rows: parts as T[], rowCount: parts.length };
    }
    if (norm.startsWith('DELETE FROM ROOM_PARTICIPANTS')) {
      const [code, uid] = params;
      this.roomParticipants = this.roomParticipants.filter((p) => !(p.room_code === code && p.user_id === uid));
      return { rows: [], rowCount: 1 };
    }

    // 12. CONNECTIONS
    if (norm.startsWith('INSERT INTO CONNECTIONS')) {
      const [socket_id, user_id, connected_at, last_heartbeat] = params;
      this.connections.set(socket_id, { socket_id, user_id, connected_at, last_heartbeat });
      return { rows: [], rowCount: 1 };
    }
    if (norm.startsWith('DELETE FROM CONNECTIONS WHERE SOCKET_ID =')) {
      const sid = params[0];
      const existing = this.connections.get(sid);
      this.connections.delete(sid);
      return { rows: existing ? [existing as T] : [], rowCount: existing ? 1 : 0 };
    }
    if (norm.includes('SELECT SOCKET_ID FROM CONNECTIONS WHERE USER_ID =')) {
      const uid = params[0];
      const sids = Array.from(this.connections.values())
        .filter((c) => c.user_id === uid)
        .map((c) => ({ socket_id: c.socket_id }));
      return { rows: sids as T[], rowCount: sids.length };
    }
    if (norm.includes('SELECT DISTINCT USER_ID FROM CONNECTIONS')) {
      const uniqueUids = Array.from(new Set(Array.from(this.connections.values()).map((c) => c.user_id)));
      return { rows: uniqueUids.map((user_id) => ({ user_id })) as T[], rowCount: uniqueUids.length };
    }

    // 13. GAME HISTORY
    if (norm.startsWith('INSERT INTO GAME_HISTORY')) {
      const [id, room_code, mode, start_time, end_time, end_reason, winner_ids, participants, round_count, created_at] = params;
      const hist = { id, room_code, mode, start_time, end_time, end_reason, winner_ids, participants, round_count, created_at };
      this.gameHistory.push(hist);
      return { rows: [hist as T], rowCount: 1 };
    }
    if (norm.includes('FROM GAME_HISTORY')) {
      return { rows: this.gameHistory.slice().reverse() as T[], rowCount: this.gameHistory.length };
    }

    return { rows: [], rowCount: 0 };
  }
}

// -------------------------------------------------------------
// Database Factory
// -------------------------------------------------------------
let activeDatabase: IDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (activeDatabase) return activeDatabase;

  // Attempt real PostgreSQL connection for Test, Dev and Prod
  if (config.databaseUrl) {
    try {
      const pgDb = new PostgresDatabase();
      await pgDb.query('SELECT 1');
      await pgDb.initSchema();
      activeDatabase = pgDb;
      const targetHost = config.databaseUrl.includes('@')
        ? config.databaseUrl.split('@')[1]
        : config.databaseUrl;
      console.log(`🔌 Connected to PostgreSQL (${config.profile.toUpperCase()} profile) -> ${targetHost}`);
      return activeDatabase;
    } catch (err: any) {
      if (config.isProd) {
        console.error('❌ Critical: Failed to connect to PostgreSQL in PROD profile:', err.message);
        throw err;
      }

      console.warn(`⚠️  Notice: PostgreSQL could not be reached (${err.message}).`);
      console.warn('   Falling back to in-memory SQL mock until DATABASE_URL is reachable.');
    }
  }

  activeDatabase = new MockDatabase();
  await activeDatabase.initSchema();
  return activeDatabase;
}
