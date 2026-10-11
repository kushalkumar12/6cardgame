import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabase } from '../database';
import { UserRepository } from '../repositories/userRepo';
import { RoomRepository } from '../repositories/roomRepo';
import { GameHistoryRepository } from '../repositories/historyRepo';
import { ConnectionRepository } from '../repositories/connectionRepo';
import { config } from '../../config/profiles';

describe('SQL Database & Repository Layer (Test Profile)', () => {
  beforeAll(async () => {
    // Ensure database schema is initialized in test mode
    const db = await getDatabase();
    await db.initSchema();
  });

  describe('1. Profile Configuration', () => {
    it('initializes in test profile with mock/isolated DB', () => {
      expect(config.profile).toBe('test');
      expect(config.isTest).toBe(true);
    });
  });

  describe('2. User and Stats SQL Repository', () => {
    it('creates and retrieves a new user record with stats', async () => {
      const created = await UserRepository.create({
        id: 'P-9999',
        username: 'SQLMaster',
        avatar: '💎',
        auth_provider: 'guest',
        referral_code: 'SQL999',
        referral_count: 0,
        chips: 1000,
      });

      expect(created.id).toBe('P-9999');
      expect(created.username).toBe('SQLMaster');

      const found = await UserRepository.findById('P-9999');
      expect(found).not.toBeNull();
      expect(found?.username).toBe('SQLMaster');

      const byUsername = await UserRepository.findByUsername('sqlmaster');
      expect(byUsername?.id).toBe('P-9999');
    });

    it('records match stats and increments games played and wins', async () => {
      const before = await UserRepository.getStats('P-9999');
      await UserRepository.recordMatchStats('P-9999', true, 5, false);
      const after = await UserRepository.getStats('P-9999');
      expect(after.games_played).toBe(before.games_played + 1);
      expect(after.games_won).toBe(before.games_won + 1);
      expect(after.best_score).toBeLessThanOrEqual(5);
    });

    it('searches users by ID or username', async () => {
      const results = await UserRepository.search('SQLMaster');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].username).toBe('SQLMaster');
    });

    it('adds and retrieves friends via SQL relational table', async () => {
      await UserRepository.create({
        id: 'P-8888',
        username: 'CardAlly',
        avatar: '🦁',
        auth_provider: 'guest',
        referral_code: 'ALLY888',
        referral_count: 0,
        chips: 500,
      });

      await UserRepository.addFriend('P-9999', 'P-8888');
      const friends = await UserRepository.getFriends('P-9999');
      expect(friends.some((f) => f.id === 'P-8888')).toBe(true);
    });
  });

  describe('3. Room and Participant SQL Repository', () => {
    it('creates a room and adds participants', async () => {
      const room = await RoomRepository.create('TEST', 'P-9999', { maxPlayers: 4 });
      expect(room.room_code).toBe('TEST');
      expect(room.status).toBe('WAITING');

      await RoomRepository.addParticipant('TEST', 'P-9999', 'sock-1', true);
      const participants = await RoomRepository.getParticipants('TEST');
      expect(participants.length).toBe(1);
      expect(participants[0].user_id).toBe('P-9999');
      expect(participants[0].is_host).toBe(true);
    });

    it('updates room game state and status', async () => {
      await RoomRepository.updateState('TEST', { roundNumber: 2, currentPhase: 'TURN_START' });
      const updated = await RoomRepository.findByCode('TEST');
      expect(updated?.status).toBe('IN_PROGRESS');
      expect(updated?.game_state).toBeDefined();

      await RoomRepository.updateStatus('TEST', 'FINISHED');
      const finished = await RoomRepository.findByCode('TEST');
      expect(finished?.status).toBe('FINISHED');
    });
  });

  describe('4. Active Connection SQL Repository', () => {
    it('registers socket connection and retrieves active sockets', async () => {
      await ConnectionRepository.register('sock-99', 'P-9999');
      const sockets = await ConnectionRepository.getSocketsForUser('P-9999');
      expect(sockets).toContain('sock-99');

      const online = await ConnectionRepository.getOnlineUserIds();
      expect(online).toContain('P-9999');

      await ConnectionRepository.remove('sock-99');
      const after = await ConnectionRepository.getSocketsForUser('P-9999');
      expect(after).not.toContain('sock-99');
    });
  });

  describe('5. Game History SQL Repository', () => {
    it('persists match outcome and retrieves recent games', async () => {
      const history = await GameHistoryRepository.record({
        room_code: 'TEST',
        mode: 'multiplayer',
        start_time: Date.now() - 60000,
        end_time: Date.now(),
        end_reason: 'ZERO_CARD_AUTOMATIC_VICTORY',
        winner_ids: ['P-9999'],
        participants: [
          { userId: 'P-9999', displayName: 'SQLMaster', score: 0, cardsLeft: 0 },
          { userId: 'P-8888', displayName: 'CardAlly', score: 32, cardsLeft: 4 },
        ],
        round_count: 4,
      });

      expect(history.id).toBeDefined();
      expect(history.end_reason).toBe('ZERO_CARD_AUTOMATIC_VICTORY');

      const recent = await GameHistoryRepository.getRecent(5);
      expect(recent.length).toBeGreaterThanOrEqual(1);
      expect(recent[0].winner_ids).toContain('P-9999');
    });
  });
});
