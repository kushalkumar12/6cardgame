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
  { id: 'profile', icon: '👤', label: 'Profile & Stats' },
  { id: 'scoreboard', icon: '🏆', label: 'Scoreboard' },
  { id: 'friends', icon: '👥', label: 'Friends' },
  { id: 'refer', icon: '🎁', label: 'Refer & Earn' },
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

  // Scoreboard tab state
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);

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

  useEffect(() => {
    if (activeTab === 'friends') {
      api.getFriends(user.id).then(setFriends).catch(() => {});
    } else if (activeTab === 'scoreboard') {
      api.getScoreboard().then(setScoreboard).catch(() => {});
    }
  }, [activeTab, user.id]);

  useEffect(() => {
    const handleFriendListUpdate = () => {
      api.getFriends(user.id).then(setFriends).catch(() => {});
    };
    socket.on('friend_list_updated', handleFriendListUpdate);
    return () => {
      socket.off('friend_list_updated', handleFriendListUpdate);
    };
  }, [user.id]);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await api.searchUsers(searchQuery);
      setSearchResults(results.filter((u) => u.id !== user.id));
    } catch {
      setFriendMsg('Search failed');
    }
  };

  const handleAddFriend = async (targetId: string) => {
    try {
      setFriendMsg('Adding friend...');
      const res = await api.sendFriendRequest(user.id, targetId);
      await api.addFriend(user.id, targetId);
      const updated = await api.getFriends(user.id);
      setFriends(updated);
      setFriendMsg(res.success ? `Added ${res.targetUser?.username || targetId} as friend!` : 'Friend added!');
    } catch {
      setFriendMsg('Failed to add friend');
    }
  };

  const handleUseReferral = async () => {
    if (!referCodeInput.trim()) return;
    try {
      const res = await api.useReferral(user.id, referCodeInput);
      if (res.success) {
        setReferMsg(`Success! You received +${res.rewardChips} chips from ${res.referrerName}!`);
      } else {
        setReferMsg(res.error || 'Failed to use referral code');
      }
    } catch {
      setReferMsg('Request failed');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const winRate = user.stats.gamesPlayed > 0
    ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ width: '92%', maxWidth: '440px', margin: 'auto', textAlign: 'left', maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        {/* Header with user quick badge, avatar edit trigger, and close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="avatar-edit-trigger"
              onClick={() => {
                soundManager.playClick();
                setShowAvatarPicker((prev) => !prev);
              }}
              title="Click avatar to change photo or pick icon"
            >
              <Avatar avatar={currentAvatar} name={user.username} size={56} />
              <div className="avatar-edit-badge" title="Change Avatar">
                📷
              </div>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{user.username}</h2>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 3,
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
          <button className="secondary-ghost-btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Close
          </button>
        </div>

        {/* Avatar Chooser Popup */}
        {showAvatarPicker && (
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✨</span> Choose Profile Avatar
              </span>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Option A: Upload Photo */}
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  fileInputRef.current?.click();
                }}
                style={{
                  width: '100%',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#ffffff',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>📷</span> Upload Photo
              </button>
            </div>

            {/* Option B: Pick one from 5 avatars based on first letter */}
            <div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>
                Or pick an avatar with your letter <strong>"{initialLetter}"</strong>:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                        }}
                      />
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{theme.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation: Only selected shows label, others show only icon */}
        <div className="profile-tab-bar">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
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

        {/* TAB 1: PROFILE & STATS */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Games Played</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                  {user.stats.gamesPlayed}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Victories</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a7f3d0', marginTop: 4 }}>
                  {user.stats.gamesWon}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Win Rate</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-light)', marginTop: 4 }}>
                  {winRate}%
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Zero-Card Wins</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--crimson)', marginTop: 4 }}>
                  {user.stats.zeroCardWins}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chips Balance</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-primary)', marginTop: 4 }}>
                  🪙 {user.chips}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(212,175,55,0.1)', padding: 14, borderRadius: 8, border: '1px solid rgba(212,175,55,0.25)', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--gold-light)' }}>
                <strong>Tip:</strong> Share your unique Player ID <code>{user.id}</code> with friends so they can add you to their game team in Online Multiplayer!
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SCOREBOARD & RANKING */}
        {activeTab === 'scoreboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', margin: 0, fontWeight: 700 }}>
                🏆 Global Scoreboard & Ranking
              </h3>
              <button
                type="button"
                className="secondary-ghost-btn"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => {
                  soundManager.playClick();
                  api.getScoreboard().then(setScoreboard).catch(() => {});
                }}
              >
                🔄 Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '380px', overflowY: 'auto' }}>
              {scoreboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading ranking entries...
                </div>
              ) : (
                scoreboard.map((entry, idx) => {
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
                        padding: '10px 12px',
                        background: isMe ? 'rgba(37, 99, 235, 0.15)' : 'rgba(15, 23, 42, 0.65)',
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
                        <Avatar avatar={entry.avatar} name={entry.username} size={34} />
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
                            {entry.username} {isMe && <span style={{ color: '#38bdf8', fontSize: '0.72rem' }}>(You)</span>}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                            ID: {entry.id}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#38bdf8' }}>
                          {entry.stats.gamesWon} Wins <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({entryWinRate}%)</span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#fbbf24' }}>
                          🪙 {entry.chips}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FRIENDS */}
        {activeTab === 'friends' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', margin: 0, fontWeight: 700 }}>
                👥 Friends & Player Search
              </h3>
              <button
                type="button"
                className="secondary-ghost-btn"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => {
                  soundManager.playClick();
                  setFriendMsg('Refreshing friends list...');
                  api.getFriends(user.id).then((fl) => {
                    setFriends(fl);
                    setFriendMsg('');
                  }).catch(() => setFriendMsg('Failed to refresh'));
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Search and Add Friend by Player ID */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 16 }}>
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Search & Add Player by ID or Username:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  className="player-name-input"
                  style={{ flex: 1, padding: '8px 10px', fontSize: '0.84rem' }}
                  placeholder="Enter Player ID like guest-xxx or name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchUsers();
                  }}
                />
                <button
                  type="button"
                  className="primary-blue-btn"
                  style={{ width: 'auto', padding: '8px 14px', fontSize: '0.82rem' }}
                  onClick={handleSearchUsers}
                >
                  Search
                </button>
              </div>

              {friendMsg && (
                <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#a7f3d0' }}>
                  {friendMsg}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Search Results:</span>
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
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                                {sr.username}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                                ID: {sr.id}
                              </span>
                            </div>
                          </div>
                          {isAlreadyFriend ? (
                            <span style={{ fontSize: '0.76rem', color: '#4ade80', fontWeight: 600 }}>✓ Friend</span>
                          ) : (
                            <button
                              type="button"
                              className="secondary-ghost-btn"
                              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
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
              <h4 style={{ fontSize: '0.88rem', color: '#f8fafc', margin: 0 }}>
                Your Friends ({friends.length})
              </h4>
            </div>

            {friends.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textAlign: 'center', padding: '16px 0' }}>
                You have not added any friends yet. Search above by Player ID to add your teammates!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto' }}>
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar avatar={friend.avatar} name={friend.username} size={34} />
                      <div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                          {friend.username}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                          ID: {friend.id}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: friend.online ? '#4ade80' : '#64748b', marginLeft: 4 }}>
                        ● {friend.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {onInviteFriend && friend.online && (
                      <button
                        type="button"
                        className="secondary-ghost-btn"
                        style={{ padding: '4px 10px', fontSize: '0.76rem', background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' }}
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
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: 12 }}>
              🎁 Refer & Earn Rewards
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Invite your friends to Six Cards! When a friend joins using your referral code, you earn <strong>+200 chips</strong> and they earn <strong>+100 bonus chips</strong>!
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 18, borderRadius: 10, margin: '16px 0' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Your Unique Referral Code:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: '0.08em' }}>
                  {user.referralCode}
                </span>
                <button className="secondary-ghost-btn" onClick={copyReferralCode}>
                  {copiedCode ? '✓ Copied!' : '📋 Copy Code'}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Referred Friends: <strong>{user.referralCount}</strong> players
              </div>
            </div>

            {/* Enter Friend's referral code */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: 16, borderRadius: 10 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
                Have a Friend&apos;s Referral Code? Enter it below:
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="player-name-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. ACE100 or REF-XXXX"
                  value={referCodeInput}
                  onChange={(e) => setReferCodeInput(e.target.value)}
                />
                <button className="primary-gold-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleUseReferral}>
                  Claim Reward
                </button>
              </div>
              {referMsg && (
                <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#a7f3d0' }}>
                  {referMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ABOUT */}
        {activeTab === 'about' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <img
                src="/logo.png"
                alt="Six Cards Logo"
                style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
              />
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-light)', margin: 0 }}>
                  About Six Cards
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Game Edition</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>Six Cards</strong> is a strategic multiplayer hidden-card memory, replacement, and elimination game.
            </p>
            <div style={{ margin: '14px 0', padding: 14, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p><strong>🌐 Modes Overview:</strong></p>
              <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                <li><strong>Mode 1: Play with System (AI)</strong> — Practice solo 1-on-1 against the intelligent System AI bot.</li>
                <li><strong>Mode 2: Multiplayer (Rooms & Friends)</strong> — Real-time multiplayer. Create private game lobbies, share quick Room Codes, search player IDs, and invite online friends across devices.</li>
              </ul>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Version 3.0.0 • PostgreSQL / Supabase DB Backend • Profiles (Dev/Prod/Test) • Built with React 19, TypeScript & WebSockets.
            </p>
          </div>
        )}

        {/* Footer with Logout action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <button
            className="secondary-ghost-btn"
            style={{ color: '#fda4af', borderColor: 'rgba(225,29,72,0.4)' }}
            onClick={onLogout}
            id="profile-logout-btn"
          >
            🚪 Logout
          </button>
          <button className="primary-gold-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={onClose}>
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
