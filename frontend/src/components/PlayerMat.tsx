import React from 'react';
import type { Player } from '../types/game';
import { CardView } from './CardView';

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
  const mistakes = player.incorrectEliminationCount || 0;
  const mistakeBadgeStyle: React.CSSProperties = {
    fontSize: '0.74rem',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 700,
    background: mistakes >= 5 ? 'rgba(239, 68, 68, 0.25)' : mistakes >= 3 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
    color: mistakes >= 5 ? '#f87171' : mistakes >= 3 ? '#fbbf24' : 'rgba(255, 255, 255, 0.65)',
    border: mistakes >= 5 ? '1px solid rgba(239, 68, 68, 0.5)' : mistakes >= 3 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
  };

  if (!isSelf) {
    // Opponent compact mat
    return (
      <div className={`opponent-mat ${isActiveTurn ? 'is-active-turn' : ''}`}>
        <div className="opponent-header">
          <span className="opponent-name">
            {isActiveTurn && <span style={{ color: 'var(--gold-primary)' }}>▶ </span>}
            {player.displayName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={mistakeBadgeStyle} title="Incorrect elimination attempts (6 = automatic defeat)">
              ⚠️ Mistakes: {mistakes}/6
            </span>
            <span className="opponent-card-count">{player.cards.length} Cards</span>
          </div>
        </div>
        <div className="cards-mini-grid">
          {player.cards.map((card, idx) => (
            <CardView
              key={card.id}
              card={null}
              isFaceUp={false}
              size="small"
              highlighted={highlightedIndices.includes(idx)}
              label={`${player.displayName}'s card ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Active player's own mat
  return (
    <div className="active-player-mat">
      <div className="mat-header">
        <div className="mat-title-group">
          <div className="active-avatar-badge">
            {player.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="active-player-title">{player.displayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--gold-light)' }}>
                {player.cards.length} Cards in Hand
              </div>
              <span style={mistakeBadgeStyle} title="Incorrect elimination attempts (6 = automatic defeat)">
                ⚠️ Mistakes: {mistakes}/6
              </span>
            </div>
          </div>
        </div>

        {prompt && (
          <div style={{ fontSize: '0.9rem', color: 'var(--gold-light)', fontWeight: 600 }}>
            {prompt}
          </div>
        )}
      </div>

      <div className="player-cards-grid">
        {player.cards.map((card, index) => {
          const isSelected = selectedIndices.includes(index);
          const isTarget = targetIndices.includes(index);
          const isHighlighted = highlightedIndices.includes(index);

          return (
            <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: isHighlighted ? 'var(--gold-light)' : 'var(--text-muted)', fontWeight: isHighlighted ? 700 : 400 }}>
                {isHighlighted ? '🔄 Jack Swap' : `Position ${index + 1}`}
              </span>
              <CardView
                card={null}
                isFaceUp={false}
                interactive={interactive}
                selected={isSelected}
                isTarget={isTarget}
                highlighted={isHighlighted}
                onClick={() => onCardClick?.(index)}
                label={`Your card at position ${index + 1}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
