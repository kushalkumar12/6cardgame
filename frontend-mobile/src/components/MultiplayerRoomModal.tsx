import React, { useState } from 'react';
import { soundManager } from '../services/soundManager';
import { Avatar } from './Avatar';

interface MultiplayerRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (mode: 'online_team' | 'multiplayer', maxPlayers: number) => void;
  onJoinRoom: (roomCode: string) => void;
  onlinePlayersCount: number;
  onlinePlayers: { id: string; username: string; avatar: string }[];
  currentUserId?: string;
}

export const MultiplayerRoomModal: React.FC<MultiplayerRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onlinePlayersCount,
  onlinePlayers,
  currentUserId,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'players'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [roomMode, setRoomMode] = useState<'online_team' | 'multiplayer'>('online_team');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    soundManager.playClick();
    onCreateRoom(roomMode, maxPlayers);
  };

  const handleJoin = () => {
    const clean = roomCode.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Please enter a valid room code');
      return;
    }
    soundManager.playClick();
    onJoinRoom(clean);
  };

  const handlePasteCode = async () => {
    try {
      soundManager.playClick();
      const text = await navigator.clipboard.readText();
      if (text) {
        setRoomCode(text.trim().toUpperCase().slice(0, 8));
        setErrorMsg('');
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{
          width: '92%',
          maxWidth: '430px',
          margin: 'auto',
          padding: '20px 18px',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>🌐</span>
            <h2 style={{ margin: 0, fontSize: '1.18rem', color: '#ffffff' }}>Online Multiplayer</h2>
          </div>
          <button
            type="button"
            className="secondary-ghost-btn"
            onClick={onClose}
            style={{ padding: '4px 10px', fontSize: '0.82rem' }}
          >
            ✕ Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.7)',
            padding: 4,
            borderRadius: 12,
            marginBottom: 18,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            className={`profile-tab-item ${tab === 'create' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTab('create');
              setErrorMsg('');
            }}
            style={{ padding: '8px 6px', fontSize: '0.8rem', justifyContent: 'center' }}
          >
            <span className="tab-icon">➕</span>
            <span className="tab-label" style={{ marginLeft: 4 }}>Create</span>
          </button>

          <button
            type="button"
            className={`profile-tab-item ${tab === 'join' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTab('join');
              setErrorMsg('');
            }}
            style={{ padding: '8px 6px', fontSize: '0.8rem', justifyContent: 'center' }}
          >
            <span className="tab-icon">🔑</span>
            <span className="tab-label" style={{ marginLeft: 4 }}>Join</span>
          </button>

          <button
            type="button"
            className={`profile-tab-item ${tab === 'players' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playClick();
              setTab('players');
              setErrorMsg('');
            }}
            style={{ padding: '8px 6px', fontSize: '0.8rem', justifyContent: 'center' }}
          >
            <span className="tab-icon">🟢</span>
            <span className="tab-label" style={{ marginLeft: 4 }}>Online ({onlinePlayersCount})</span>
          </button>
        </div>

        {/* TAB 1: CREATE ROOM */}
        {tab === 'create' && (
          <div>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                Select Max Players:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setMaxPlayers(num);
                    }}
                    style={{
                      padding: '10px 0',
                      borderRadius: 10,
                      border: maxPlayers === num ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                      background: maxPlayers === num ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(255,255,255,0.04)',
                      color: maxPlayers === num ? '#ffffff' : '#cbd5e1',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: maxPlayers === num ? '0 2px 10px rgba(37,99,235,0.35)' : 'none',
                    }}
                  >
                    {num} Players
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                Game Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setRoomMode('online_team');
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: roomMode === 'online_team' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    background: roomMode === 'online_team' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(255,255,255,0.04)',
                    color: roomMode === 'online_team' ? '#ffffff' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Team / Lobby
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setRoomMode('multiplayer');
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: roomMode === 'multiplayer' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    background: roomMode === 'multiplayer' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(255,255,255,0.04)',
                    color: roomMode === 'multiplayer' ? '#ffffff' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  🎲 Classic Match
                </button>
              </div>
            </div>

            <button
              type="button"
              className="primary-blue-btn"
              onClick={handleCreate}
              style={{ width: '100%', padding: '13px 16px', fontSize: '0.94rem' }}
            >
              🚀 Create Room & Open Lobby
            </button>
          </div>
        )}

        {/* TAB 2: JOIN ROOM */}
        {tab === 'join' && (
          <div>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <label style={{ fontSize: '0.84rem', color: '#94a3b8', display: 'block', marginBottom: 10 }}>
                Enter 4 to 6 Character Room Code:
              </label>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  maxLength={8}
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoin();
                  }}
                  placeholder="e.g. 7K2X"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1.5px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: 10,
                    padding: '12px 10px',
                    color: '#38bdf8',
                    fontSize: '1.18rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '0.14em',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  type="button"
                  className="secondary-ghost-btn"
                  onClick={handlePasteCode}
                  style={{ padding: '12px 12px', fontSize: '0.84rem', flexShrink: 0, whiteSpace: 'nowrap' }}
                  title="Paste from clipboard"
                >
                  📋 Paste
                </button>
              </div>

              {errorMsg && (
                <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#f87171' }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>

            <button
              type="button"
              className="primary-blue-btn"
              onClick={handleJoin}
              style={{ width: '100%', padding: '13px 16px', fontSize: '0.94rem' }}
            >
              🔑 Join Room Now
            </button>
          </div>
        )}

        {/* TAB 3: ONLINE PLAYERS */}
        {tab === 'players' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Players Connected to Server:
              </span>
              <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>
                ● {onlinePlayersCount} Live
              </span>
            </div>

            {onlinePlayers.length === 0 ? (
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 10,
                  padding: '24px 14px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No other players online right now. Share a room code or invite friends!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto' }}>
                {onlinePlayers.map((player) => {
                  const isMe = player.id === currentUserId;
                  return (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar avatar={player.avatar} name={player.username} size={32} />
                        <div>
                          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                            {player.username} {isMe && <span style={{ color: '#38bdf8' }}>(You)</span>}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                            ID: {player.id}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600 }}>
                        ● Online
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
