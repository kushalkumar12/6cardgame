import React from 'react';

export type GamePlayMode = 'system' | 'multiplayer' | 'online_team' | 'lan' | 'pass_and_play';

interface ModeSelectProps {
  onSelectMode: (mode: GamePlayMode) => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelectMode }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        margin: '24px 0',
      }}
    >
      {/* MODE 1: PLAY WITH SYSTEM AI */}
      <div
        className="opponent-mat"
        style={{
          cursor: 'pointer',
          textAlign: 'left',
          padding: 24,
          transition: 'all 0.2s',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.03)',
        }}
        onClick={() => onSelectMode('system')}
        id="mode-system-btn"
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤖</div>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold-light)', marginBottom: 8 }}>
          1. Play with System AI
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Solo tactical match vs an intelligent bot. Autonomous card memory, adaptive discards, and point matching.
        </p>
        <div style={{ marginTop: 18 }}>
          <span className="round-pill" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Instant AI Match
          </span>
        </div>
      </div>

      {/* MODE 2: MULTIPLAYER LOBBY (ROOMS & TEAMS) */}
      <div
        className="opponent-mat"
        style={{
          cursor: 'pointer',
          textAlign: 'left',
          padding: 24,
          transition: 'all 0.2s',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.03)',
        }}
        onClick={() => onSelectMode('multiplayer')}
        id="mode-multiplayer-btn"
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌐</div>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--gold-light)', marginBottom: 8 }}>
          2. Multiplayer (Rooms & Friends)
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Real-time multiplayer across devices. Create custom lobbies, share quick Room Codes, search player IDs, and invite online friends.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="round-pill" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Room Codes
          </span>
          <span className="round-pill" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Friend Invites
          </span>
        </div>
      </div>
    </div>
  );
};
