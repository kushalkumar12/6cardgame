import React from 'react';
import type { Card, Suit } from '../types/card';

interface CardViewProps {
  card?: Card | null;
  isFaceUp: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  selected?: boolean;
  isTarget?: boolean;
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  SPADES: '♠',
  CLUBS: '♣',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceUp,
  size = 'medium',
  interactive = false,
  selected = false,
  isTarget = false,
  onClick,
  label,
  disabled = false,
}) => {
  const isRed = card?.suit === 'HEARTS' || card?.suit === 'DIAMONDS';
  const suitSymbol = card ? SUIT_SYMBOLS[card.suit] : '';

  const classNames = [
    'card-frame',
    `size-${size}`,
    interactive && !disabled ? 'interactive' : '',
    selected ? 'selected' : '',
    isTarget ? 'selectable-target' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleName = isFaceUp && card
    ? `${card.rank} of ${card.suit}, worth ${card.pointValue} points`
    : label || 'Face-down hidden playing card';

  return (
    <div
      className={classNames}
      onClick={!disabled && interactive ? onClick : undefined}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive && !disabled ? 0 : -1}
      aria-label={accessibleName}
      onKeyDown={(e) => {
        if (interactive && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {isFaceUp && card ? (
        <div className={`card-face-front ${isRed ? 'suit-red' : 'suit-black'}`}>
          <div className="corner-index">
            <span className="corner-rank">{card.rank}</span>
            <span className="corner-suit">{suitSymbol}</span>
          </div>

          <div className="center-suit-symbol">{suitSymbol}</div>

          <div className="card-points-badge">{card.pointValue} pts</div>
        </div>
      ) : (
        <div className="card-face-back">
          <span className="card-back-crest">♠</span>
        </div>
      )}
    </div>
  );
};
