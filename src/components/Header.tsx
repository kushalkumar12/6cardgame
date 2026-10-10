import React from 'react';

interface HeaderProps {
  roundNumber: number;
  firstRoundCompleted: boolean;
  onOpenRules: () => void;
  onRestartGame: () => void;
  isGameActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roundNumber,
  firstRoundCompleted,
  onOpenRules,
  onRestartGame,
  isGameActive,
}) => {
  return (
    <header className="app-header">
      <div className="brand-badge">
        <span style={{ fontSize: '1.6rem', color: 'var(--gold-primary)' }}>♠</span>
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

        {isGameActive && (
          <button
            className="header-btn"
            style={{ color: '#fda4af', borderColor: 'rgba(225,29,72,0.3)' }}
            onClick={onRestartGame}
            aria-label="Restart game"
            id="restart-game-btn"
          >
            ↺ New Game
          </button>
        )}
      </div>
    </header>
  );
};
