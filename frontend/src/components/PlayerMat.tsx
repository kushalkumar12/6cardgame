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
  prompt,
}) => {
  if (!isSelf) {
    // Opponent compact mat
    return (
      <div className={`opponent-mat ${isActiveTurn ? 'is-active-turn' : ''}`}>
        <div className="opponent-header">
          <span className="opponent-name">
            {isActiveTurn && <span style={{ color: 'var(--gold-primary)' }}>▶</span>}
            {player.displayName}
          </span>
          <span className="opponent-card-count">{player.cards.length} Cards</span>
        </div>
        <div className="cards-mini-grid">
          {player.cards.map((card, idx) => (
            <CardView
              key={card.id}
              card={null}
              isFaceUp={false}
              size="small"
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
            <div style={{ fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              {player.cards.length} Cards in Hand
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

          return (
            <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Position {index + 1}
              </span>
              <CardView
                card={null}
                isFaceUp={false}
                interactive={interactive}
                selected={isSelected}
                isTarget={isTarget}
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
