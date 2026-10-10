import React from 'react';
import type { NetworkInfo } from '../types/user';

export type GamePlayMode = 'system' | 'lan' | 'online_team' | 'pass_and_play';

interface ModeSelectProps {
  onSelectMode: (mode: GamePlayMode) => void;
  networkInfo: NetworkInfo | null;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({
  onSelectMode,
  networkInfo,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, margin: '20px 0' }}>
      {/* MODE 1: PLAY WITH SYSTEM */}
      <div
        className="opponent-mat"
        style={{ cursor: 'pointer', textAlign: 'left', padding: 20, transition: 'all 0.2s', border: '1px solid var(--glass-border)' }}
        onClick={() => onSelectMode('system')}
        id="mode-system-btn"
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤖</div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-light)', marginBottom: 6 }}>
          1. Play with System
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Solo play vs an intelligent System AI bot. One human player vs the AI with automated strategic moves and card memory.
        </p>
        <div style={{ marginTop: 14 }}>
          <span className="round-pill" style={{ fontSize: '0.75rem' }}>
            Instant AI Match
          </span>
        </div>
      </div>

      {/* MODE 2: LOCALHOST / SAME WIFI LAN */}
      <div
        className="opponent-mat"
        style={{ cursor: 'pointer', textAlign: 'left', padding: 20, transition: 'all 0.2s', border: '1px solid var(--glass-border)' }}
        onClick={() => onSelectMode('lan')}
        id="mode-lan-btn"
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📶</div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-light)', marginBottom: 6 }}>
          2. Same WiFi / Localhost
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Connect devices on the same WiFi network or multiple browser tabs on localhost. Each player has their own private screen!
        </p>
        {networkInfo && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#a7f3d0' }}>
            WiFi URL: <code>{networkInfo.lanUrl}</code>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <span className="round-pill" style={{ fontSize: '0.75rem' }}>
            LAN Room Code
          </span>
        </div>
      </div>

      {/* MODE 3: ONLINE MULTIPLAYER TEAM & SEARCH */}
      <div
        className="opponent-mat"
        style={{ cursor: 'pointer', textAlign: 'left', padding: 20, transition: 'all 0.2s', border: '1px solid var(--glass-border)' }}
        onClick={() => onSelectMode('online_team')}
        id="mode-online-team-btn"
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌐</div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--gold-light)', marginBottom: 6 }}>
          3. Online Team & Search
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Search and add players by their Player ID. Create a multiplayer game team, send live room invitations, and play online.
        </p>
        <div style={{ marginTop: 14 }}>
          <span className="round-pill" style={{ fontSize: '0.75rem' }}>
            Player ID Matching
          </span>
        </div>
      </div>
    </div>
  );
};
