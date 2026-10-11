import { io, Socket } from 'socket.io-client';
import type { UserProfile, FriendUser, ScoreboardEntry } from '../types/user';

// Profile-aware base URLs with live Render production fallback
const DEFAULT_PROD_URL = 'https://sixcardgame.onrender.com';
const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_URL : 'http://localhost:3001');
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  SERVER_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_URL : 'http://localhost:3001');
const API_BASE = `${SERVER_URL}/api`;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

export interface SystemHealth {
  status: string;
  profile: 'dev' | 'prod' | 'test';
  database: string;
  timestamp: number;
}

export const api = {
  getServerUrl(): string {
    return SERVER_URL;
  },
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async login(payload: {
    username?: string;
    authProvider?: 'guest' | 'local' | 'google';
    googleProfile?: any;
    referralCodeInput?: string;
  }): Promise<{ success: boolean; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users/profile/${userId}`);
    return res.json();
  },

  async searchUsers(query: string): Promise<FriendUser[]> {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async getFriends(userId: string): Promise<FriendUser[]> {
    const res = await fetch(`${API_BASE}/friends/list/${userId}`);
    return res.json();
  },

  async addFriend(userId: string, targetId: string): Promise<{ success: boolean; error?: string; friend?: any }> {
    const res = await fetch(`${API_BASE}/friends/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId }),
    });
    return res.json();
  },

  sendFriendRequest(fromUserId: string, targetPlayerId: string): Promise<{ success: boolean; error?: string; targetUser?: any; online?: boolean }> {
    return new Promise((resolve) => {
      if (!socket.connected) {
        // Fallback to REST API if socket not connected
        return this.addFriend(fromUserId, targetPlayerId).then((r) =>
          resolve({ success: r.success, error: r.error, targetUser: r.friend, online: false })
        );
      }
      socket.emit('send_friend_request', { fromUserId, targetPlayerId }, (res: any) => {
        resolve(res || { success: false, error: 'No response from server' });
      });
    });
  },

  acceptFriendRequest(userId: string, friendId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!socket.connected) {
        return this.addFriend(userId, friendId).then((r) => resolve({ success: r.success, error: r.error }));
      }
      socket.emit('accept_friend_request', { userId, friendId }, (res: any) => {
        resolve(res || { success: false, error: 'No response from server' });
      });
    });
  },

  async useReferral(userId: string, referralCode: string): Promise<{ success: boolean; error?: string; rewardChips?: number; referrerName?: string }> {
    const res = await fetch(`${API_BASE}/refer/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, referralCode }),
    });
    return res.json();
  },

  async getScoreboard(): Promise<ScoreboardEntry[]> {
    const res = await fetch(`${API_BASE}/scoreboard`);
    return res.json();
  },

  async getOnlinePlayers(excludeUserId?: string): Promise<{ id: string; username: string; avatar: string }[]> {
    const res = await fetch(`${API_BASE}/online-players${excludeUserId ? `?exclude=${encodeURIComponent(excludeUserId)}` : ''}`);
    return res.json();
  },

  async getGameHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/history`);
    return res.json();
  },
};
