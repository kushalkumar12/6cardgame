import React, { useState } from 'react';
import type { RoomPlayerInfo, NetworkInfo } from '../types/user';

interface LobbyRoomProps {
  roomCode: string;
  mode: 'lan' | 'online_team';
  isHost: boolean;
  myUserId: string;
  players: RoomPlayerInfo[];
  networkInfo: NetworkInfo | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onInvitePlayerId: (targetPlayerId: string) => Promise<boolean>;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  roomCode,
  mode,
  isHost,
  myUserId,
  players,
  networkInfo,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onInvitePlayerId,
}) => {
  const [inviteInput, setInviteInput] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const me = players.find((p) => p.userId === myUserId);
  const allReady = players.length >= 2 && players.every((p) => p.ready);

  const handleInvite = async () => {
    if (!inviteInput.trim()) return;
    setInviteStatus('Sending invite...');
    const ok = await onInvitePlayerId(inviteInput.trim());
    if (ok) {
      setInviteStatus(`Invitation sent to ${inviteInput.trim()}!`);
      setInviteInput('');
    } else {
      setInviteStatus('Failed to send invite (player may be offline).');
    }
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
        <button className="secondary-ghost-btn" onClick={onLeaveRoom} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
          Leave Room
        </button>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Room Code:</span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '6px 0' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: '0.1em' }}>
            {roomCode}
          </span>
          <button className="secondary-ghost-btn" onClick={copyRoomCode}>
            {copiedCode ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {mode === 'lan' && networkInfo && (
          <div style={{ marginTop: 8, fontSize: '0.84rem', color: '#a7f3d0' }}>
            📱 On another phone/device on same WiFi, open: <code>{networkInfo.lanUrl}</code> and enter code <strong>{roomCode}</strong>.
          </div>
        )}
      </div>

      {/* Online Team Search & Invite */}
      <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 10, marginBottom: 20, textAlign: 'left' }}>
        <label style={{ fontSize: '0.84rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
          Invite Player by Player ID (e.g. <code>#P-1001</code>)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="player-name-input"
            style={{ flex: 1 }}
            placeholder="Enter Player ID (e.g. P-1001)"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
          />
          <button className="primary-gold-btn" style={{ width: 'auto', padding: '8px 18px', fontSize: '0.9rem' }} onClick={handleInvite}>
            Send Invite
          </button>
        </div>
        {inviteStatus && (
          <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#a7f3d0' }}>
            {inviteStatus}
          </div>
        )}
      </div>

      {/* Player List */}
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
                <strong>{p.displayName}</strong> {p.isHost && <span style={{ color: 'var(--gold-light)', fontSize: '0.75rem' }}>(Host)</span>}
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

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          className={`action-btn ${me?.ready ? 'action-btn-neutral' : 'action-btn-declare'}`}
          onClick={onToggleReady}
        >
          {me?.ready ? 'Cancel Ready' : 'I am Ready!'}
        </button>

        {isHost && (
          <button
            className="primary-gold-btn"
            style={{ width: 'auto', padding: '12px 28px' }}
            disabled={!allReady}
            onClick={onStartGame}
          >
            {players.length < 2 ? 'Waiting for Players (Min 2)...' : 'Start Match!'}
          </button>
        )}
      </div>
    </div>
  );
};
