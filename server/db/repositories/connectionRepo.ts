import { getDatabase } from '../database';

export interface DBConnection {
  socket_id: string;
  user_id: string;
  connected_at: number;
  last_heartbeat: number;
}

export const ConnectionRepository = {
  async register(socketId: string, userId: string): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.query(
      `INSERT INTO connections (socket_id, user_id, connected_at, last_heartbeat)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (socket_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         last_heartbeat = EXCLUDED.last_heartbeat`,
      [socketId, userId, now, now]
    );
  },

  async updateHeartbeat(socketId: string): Promise<void> {
    const db = await getDatabase();
    await db.query('UPDATE connections SET last_heartbeat = $1 WHERE socket_id = $2', [
      Date.now(),
      socketId,
    ]);
  },

  async remove(socketId: string): Promise<string | null> {
    const db = await getDatabase();
    const res = await db.query<DBConnection>(
      'DELETE FROM connections WHERE socket_id = $1 RETURNING user_id',
      [socketId]
    );
    return res.rows[0]?.user_id || null;
  },

  async getSocketsForUser(userId: string): Promise<string[]> {
    const db = await getDatabase();
    const res = await db.query<{ socket_id: string }>(
      'SELECT socket_id FROM connections WHERE user_id = $1',
      [userId]
    );
    return res.rows.map((r) => r.socket_id);
  },

  async getOnlineUserIds(): Promise<string[]> {
    const db = await getDatabase();
    const res = await db.query<{ user_id: string }>(
      'SELECT DISTINCT user_id FROM connections'
    );
    return res.rows.map((r) => r.user_id);
  },
};
