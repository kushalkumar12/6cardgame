import { io, Socket } from 'socket.io-client';
import type { UserProfile, FriendUser, ScoreboardEntry, NetworkInfo } from '../types/user';

const API_BASE = '/api';

export const socket: Socket = io({
  autoConnect: false,
});

export const api = {
  async getNetworkInfo(): Promise<NetworkInfo> {
    const res = await fetch(`${API_BASE}/network`);
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
};
