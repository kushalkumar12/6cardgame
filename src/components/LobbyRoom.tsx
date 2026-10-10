import React, { useState } from 'react';
import type { RoomPlayerInfo, NetworkInfo } from '../types/user';

interface LobbyRoomProps {
  roomCode: string;
  mode: 'lan' | 'online_team';
  isHost: boolean;
  myUserId: string;
  players: RoomPlayerInfo[];
  onlinePlayers?: { id: string; username: string; avatar: string }[];
  networkInfo: NetworkInfo | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onInvitePlayerId: (targetPlayerId: string) => Promise<{ success: boolean; message?: string }>;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  roomCode,
  mode,
  isHost,
  myUserId,
  players,
  onlinePlayers = [],
  networkInfo,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onInvitePlayerId,
}) => {
  const [inviteInput, setInviteInput] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const me = players.find((p) => p.userId === myUserId);
  const allReady = players.length >= 2 && players.every((p) => p.ready);

  // Filter available online players (exclude players already in lobby and self)
  const existingUserIds = new Set(players.map((p) => p.userId.toUpperCase()));
  existingUserIds.add(myUserId.toUpperCase());
  const inviteableOnline = onlinePlayers.filter(
    (op) => !existingUserIds.has(op.id.toUpperCase())
  );

  const handleSendInvite = async (targetId: string) => {
    if (!targetId.trim()) return;
    setInvitingId(targetId);
    setInviteStatus({ text: `Inviting ${targetId}...`, isError: false });

    const res = await onInvitePlayerId(targetId.trim());
    if (res.success) {
      setInviteStatus({
        text: res.message || `Invitation sent to ${targetId}!`,
        isError: false,
      });
      if (inviteInput.trim().toUpperCase() === targetId.trim().toUpperCase()) {
        setInviteInput('');
      }
    } else {
      setInviteStatus({
        text: res.message || 'Failed to send invitation.',
        isError: true,
      });
    }
    setInvitingId(null);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="setup-card" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="round-pill">
          {mode === 'lan' ? '📶 Same WiFi / Localhost LAN' : '🌐 Online Team Lobby'}
        </span>
        <button
          type="button"
          className="secondary-ghost-btn"
          onClick={onLeaveRoom}
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          Leave Room
        </button>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Room Code:</span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '6px 0' }}>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: '0.12em' }}>
            {roomCode}
          </span>
          <button type="button" className="secondary-ghost-btn" onClick={copyRoomCode}>
            {copiedCode ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {mode === 'lan' && networkInfo && (
          <div style={{ marginTop: 8, fontSize: '0.84rem', color: '#a7f3d0' }}>
            📱 On another phone/device on same WiFi, open: <code>{networkInfo.lanUrl}</code> and enter code{' '}
            <strong>{roomCode}</strong>.
          </div>
        )}
      </div>

      {/* Manual Invite by ID or Username */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          padding: 14,
          borderRadius: 10,
          marginBottom: 16,
          textAlign: 'left',
        }}
      >
        <label style={{ fontSize: '0.84rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
          Invite Player by Player ID (e.g. <code>#P-1002</code>) or Username
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="player-name-input"
            style={{ flex: 1 }}
            placeholder="Enter Player ID (e.g. #P-1002 or 1002) or Name"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendInvite(inviteInput);
            }}
          />
          <button
            type="button"
            className="primary-gold-btn"
            style={{ width: 'auto', padding: '8px 18px', fontSize: '0.9rem' }}
            disabled={!inviteInput.trim() || invitingId === inviteInput.trim()}
            onClick={() => handleSendInvite(inviteInput)}
          >
            {invitingId === inviteInput.trim() ? 'Sending...' : 'Send Invite'}
          </button>
        </div>

        {inviteStatus && (
          <div
            style={{
              marginTop: 8,
              fontSize: '0.82rem',
              color: inviteStatus.isError ? '#fda4af' : '#a7f3d0',
              fontWeight: 500,
            }}
          >
            {inviteStatus.isError ? '⚠️ ' : '✅ '}
            {inviteStatus.text}
          </div>
        )}
      </div>

      {/* Online Players Quick-Invite List */}
      {inviteableOnline.length > 0 && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6ee7b7' }}>
              🟢 Online Players Right Now ({inviteableOnline.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1-Click Invite</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inviteableOnline.map((op) => (
              <div
                key={op.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '8px 12px',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{op.avatar}</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f3f4f6' }}>{op.username}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({op.id})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="secondary-ghost-btn"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                  }}
                  disabled={invitingId === op.id}
                  onClick={() => handleSendInvite(op.id)}
                >
                  {invitingId === op.id ? 'Sending...' : '✉️ Invite'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players in Current Room */}
      <h3 style={{ fontSize: '1rem', color: 'var(--gold-light)', textAlign: 'left', marginBottom: 12 }}>
        Lobby Players ({players.length} / 6)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {players.map((p) => (
          <div
            key={p.userId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              border: p.userId === myUserId ? '1px solid var(--gold-primary)' : '1px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{p.avatar}</span>
              <div style={{ textAlign: 'left' }}>
                <strong>{p.displayName}</strong>{' '}
                {p.isHost && (
                  <span style={{ color: 'var(--gold-light)', fontSize: '0.75rem', fontWeight: 600 }}>
                    (Host)
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  ID: <code>{p.userId}</code>
                </span>
              </div>
            </div>

            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: p.ready ? '#a7f3d0' : '#fda4af' }}>
              {p.ready ? '✓ Ready' : '⏳ Not Ready'}
            </span>
          </div>
        ))}
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`action-btn ${me?.ready ? 'action-btn-neutral' : 'action-btn-declare'}`}
          onClick={onToggleReady}
        >
          {me?.ready ? 'Cancel Ready' : 'I am Ready!'}
        </button>

        {isHost && (
          <button
            type="button"
            className="primary-gold-btn"
            style={{ width: 'auto', padding: '12px 28px' }}
            disabled={!allReady}
            onClick={onStartGame}
          >
            {players.length < 2
              ? 'Waiting for Players (Min 2)...'
              : !allReady
              ? 'Waiting for All Players to Ready Up...'
              : 'Start Match! 🚀'}
          </button>
        )}
      </div>
    </div>
  );
};
