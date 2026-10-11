import React, { useState } from 'react';
import type { Player } from '../types/game';
import { CardView } from './CardView';
import { soundManager } from '../services/soundManager';

interface PlayerMatProps {
  player: Player;
  isActiveTurn: boolean;
  isSelf: boolean;
  onCardClick?: (index: number) => void;
  interactive?: boolean;
  selectedIndices?: number[];
  targetIndices?: number[];
  prompt?: string;
  onMenuClick?: () => void;
}

export const PlayerMat: React.FC<PlayerMatProps> = ({
  player,
  isActiveTurn,
  isSelf,
  onCardClick,
  interactive = false,
  selectedIndices = [],
  targetIndices = [],
  prompt,
}) => {
  // Layout mode for "You" mat: 'line' (1x6) vs 'grid' (2x3)
  const [layoutMode, setLayoutMode] = useState<'line' | 'grid'>('line');

  if (!isSelf) {
    // OPPONENT MAT (e.g. "Bot" in Screen 3)
    const displayName = player.displayName.replace(/ \(Bot\)/i, '');

    return (
      <div className={`player-box opponent-box ${isActiveTurn ? 'gemini-active-turn' : ''}`}>
        <div className="player-box-header">
          <span className="player-box-title">
            {displayName}
            {isActiveTurn && <span className="turn-indicator-dot" />}
          </span>
        </div>

        <div className="player-cards-row cards-layout-line">
          {player.cards.map((card, idx) => (
            <div key={card.id || `opp-card-${idx}`} className="player-card-column">
              <CardView
                card={null}
                isFaceUp={false}
                size="small"
                cardTheme="light"
                label={`${player.displayName}'s card ${idx + 1}`}
              />
              <span className="card-position-num">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ACTIVE PLAYER MAT ("You" in Screen 3)
  const toggleLayout = () => {
    soundManager.playClick();
    setLayoutMode((prev) => (prev === 'line' ? 'grid' : 'line'));
  };

  return (
    <div className={`player-box player-self-box ${isActiveTurn ? 'gemini-active-turn' : ''}`}>
      <div className="player-box-header">
        <div className="player-title-left">
          <span className="player-box-title">You</span>
          {prompt && <span className="player-prompt-chip">{prompt}</span>}
        </div>

        {/* LINE / GRID TOGGLE BUTTON (Replaces 3 lines menu symbol) */}
        {/* If line is active, shows "Grid". If grid is active, shows "Line". */}
        <button
          type="button"
          className="layout-toggle-btn"
          onClick={toggleLayout}
          aria-label={layoutMode === 'line' ? 'Switch to Grid Layout' : 'Switch to Line Layout'}
          title={layoutMode === 'line' ? 'Switch to 2x3 Grid' : 'Switch to 1x6 Line'}
        >
          {layoutMode === 'line' ? 'Grid' : 'Line'}
        </button>
      </div>

      <div className={`player-cards-container cards-layout-${layoutMode}`}>
        {player.cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          const isTarget = targetIndices.includes(index);

          return (
            <div key={card.id || `self-card-${index}`} className="player-card-column">
              <CardView
                card={null}
                isFaceUp={false}
                size={layoutMode === 'grid' ? 'medium' : 'small'}
                cardTheme="dark"
                interactive={interactive}
                selected={isSelected}
                isTarget={isTarget}
                onClick={() => {
                  soundManager.playClick();
                  onCardClick?.(index);
                }}
                label={`Your card at position ${index + 1}`}
              />
              <span className="card-position-num">{index + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
