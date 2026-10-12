import React, { useState } from 'react';
import type { RoomPlayerInfo } from '../types/user';
import { soundManager } from '../services/soundManager';
import { Avatar } from './Avatar';

interface LobbyRoomProps {
  roomCode: string;
  mode?: 'multiplayer' | 'lan' | 'online_team';
  isHost: boolean;
  myUserId: string;
  players: RoomPlayerInfo[];
  onlinePlayers?: { id: string; username: string; avatar: string }[];
  networkInfo?: any;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onInvitePlayerId: (targetPlayerId: string) => Promise<{ success: boolean; message?: string }>;
  onAddFriend?: (targetUserId: string) => Promise<boolean>;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  roomCode,
  isHost,
  myUserId,
  players,
  onlinePlayers = [],
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onInvitePlayerId,
  onAddFriend,
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
    soundManager.playClick();
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
    soundManager.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '430px',
        margin: '0 auto',
        padding: '16px 14px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Bar with Badge and Leave button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(37, 99, 235, 0.25))',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🌐</span> Multiplayer Lobby
        </span>

        <button
          type="button"
          className="secondary-ghost-btn"
          onClick={() => {
            soundManager.playClick();
            onLeaveRoom();
          }}
          style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#fda4af', borderColor: 'rgba(225,29,72,0.4)' }}
        >
          🚪 Leave
        </button>
      </div>

      {/* Hero Card: Room Code */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 16,
          padding: '14px 16px',
          marginBottom: 16,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Share Room Code
        </span>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            margin: '8px 0',
          }}
        >
          <span
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#38bdf8',
              letterSpacing: '0.2em',
              textShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
            }}
          >
            {roomCode}
          </span>
          <button
            type="button"
            className="secondary-ghost-btn"
            onClick={copyRoomCode}
            style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' }}
          >
            {copiedCode ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
          Give this code to friends so they can join your lobby instantly!
        </p>
      </div>

      {/* Players in Current Room */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: '0.92rem', color: '#f8fafc', margin: 0, fontWeight: 700 }}>
            Lobby Players ({players.length} / 6)
          </h3>
          <span style={{ fontSize: '0.74rem', color: allReady ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
            {allReady ? '● All Ready' : '⏳ Waiting for Ready'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p) => {
            const isMe = p.userId === myUserId;
            return (
              <div
                key={p.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: isMe ? 'rgba(37, 99, 235, 0.14)' : 'rgba(15, 23, 42, 0.65)',
                  borderRadius: 12,
                  border: isMe ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar avatar={p.avatar} name={p.displayName} size={38} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>{p.displayName}</strong>
                      {p.isHost && <span title="Host">👑</span>}
                      {isMe && <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>(You)</span>}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      ID: {p.userId}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isMe && onAddFriend && (
                    <button
                      type="button"
                      className="secondary-ghost-btn"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={() => onAddFriend(p.userId)}
                    >
                      + Friend
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: p.ready ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: p.ready ? '#4ade80' : '#fbbf24',
                      border: p.ready ? '1px solid #10b981' : '1px solid #f59e0b',
                    }}
                  >
                    {p.ready ? '✓ Ready' : '⏳ Waiting'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Controls: Ready & Start Game */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onToggleReady();
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: 'pointer',
            border: me?.ready ? '1.5px solid #ef4444' : '1.5px solid #10b981',
            background: me?.ready ? 'rgba(239, 68, 68, 0.18)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            boxShadow: me?.ready ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          {me?.ready ? '✕ Cancel Ready' : '✓ I am Ready!'}
        </button>

        {isHost && (
          <button
            type="button"
            className="primary-blue-btn"
            style={{
              width: '100%',
              padding: '13px 16px',
              fontSize: '0.94rem',
              opacity: allReady ? 1 : 0.6,
              cursor: allReady ? 'pointer' : 'not-allowed',
            }}
            disabled={!allReady}
            onClick={() => {
              if (allReady) {
                soundManager.playClick();
                onStartGame();
              }
            }}
          >
            {players.length < 2
              ? 'Waiting for Players (Min 2)...'
              : !allReady
              ? 'Waiting for Everyone to Ready Up...'
              : '🚀 Start Match Now!'}
          </button>
        )}
      </div>

      {/* Manual Invite by ID or Username */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: 12,
          borderRadius: 12,
          marginBottom: 14,
        }}
      >
        <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
          Invite Player by ID or Name:
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="player-name-input"
            style={{ flex: 1, padding: '8px 10px', fontSize: '0.84rem' }}
            placeholder="e.g. guest-xxx or username"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendInvite(inviteInput);
            }}
          />
          <button
            type="button"
            className="primary-blue-btn"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '0.82rem' }}
            onClick={() => handleSendInvite(inviteInput)}
          >
            Invite
          </button>
        </div>

        {inviteStatus && (
          <div
            style={{
              marginTop: 8,
              fontSize: '0.78rem',
              color: inviteStatus.isError ? '#f87171' : '#4ade80',
              fontWeight: 500,
            }}
          >
            {inviteStatus.isError ? '⚠️ ' : '✅ '}
            {inviteStatus.text}
          </div>
        )}
      </div>

      {/* Online Players Quick-Invite Strip */}
      {inviteableOnline.length > 0 && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: 12,
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4ade80' }}>
              🟢 Online Players ({inviteableOnline.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>1-Tap Invite</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '160px', overflowY: 'auto' }}>
            {inviteableOnline.map((op) => (
              <div
                key={op.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '6px 10px',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar avatar={op.avatar} name={op.username} size={28} />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#f8fafc' }}>{op.username}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 4 }}>
                      ({op.id})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="secondary-ghost-btn"
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#4ade80',
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
    </div>
  );
};
