import { getDatabase } from '../database';

export interface DBGameHistory {
  id: string;
  room_code: string | null;
  mode: string;
  start_time: number;
  end_time: number;
  end_reason: string;
  winner_ids: string[];
  participants: any[];
  round_count: number;
  created_at: number;
}

export const GameHistoryRepository = {
  async record(history: Omit<DBGameHistory, 'id' | 'created_at'>): Promise<DBGameHistory> {
    const db = await getDatabase();
    const id = `game-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();
    const rec: DBGameHistory = {
      ...history,
      id,
      created_at: now,
    };

    await db.query(
      `INSERT INTO game_history (id, room_code, mode, start_time, end_time, end_reason, winner_ids, participants, round_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        rec.id,
        rec.room_code || null,
        rec.mode,
        rec.start_time,
        rec.end_time,
        rec.end_reason,
        JSON.stringify(rec.winner_ids),
        JSON.stringify(rec.participants),
        rec.round_count,
        rec.created_at,
      ]
    );

    return rec;
  },

  async getRecent(limit: number = 20): Promise<DBGameHistory[]> {
    const db = await getDatabase();
    const res = await db.query<any>(
      'SELECT * FROM game_history ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return res.rows.map((r) => ({
      ...r,
      winner_ids: typeof r.winner_ids === 'string' ? JSON.parse(r.winner_ids) : r.winner_ids,
      participants: typeof r.participants === 'string' ? JSON.parse(r.participants) : r.participants,
    }));
  },
};
