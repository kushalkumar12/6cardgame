export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  zeroCardWins: number;
}

export interface UserProfile {
  id: string; // e.g. "P-4821"
  username: string;
  avatar: string;
  authProvider: 'guest' | 'local' | 'google';
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  chips: number;
  stats: UserStats;
  friendIds: string[];
  createdAt: number;
}

export interface FriendUser {
  id: string;
  username: string;
  avatar: string;
  stats: UserStats;
  online: boolean;
}

export interface ScoreboardEntry {
  id: string;
  username: string;
  avatar: string;
  stats: UserStats;
  chips: number;
}

export interface RoomPlayerInfo {
  socketId: string;
  userId: string;
  displayName: string;
  avatar: string;
  ready: boolean;
  isHost: boolean;
  gamePlayerId?: string;
}

export interface NetworkInfo {
  localIp: string;
  lanUrl: string;
  serverUrl: string;
}
