import React, { useState, useEffect, useRef } from 'react';
import { api, socket } from '../services/api';
import type { UserProfile, FriendUser, ScoreboardEntry } from '../types/user';
import { Avatar } from './Avatar';
import { soundManager } from '../services/soundManager';

const AVATAR_THEMES = [
  { id: 1, name: 'Amber Gold', start: '#f59e0b', end: '#b45309', ring: '#fbbf24', font: '#ffffff' },
  { id: 2, name: 'Sapphire Blue', start: '#0ea5e9', end: '#1d4ed8', ring: '#38bdf8', font: '#ffffff' },
  { id: 3, name: 'Emerald Jade', start: '#10b981', end: '#047857', ring: '#34d399', font: '#ffffff' },
  { id: 4, name: 'Crimson Ruby', start: '#f43f5e', end: '#be123c', ring: '#fb7185', font: '#ffffff' },
  { id: 5, name: 'Amethyst Purple', start: '#a855f7', end: '#6b21a8', ring: '#c084fc', font: '#ffffff' },
];

const getInitialSvg = (letter: string, theme: (typeof AVATAR_THEMES)[0]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g_${theme.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${theme.start}"/><stop offset="100%" stop-color="${theme.end}"/></linearGradient></defs><circle cx="50" cy="50" r="47" fill="url(#g_${theme.id})" stroke="${theme.ring}" stroke-width="3"/><text x="50" y="53" text-anchor="middle" dominant-baseline="central" fill="${theme.font}" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const TABS: { id: 'profile' | 'scoreboard' | 'friends' | 'refer' | 'about'; icon: string; label: string }[] = [
  { id: 'profile', icon: '👤', label: 'Profile' },
  { id: 'scoreboard', icon: '🏆', label: 'Ranking' },
  { id: 'friends', icon: '👥', label: 'Friends' },
  { id: 'refer', icon: '🎁', label: 'Rewards' },
  { id: 'about', icon: 'ℹ️', label: 'About' },
];

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onLogout: () => void;
  onInviteFriend?: (friendId: string) => void;
  onUpdateAvatar?: (newAvatar: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onLogout,
  onInviteFriend,
  onUpdateAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'scoreboard' | 'friends' | 'refer' | 'about'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAvatar, setCurrentAvatar] = useState(user.avatar);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const initialLetter = (user.username.trim()[0] || 'A').toUpperCase();

  // Friends tab state
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [friendMsg, setFriendMsg] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Scoreboard tab state
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);

  // Refer tab state
  const [referCodeInput, setReferCodeInput] = useState('');
  const [referMsg, setReferMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCurrentAvatar(result);
      onUpdateAvatar?.(result);
      setShowAvatarPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const loadScoreboard = () => {
    setScoreboardLoading(true);
    api.getScoreboard()
      .then((data) => {
        setScoreboard(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Fallback to minimal array if network fails
        setScoreboard([]);
      })
      .finally(() => {
        setScoreboardLoading(false);
      });
  };

  const loadFriends = () => {
    setFriendsLoading(true);
    api.getFriends(user.id)
      .then((data) => {
        setFriends(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setFriends([]);
      })
      .finally(() => {
        setFriendsLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
    } else if (activeTab === 'scoreboard') {
      loadScoreboard();
    }
  }, [activeTab, user.id]);

  useEffect(() => {
    const handleFriendListUpdate = () => {
      loadFriends();
    };
    socket.on('friend_list_updated', handleFriendListUpdate);
    return () => {
      socket.off('friend_list_updated', handleFriendListUpdate);
    };
  }, [user.id]);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      soundManager.playClick();
      setFriendMsg('Searching...');
      const results = await api.searchUsers(searchQuery);
      setSearchResults(results.filter((u) => u.id !== user.id));
      setFriendMsg(results.length === 0 ? 'No players found matching query' : '');
    } catch {
      setFriendMsg('Search failed. Please try again.');
    }
  };

  const handleAddFriend = async (targetId: string) => {
    try {
      soundManager.playClick();
      setFriendMsg('Adding friend...');
      const res = await api.sendFriendRequest(user.id, targetId);
      await api.addFriend(user.id, targetId);
      loadFriends();
      setFriendMsg(res.success ? `Added ${res.targetUser?.username || targetId} as friend!` : 'Friend added!');
    } catch {
      setFriendMsg('Failed to add friend');
    }
  };

  const handleUseReferral = async () => {
    if (!referCodeInput.trim()) return;
    try {
      soundManager.playClick();
      const res = await api.useReferral(user.id, referCodeInput);
      if (res.success) {
        setReferMsg(`Success! You received +${res.rewardChips} chips from ${res.referrerName}!`);
        user.chips += res.rewardChips || 100;
      } else {
        setReferMsg(res.error || 'Failed to use referral code');
      }
    } catch {
      setReferMsg('Request failed. Please try again.');
    }
  };

  const copyReferralCode = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const winRate = user.stats.gamesPlayed > 0
    ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ========================================================
            1. FIXED HEADER (NEVER SHIFTS OR RESIZES)
            ======================================================== */}
        <div className="profile-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="avatar-edit-trigger"
              onClick={() => {
                soundManager.playClick();
                setShowAvatarPicker((prev) => !prev);
              }}
              title="Click avatar to change photo or icon"
            >
              <Avatar avatar={currentAvatar} name={user.username} size={50} />
              <div className="avatar-edit-badge" title="Change Avatar">
                📷
              </div>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                {user.username}
              </h2>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 2,
                  fontWeight: 600,
                }}
                onClick={() => {
                  soundManager.playClick();
                  navigator.clipboard.writeText(user.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                title="Click to copy ID"
              >
                ID: {user.id} {copiedId ? <span style={{ color: '#4ade80' }}>✓ Copied</span> : '📋'}
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileUpload}
            />
          </div>

          <button
            type="button"
            className="secondary-ghost-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            id="profile-close-btn"
          >
            ✕ Close
          </button>
        </div>

        {/* Dropdown Avatar Chooser Drawer */}
        {showAvatarPicker && (
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
              borderBottom: '1.5px solid rgba(56, 189, 248, 0.4)',
              padding: '12px 16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              animation: 'fadeIn 0.18s ease',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✨</span> Choose Profile Avatar
              </span>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  fileInputRef.current?.click();
                }}
                style={{
                  flex: 1,
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#ffffff',
                  borderRadius: 10,
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>📷</span> Upload Custom Photo
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              {AVATAR_THEMES.map((theme) => {
                const avatarSvg = getInitialSvg(initialLetter, theme);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className="avatar-preset-btn"
                    onClick={() => {
                      soundManager.playClick();
                      setCurrentAvatar(avatarSvg);
                      onUpdateAvatar?.(avatarSvg);
                      setShowAvatarPicker(false);
                    }}
                    title={theme.name}
                  >
                    <img
                      src={avatarSvg}
                      alt={theme.name}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            2. FIXED DYNAMIC TAB BAR (EVEN SPACING, NO JUMPING)
            ======================================================== */}
        <div className="profile-tab-bar">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`profile-tab-item ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab(tab.id);
                }}
                title={tab.label}
              >
                <span className="tab-icon">{tab.icon}</span>
                {isSelected && <span className="tab-label">{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* ========================================================
            3. SCROLLABLE TAB CONTENT BODY (FLEX: 1 CONTAINER)
            ======================================================== */}
        <div className="profile-modal-body">
          {/* TAB 1: PROFILE & STATS */}
          {activeTab === 'profile' && (
            <div>
              {/* Luxury Chips Balance Hero Banner */}
              <div className="chips-hero-banner">
                <span style={{ fontSize: '0.76rem', color: '#fef08a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Active Chips Balance
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', marginTop: 2 }}>
                  🪙 {user.chips.toLocaleString()}
                </div>
              </div>

              {/* 2x2 Clean Game Stats Grid */}
              <div className="stats-grid-2col">
                <div className="stat-card-compact">
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Games Played</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                    {user.stats.gamesPlayed}
                  </div>
                </div>

                <div className="stat-card-compact">
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Victories</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
                    {user.stats.gamesWon}
                  </div>
                </div>

                <div className="stat-card-compact">
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Win Rate</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                    {winRate}%
                  </div>
                </div>

                <div className="stat-card-compact">
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Zero-Card Wins</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171', marginTop: 2 }}>
                    {user.stats.zeroCardWins}
                  </div>
                </div>
              </div>

              {/* Player ID Share Card */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  marginTop: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Your Player ID:</span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                      {user.id}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-ghost-btn"
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                    onClick={() => {
                      soundManager.playClick();
                      navigator.clipboard.writeText(user.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                  >
                    {copiedId ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  Teammates can enter this ID in Online Multiplayer to find you and send direct game invites!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SCOREBOARD & RANKING */}
          {activeTab === 'scoreboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: '0.98rem', color: '#38bdf8', margin: 0, fontWeight: 700 }}>
                  🏆 Global Scoreboard & Ranking
                </h3>
                <button
                  type="button"
                  className="secondary-ghost-btn"
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  onClick={() => {
                    soundManager.playClick();
                    loadScoreboard();
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {scoreboardLoading ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 8, animation: 'pulse 1s infinite' }}>⏳</div>
                  Fetching global ranking entries...
                </div>
              ) : scoreboard.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🏅</div>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                    Leaderboard Ready
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Play and win matches to record victories and climb to the top of the leaderboard!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scoreboard.map((entry, idx) => {
                    const entryWinRate = entry.stats.gamesPlayed > 0
                      ? Math.round((entry.stats.gamesWon / entry.stats.gamesPlayed) * 100)
                      : 0;
                    const isMe = entry.id === user.id;
                    const rankBadge = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;

                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          background: isMe ? 'rgba(37, 99, 235, 0.2)' : 'rgba(15, 23, 42, 0.65)',
                          border: isMe ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#94a3b8',
                              minWidth: 32,
                            }}
                          >
                            {rankBadge}
                          </span>
                          <Avatar avatar={entry.avatar} name={entry.username} size={32} />
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#ffffff' }}>
                              {entry.username} {isMe && <span style={{ color: '#38bdf8', fontSize: '0.72rem' }}>(You)</span>}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                              ID: {entry.id}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                            {entry.stats.gamesWon} Wins <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({entryWinRate}%)</span>
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#fbbf24' }}>
                            🪙 {entry.chips}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FRIENDS */}
          {activeTab === 'friends' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '0.98rem', color: '#38bdf8', margin: 0, fontWeight: 700 }}>
                  👥 Friends & Player Search
                </h3>
                <button
                  type="button"
                  className="secondary-ghost-btn"
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  onClick={() => {
                    soundManager.playClick();
                    loadFriends();
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Search and Add Friend by Player ID */}
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: 12, borderRadius: 12, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Search & Add Player by ID or Username:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="player-name-input"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
                    placeholder="Enter Player ID or username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchUsers();
                    }}
                  />
                  <button
                    type="button"
                    className="primary-blue-btn"
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '0.8rem' }}
                    onClick={handleSearchUsers}
                  >
                    Search
                  </button>
                </div>

                {friendMsg && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#a7f3d0' }}>
                    {friendMsg}
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Search Results:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {searchResults.map((sr) => {
                        const isAlreadyFriend = friends.some((f) => f.id === sr.id);
                        return (
                          <div
                            key={sr.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 8px',
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar avatar={sr.avatar} name={sr.username} size={28} />
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                                  {sr.username}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>
                                  ID: {sr.id}
                                </span>
                              </div>
                            </div>
                            {isAlreadyFriend ? (
                              <span style={{ fontSize: '0.74rem', color: '#4ade80', fontWeight: 600 }}>✓ Friend</span>
                            ) : (
                              <button
                                type="button"
                                className="secondary-ghost-btn"
                                style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                onClick={() => handleAddFriend(sr.id)}
                              >
                                + Add Friend
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Friend List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ fontSize: '0.84rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                  Your Friends ({friends.length})
                </h4>
              </div>

              {friendsLoading ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Loading friends list...
                </div>
              ) : friends.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 14px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>👥</div>
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                    No Friends Added Yet
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Search above by Player ID or username to add teammates!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '8px 10px',
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar avatar={friend.avatar} name={friend.username} size={32} />
                        <div>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                            {friend.username}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>
                            ID: {friend.id}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: friend.online ? '#4ade80' : '#64748b', marginLeft: 4 }}>
                          ● {friend.online ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      {onInviteFriend && (
                        <button
                          type="button"
                          className="secondary-ghost-btn"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            background: friend.online ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            borderColor: friend.online ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                          }}
                          onClick={() => {
                            soundManager.playClick();
                            onInviteFriend(friend.id);
                          }}
                        >
                          ✉️ Invite
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REFER & EARN */}
          {activeTab === 'refer' && (
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold-light)', margin: '0 0 8px', fontWeight: 700 }}>
                🎁 Refer & Earn Rewards
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px' }}>
                Share your referral code! When a friend joins using your code, you receive <strong>+200 chips</strong> and they receive <strong>+100 bonus chips</strong>!
              </p>

              {/* Referral Voucher Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)',
                  padding: 14,
                  borderRadius: 14,
                  border: '1.5px dashed rgba(245, 158, 11, 0.4)',
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: '0.74rem', color: '#fde68a', fontWeight: 600 }}>Your Unique Referral Code:</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                    {user.referralCode}
                  </span>
                  <button
                    type="button"
                    className="secondary-ghost-btn"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderColor: '#f59e0b', color: '#fbbf24' }}
                    onClick={copyReferralCode}
                  >
                    {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
                  </button>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Referred Friends: <strong>{user.referralCount}</strong> players
                </div>
              </div>

              {/* Enter Friend's referral code */}
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  Have a Friend's Referral Code? Enter it:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="player-name-input"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
                    placeholder="e.g. REF-XXXX"
                    value={referCodeInput}
                    onChange={(e) => setReferCodeInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="primary-gold-btn"
                    style={{ width: 'auto', padding: '7px 14px', fontSize: '0.8rem' }}
                    onClick={handleUseReferral}
                  >
                    Claim Reward
                  </button>
                </div>
                {referMsg && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#a7f3d0' }}>
                    {referMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ABOUT */}
          {activeTab === 'about' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <img
                  src="/logo.png"
                  alt="Six Cards Logo"
                  style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10 }}
                />
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', margin: 0, fontWeight: 800 }}>
                    About Six Cards
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Official Mobile Game Edition</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 10px' }}>
                <strong>Six Cards</strong> is a strategic multiplayer hidden-card memory, replacement, and elimination card game.
              </p>

              <div style={{ padding: 12, background: 'rgba(15, 23, 42, 0.65)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 12 }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#38bdf8' }}>🎮 Game Modes:</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  <li style={{ marginBottom: 4 }}><strong>Mode 1: System AI</strong> — Single-player practice against intelligent decision bot.</li>
                  <li><strong>Mode 2: Multiplayer</strong> — Real-time rooms, friends list, quick room codes, and instant invites.</li>
                </ul>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                Version 3.0.0 • Mobile Game Edition • PostgreSQL / Supabase Cloud DB • React 19 + TypeScript + WebSockets.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================
            4. FIXED FOOTER (PINNED AT BOTTOM)
            ======================================================== */}
        <div className="profile-modal-footer">
          <button
            type="button"
            className="secondary-ghost-btn"
            style={{ color: '#fda4af', borderColor: 'rgba(225, 29, 72, 0.4)', padding: '8px 16px', fontSize: '0.82rem' }}
            onClick={() => {
              soundManager.playClick();
              onLogout();
            }}
            id="profile-logout-btn"
          >
            🚪 Logout
          </button>

          <button
            type="button"
            className="primary-gold-btn"
            style={{ width: 'auto', padding: '8px 24px', fontSize: '0.84rem' }}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
          >
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
