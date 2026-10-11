import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { UserProfile, FriendUser, ScoreboardEntry } from '../types/user';

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onLogout: () => void;
  onInviteFriend?: (friendId: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onLogout,
  onInviteFriend,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'scoreboard' | 'friends' | 'refer' | 'about'>('profile');
  
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

  useEffect(() => {
    if (activeTab === 'friends') {
      api.getFriends(user.id).then(setFriends).catch(() => {});
    } else if (activeTab === 'scoreboard') {
      api.getScoreboard().then(setScoreboard).catch(() => {});
    }
  }, [activeTab, user.id]);

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
      const res = await api.addFriend(user.id, targetId);
      if (res.success) {
        setFriendMsg(`Added ${res.friend.username} as friend!`);
        api.getFriends(user.id).then(setFriends);
      } else {
        setFriendMsg(res.error || 'Failed to add friend');
      }
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
      <div className="modal-dialog" style={{ maxWidth: '780px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header with user quick badge and close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>{user.avatar}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user.username}</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--gold-light)', background: 'rgba(212,175,55,0.15)', padding: '2px 8px', borderRadius: 4 }}>
                Player ID: {user.id}
              </span>
            </div>
          </div>
          <button className="secondary-ghost-btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Close
          </button>
        </div>

        {/* Tab Navigation (Horizontally scrollable on mobile) */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 6, marginBottom: 18, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          <button
            className={`header-btn ${activeTab === 'profile' ? 'active-tab' : ''}`}
            style={{ borderColor: activeTab === 'profile' ? 'var(--gold-primary)' : undefined }}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile & Stats
          </button>
          <button
            className={`header-btn ${activeTab === 'scoreboard' ? 'active-tab' : ''}`}
            style={{ borderColor: activeTab === 'scoreboard' ? 'var(--gold-primary)' : undefined }}
            onClick={() => setActiveTab('scoreboard')}
          >
            🏆 Scoreboard
          </button>
          <button
            className={`header-btn ${activeTab === 'friends' ? 'active-tab' : ''}`}
            style={{ borderColor: activeTab === 'friends' ? 'var(--gold-primary)' : undefined }}
            onClick={() => setActiveTab('friends')}
          >
            👥 Friends
          </button>
          <button
            className={`header-btn ${activeTab === 'refer' ? 'active-tab' : ''}`}
            style={{ borderColor: activeTab === 'refer' ? 'var(--gold-primary)' : undefined }}
            onClick={() => setActiveTab('refer')}
          >
            🎁 Refer & Earn
          </button>
          <button
            className={`header-btn ${activeTab === 'about' ? 'active-tab' : ''}`}
            style={{ borderColor: activeTab === 'about' ? 'var(--gold-primary)' : undefined }}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ About
          </button>
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

        {/* TAB 2: SCOREBOARD */}
        {activeTab === 'scoreboard' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: 12 }}>
              🏆 Global Scoreboard & Leaderboard
            </h3>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Player ID</th>
                    <th>Wins</th>
                    <th>Win Rate</th>
                    <th>Chips</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreboard.map((entry, idx) => {
                    const entryWinRate = entry.stats.gamesPlayed > 0
                      ? Math.round((entry.stats.gamesWon / entry.stats.gamesPlayed) * 100)
                      : 0;
                    return (
                      <tr key={entry.id} className={entry.id === user.id ? 'winner-row' : ''}>
                        <td>#{idx + 1}</td>
                        <td>
                          <span style={{ marginRight: 6 }}>{entry.avatar}</span>
                          <strong>{entry.username}</strong>
                        </td>
                        <td><code>{entry.id}</code></td>
                        <td>{entry.stats.gamesWon}</td>
                        <td>{entryWinRate}%</td>
                        <td style={{ color: 'var(--gold-light)' }}>🪙 {entry.chips}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FRIENDS */}
        {activeTab === 'friends' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-light)', marginBottom: 12 }}>
              👥 Friends & Player Search
            </h3>

            {/* Search and Add Friend by Player ID */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 10, marginBottom: 18 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
                Search & Add Player by ID or Username (e.g. <code>#P-1001</code>)
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="player-name-input"
                  style={{ flex: 1 }}
                  placeholder="Enter Player ID like P-1001 or Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="primary-gold-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleSearchUsers}>
                  Search
                </button>
              </div>

              {friendMsg && (
                <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#a7f3d0' }}>
                  {friendMsg}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Search Results:</span>
                  {searchResults.map((sr) => (
                    <div key={sr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <span>{sr.avatar} {sr.username} (<code>{sr.id}</code>)</span>
                      <button className="secondary-ghost-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleAddFriend(sr.id)}>
                        + Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Friend List */}
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 10 }}>
              Your Friends ({friends.length})
            </h4>
            {friends.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                You have not added any friends yet. Search above by Player ID to add your teammates!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '10px 14px',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.4rem' }}>{friend.avatar}</span>
                      <div>
                        <strong>{friend.username}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                          ID: <code>{friend.id}</code>
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: friend.online ? '#a7f3d0' : 'var(--text-muted)', marginLeft: 8 }}>
                        ● {friend.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {onInviteFriend && friend.online && (
                      <button
                        className="header-btn"
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                        onClick={() => onInviteFriend(friend.id)}
                      >
                        ✉️ Invite to Game
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
            🚪 Logout & Switch Account
          </button>
          <button className="primary-gold-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={onClose}>
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
