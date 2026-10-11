import React from 'react';
import type { UserProfile } from '../types/user';

interface HeaderProps {
  roundNumber: number;
  firstRoundCompleted: boolean;
  onOpenRules: () => void;
  onRestartGame: () => void;
  isGameActive: boolean;
  user: UserProfile | null;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roundNumber,
  firstRoundCompleted,
  onOpenRules,
  onRestartGame,
  isGameActive,
  user,
  onOpenProfile,
}) => {
  return (
    <header className="app-header">
      <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/logo.png"
          alt="Six Cards Logo"
          style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        />
        <h1 className="brand-title">Six Cards</h1>
      </div>

      <div className="header-status-group">
        {isGameActive && (
          <div className="round-pill">
            Round {roundNumber} {firstRoundCompleted ? '(Victory Declaration Eligible)' : '(Round 1)'}
          </div>
        )}

        <button className="header-btn" onClick={onOpenRules} aria-label="Open Game Rules" id="rules-btn">
          📜 Rules
        </button>

        {user && (
          <button
            className="header-btn"
            style={{ borderColor: 'var(--gold-primary)', color: 'var(--gold-light)' }}
            onClick={onOpenProfile}
            id="profile-btn"
          >
            <span>{user.avatar}</span>
            <strong>{user.username}</strong>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({user.id})</span>
          </button>
        )}

        {isGameActive && (
          <button
            className="header-btn"
            style={{ color: '#fda4af', borderColor: 'rgba(225,29,72,0.3)' }}
            onClick={onRestartGame}
            aria-label="Restart game"
            id="restart-game-btn"
          >
            ↺ Leave Game
          </button>
        )}
      </div>
    </header>
  );
};
