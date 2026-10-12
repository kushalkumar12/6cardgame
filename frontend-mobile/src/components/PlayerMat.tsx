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
  highlightedIndices?: number[];
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
  highlightedIndices = [],
  prompt,
}) => {
  // Layout mode for "You" mat: 'line' (1x6) vs 'grid' (2x3)
  const [layoutMode, setLayoutMode] = useState<'line' | 'grid'>('line');
  const mistakes = player.incorrectEliminationCount || 0;

  const mistakeBadgeStyle: React.CSSProperties = {
    fontSize: '0.68rem',
    padding: '2px 6px',
    borderRadius: 8,
    fontWeight: 700,
    background: mistakes >= 5 ? 'rgba(239, 68, 68, 0.25)' : mistakes >= 3 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
    color: mistakes >= 5 ? '#f87171' : mistakes >= 3 ? '#fbbf24' : '#94a3b8',
    border: mistakes >= 5 ? '1px solid rgba(239, 68, 68, 0.5)' : mistakes >= 3 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
  };

  if (!isSelf) {
    // OPPONENT MAT (e.g. "Bot" in Screen 3)
    const displayName = player.displayName.replace(/ \(Bot\)/i, '');

    return (
      <div className={`player-box opponent-box ${isActiveTurn ? 'gemini-active-turn' : ''}`}>
        <div className="player-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="player-box-title">
            {displayName}
            {isActiveTurn && <span className="turn-indicator-dot" />}
          </span>
          <span style={mistakeBadgeStyle} title="Incorrect elimination attempts (6 = loss)">
            ⚠️ Mistakes: {mistakes}/6
          </span>
        </div>

        <div className="player-cards-row cards-layout-line">
          {player.cards.map((card, idx) => {
            const isHighlighted = highlightedIndices.includes(idx);
            return (
              <div key={card.id || `opp-card-${idx}`} className="player-card-column">
                <CardView
                  card={null}
                  isFaceUp={false}
                  size="small"
                  cardTheme="light"
                  highlighted={isHighlighted}
                  label={`${player.displayName}'s card ${idx + 1}`}
                />
                <span className="card-position-num">{idx + 1}</span>
              </div>
            );
          })}
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
        <div className="player-title-left" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="player-box-title">You</span>
          <span style={mistakeBadgeStyle} title="Incorrect elimination attempts (6 = loss)">
            ⚠️ Mistakes: {mistakes}/6
          </span>
          {prompt && <span className="player-prompt-chip">{prompt}</span>}
        </div>

        {/* LINE / GRID TOGGLE BUTTON */}
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
          const isHighlighted = highlightedIndices.includes(index);

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
                highlighted={isHighlighted}
                onClick={() => {
                  soundManager.playClick();
                  onCardClick?.(index);
                }}
                label={`Your card at position ${index + 1}`}
              />
              <span className="card-position-num" style={{ color: isHighlighted ? '#fde047' : undefined, fontWeight: isHighlighted ? 700 : 400 }}>
                {isHighlighted ? '🔄' : index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
