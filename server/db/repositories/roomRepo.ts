import { getDatabase } from '../database';

export interface DBRoom {
  room_code: string;
  host_user_id: string | null;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  config: any;
  game_state: any | null;
  created_at: number;
  updated_at: number;
}

export interface DBRoomParticipant {
  id?: number;
  room_code: string;
  user_id: string;
  socket_id: string;
  is_host: boolean;
  joined_at: number;
}

export const RoomRepository = {
  async create(roomCode: string, hostUserId: string, config: any): Promise<DBRoom> {
    const db = await getDatabase();
    const now = Date.now();
    const room: DBRoom = {
      room_code: roomCode,
      host_user_id: hostUserId,
      status: 'WAITING',
      config,
      game_state: null,
      created_at: now,
      updated_at: now,
    };

    await db.query(
      `INSERT INTO rooms (room_code, host_user_id, status, config, game_state, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (room_code) DO UPDATE SET
         status = EXCLUDED.status,
         config = EXCLUDED.config,
         updated_at = EXCLUDED.updated_at`,
      [room.room_code, room.host_user_id, room.status, JSON.stringify(room.config), null, room.created_at, room.updated_at]
    );

    return room;
  },

  async findByCode(roomCode: string): Promise<DBRoom | null> {
    const db = await getDatabase();
    const res = await db.query<DBRoom>('SELECT * FROM rooms WHERE room_code = $1', [roomCode]);
    return res.rows[0] || null;
  },

  async updateState(roomCode: string, gameState: any): Promise<void> {
    const db = await getDatabase();
    await db.query(
      'UPDATE rooms SET game_state = $1, status = $2, updated_at = $3 WHERE room_code = $4',
      [JSON.stringify(gameState), 'IN_PROGRESS', Date.now(), roomCode]
    );
  },

  async updateStatus(roomCode: string, status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED'): Promise<void> {
    const db = await getDatabase();
    await db.query('UPDATE rooms SET status = $1, updated_at = $2 WHERE room_code = $3', [
      status,
      Date.now(),
      roomCode,
    ]);
  },

  async delete(roomCode: string): Promise<void> {
    const db = await getDatabase();
    await db.query('DELETE FROM rooms WHERE room_code = $1', [roomCode]);
  },

  async addParticipant(roomCode: string, userId: string, socketId: string, isHost: boolean = false): Promise<void> {
    const db = await getDatabase();
    await db.query(
      `INSERT INTO room_participants (room_code, user_id, socket_id, is_host, joined_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room_code, user_id) DO UPDATE SET
         socket_id = EXCLUDED.socket_id,
         is_host = EXCLUDED.is_host`,
      [roomCode, userId, socketId, isHost, Date.now()]
    );
  },

  async removeParticipant(roomCode: string, userId: string): Promise<void> {
    const db = await getDatabase();
    await db.query('DELETE FROM room_participants WHERE room_code = $1 AND user_id = $2', [
      roomCode,
      userId,
    ]);
  },

  async getParticipants(roomCode: string): Promise<DBRoomParticipant[]> {
    const db = await getDatabase();
    const res = await db.query<DBRoomParticipant>(
      'SELECT * FROM room_participants WHERE room_code = $1 ORDER BY joined_at ASC',
      [roomCode]
    );
    return res.rows;
  },
};
