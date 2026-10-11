import { describe, it, expect } from 'vitest';
import { io } from 'socket.io-client';

describe('Real-Time Multiplayer Invitation System', () => {
  const SERVER_URL = 'http://localhost:3001';

  it('reliably delivers invitations across connected sockets with fuzzy ID and username matching', async () => {
    // 1. Connect Client 1 (Host "Alpha")
    const socket1 = io(SERVER_URL, { forceNew: true, reconnection: false });
    // 2. Connect Client 2 (Invitee "Beta")
    const socket2 = io(SERVER_URL, { forceNew: true, reconnection: false });

    await new Promise<void>((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count === 2) resolve();
      };
      socket1.on('connect', check);
      socket2.on('connect', check);
    });

    // Register both users
    await new Promise<void>((resolve) => {
      let registered = 0;
      const done = () => {
        registered++;
        if (registered === 2) resolve();
      };
      socket1.emit(
        'register_user',
        {
          userId: 'P-1001',
          username: 'AlphaPlayer',
          avatar: '♠️',
        },
        done
      );
      socket2.emit(
        'register_user',
        {
          userId: 'P-1002',
          username: 'BetaPlayer',
          avatar: '💎',
        },
        done
      );
    });

    // Client 1 creates a room
    let roomCode = '';
    await new Promise<void>((resolve) => {
      socket1.emit(
        'create_room',
        {
          userId: 'P-1001',
          displayName: 'AlphaPlayer',
          mode: 'online_team',
        },
        (res: any) => {
          expect(res.success).toBe(true);
          roomCode = res.roomCode;
          resolve();
        }
      );
    });

    expect(roomCode).toBeTruthy();

    // Setup listener on Socket 2 for invitation
    const receivedInvites: any[] = [];
    socket2.on('received_invitation', (invite: any) => {
      receivedInvites.push(invite);
    });

    // Test 1: Invite using formatted ID "#P-1002"
    await new Promise<void>((resolve) => {
      socket1.emit(
        'invite_player',
        {
          roomCode,
          targetPlayerId: '#P-1002',
          fromName: 'AlphaPlayer',
        },
        (res: any) => {
          expect(res.success).toBe(true);
          resolve();
        }
      );
    });

    // Test 2: Invite using number only "1002"
    await new Promise<void>((resolve) => {
      socket1.emit(
        'invite_player',
        {
          roomCode,
          targetPlayerId: '1002',
          fromName: 'AlphaPlayer',
        },
        (res: any) => {
          expect(res.success).toBe(true);
          resolve();
        }
      );
    });

    // Test 3: Invite using username "BetaPlayer"
    await new Promise<void>((resolve) => {
      socket1.emit(
        'invite_player',
        {
          roomCode,
          targetPlayerId: 'betaplayer',
          fromName: 'AlphaPlayer',
        },
        (res: any) => {
          expect(res.success).toBe(true);
          resolve();
        }
      );
    });

    // Wait a brief moment to receive all events
    await new Promise((r) => setTimeout(r, 100));

    expect(receivedInvites.length).toBe(3);
    expect(receivedInvites[0].roomCode).toBe(roomCode);
    expect(receivedInvites[0].fromName).toBe('AlphaPlayer');

    // Test 4: Invite non-existent player should return error
    await new Promise<void>((resolve) => {
      socket1.emit(
        'invite_player',
        {
          roomCode,
          targetPlayerId: 'P-99999999',
          fromName: 'AlphaPlayer',
        },
        (res: any) => {
          expect(res.success).toBe(false);
          expect(res.error).toBeDefined();
          resolve();
        }
      );
    });

    // Test 5: When Player 2 disconnects, server accurately detects offline state
    socket2.disconnect();
    await new Promise((r) => setTimeout(r, 60));

    await new Promise<void>((resolve) => {
      socket1.emit(
        'invite_player',
        {
          roomCode,
          targetPlayerId: 'P-1002',
          fromName: 'AlphaPlayer',
        },
        (res: any) => {
          expect(res.success).toBe(false);
          expect(res.error).toContain('offline');
          resolve();
        }
      );
    });

    // Cleanup
    socket1.disconnect();
  });
});

