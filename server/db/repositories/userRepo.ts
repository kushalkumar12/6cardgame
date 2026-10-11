import { getDatabase } from '../database';

export interface DBUser {
  id: string;
  username: string;
  avatar: string;
  auth_provider: 'guest' | 'local' | 'google';
  referral_code: string;
  referred_by?: string | null;
  referral_count: number;
  chips: number;
  created_at: number;
  updated_at: number;
}

export interface DBUserStats {
  user_id: string;
  games_played: number;
  games_won: number;
  best_score: number;
  zero_card_wins: number;
  updated_at: number;
}

export const UserRepository = {
  async findById(id: string): Promise<DBUser | null> {
    const db = await getDatabase();
    const res = await db.query<DBUser>('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findByUsername(username: string): Promise<DBUser | null> {
    const db = await getDatabase();
    const res = await db.query<DBUser>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    return res.rows[0] || null;
  },

  async search(query: string): Promise<DBUser[]> {
    const db = await getDatabase();
    const clean = query.trim().replace(/^#/, '');
    const res = await db.query<DBUser>(
      `SELECT * FROM users 
       WHERE username ILIKE $1 
          OR id ILIKE $1 
          OR referral_code ILIKE $1 
       LIMIT 10`,
      [`%${clean}%`]
    );
    return res.rows;
  },

  async create(user: Omit<DBUser, 'created_at' | 'updated_at'>): Promise<DBUser> {
    const db = await getDatabase();
    const now = Date.now();
    const fullUser: DBUser = {
      ...user,
      created_at: now,
      updated_at: now,
    };

    await db.query(
      `INSERT INTO users (id, username, avatar, auth_provider, referral_code, referred_by, referral_count, chips, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        fullUser.id,
        fullUser.username,
        fullUser.avatar,
        fullUser.auth_provider,
        fullUser.referral_code,
        fullUser.referred_by || null,
        fullUser.referral_count,
        fullUser.chips,
        fullUser.created_at,
        fullUser.updated_at,
      ]
    );

    // Initialize stats record
    await db.query(
      `INSERT INTO user_stats (user_id, games_played, games_won, best_score, zero_card_wins, updated_at)
       VALUES ($1, 0, 0, 999, 0, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [fullUser.id, now]
    );

    return fullUser;
  },

  async updateChips(userId: string, newChips: number): Promise<void> {
    const db = await getDatabase();
    await db.query('UPDATE users SET chips = $1, updated_at = $2 WHERE id = $3', [
      newChips,
      Date.now(),
      userId,
    ]);
  },

  async incrementReferrals(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.query(
      'UPDATE users SET referral_count = referral_count + 1, updated_at = $1 WHERE id = $2',
      [Date.now(), userId]
    );
  },

  async getStats(userId: string): Promise<DBUserStats> {
    const db = await getDatabase();
    const res = await db.query<DBUserStats>(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );
    if (res.rows[0]) return res.rows[0];

    const now = Date.now();
    const def = {
      user_id: userId,
      games_played: 0,
      games_won: 0,
      best_score: 999,
      zero_card_wins: 0,
      updated_at: now,
    };
    await db.query(
      `INSERT INTO user_stats (user_id, games_played, games_won, best_score, zero_card_wins, updated_at)
       VALUES ($1, 0, 0, 999, 0, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, now]
    );
    return def;
  },

  async recordMatchStats(
    userId: string,
    isWinner: boolean,
    finalScore: number,
    isZeroCardWin: boolean
  ): Promise<void> {
    const current = await this.getStats(userId);
    const updatedPlayed = current.games_played + 1;
    const updatedWon = current.games_won + (isWinner ? 1 : 0);
    const updatedBest = Math.min(current.best_score, finalScore);
    const updatedZero = current.zero_card_wins + (isZeroCardWin ? 1 : 0);
    const now = Date.now();

    const db = await getDatabase();
    await db.query(
      `INSERT INTO user_stats (user_id, games_played, games_won, best_score, zero_card_wins, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         games_played = EXCLUDED.games_played,
         games_won = EXCLUDED.games_won,
         best_score = EXCLUDED.best_score,
         zero_card_wins = EXCLUDED.zero_card_wins,
         updated_at = EXCLUDED.updated_at`,
      [userId, updatedPlayed, updatedWon, updatedBest, updatedZero, now]
    );
  },

  async addFriend(userId: string, friendId: string): Promise<void> {
    if (userId === friendId) return;
    const db = await getDatabase();
    await db.query(
      `INSERT INTO friends (user_id, friend_id, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [userId, friendId, Date.now()]
    );
  },

  async getFriends(userId: string): Promise<DBUser[]> {
    const db = await getDatabase();
    const res = await db.query<DBUser>(
      `SELECT u.* FROM users u
       INNER JOIN friends f ON f.friend_id = u.id
       WHERE f.user_id = $1`,
      [userId]
    );
    return res.rows;
  },

  async getAll(): Promise<DBUser[]> {
    const db = await getDatabase();
    const res = await db.query<DBUser>('SELECT * FROM users ORDER BY created_at ASC');
    return res.rows;
  },
};
