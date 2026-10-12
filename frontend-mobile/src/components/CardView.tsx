import React from 'react';
import type { Card, Suit, Rank } from '../types/card';
import { QuestionMarkIcon, DiamondOutlineIcon } from './Icons';

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
  cardTheme?: 'dark' | 'light' | 'question' | 'diamond';
  highlighted?: boolean;
}

/**
 * Resolves the block52 SVG card asset path based on card rank and suit.
 * Note: block52 uses 'T' for rank 10 (e.g. TC.svg, TD.svg, TH.svg, TS.svg).
 */
export const getCardSvgUrl = (rank: Rank, suit: Suit): string => {
  const rankCode = rank === '10' ? 'T' : rank;
  const suitCode = {
    SPADES: 'S',
    HEARTS: 'H',
    DIAMONDS: 'D',
    CLUBS: 'C',
  }[suit] || 'S';
  return `/cards/${rankCode}${suitCode}.svg`;
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceUp,
  size = 'medium',
  interactive = false,
  selected = false,
  isTarget = false,
  highlighted = false,
  onClick,
  label,
  disabled = false,
  cardTheme = 'dark',
}) => {
  const classNames = [
    'card-frame',
    `size-${size}`,
    `theme-${cardTheme}`,
    interactive && !disabled ? 'interactive' : '',
    selected ? 'selected' : '',
    isTarget ? 'selectable-target' : '',
    highlighted ? 'jack-highlight-card' : '',
    isFaceUp ? 'is-face-up' : 'is-face-down',
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleName =
    isFaceUp && card
      ? `${card.rank} of ${card.suit}, ${card.pointValue} points`
      : label || 'Card';

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
      {/* 1. FACE UP STATE: Authentic vector SVG card with floating point badge */}
      {isFaceUp && card ? (
        <div className="card-face-svg-wrapper">
          <img
            src={getCardSvgUrl(card.rank, card.suit)}
            alt={`${card.rank} of ${card.suit}`}
            className="card-svg-image"
            draggable={false}
          />
          <div className="card-points-badge">{card.pointValue}p</div>
        </div>
      ) : cardTheme === 'question' ? (
        /* 2. DRAW PILE SPECIAL CARD (White textured card with ? circle) */
        <div className="card-face-question">
          <QuestionMarkIcon size={28} />
        </div>
      ) : cardTheme === 'diamond' ? (
        /* 3. DISCARD EMPTY / SPECIAL CARD (Dark card with blue diamond outline) */
        <div className="card-face-diamond">
          <DiamondOutlineIcon size={28} />
        </div>
      ) : (
        /* 4. FACE-DOWN CASINO CARD BACK */
        <div className={`card-face-svg-wrapper ${cardTheme === 'light' ? 'light-back' : 'dark-back'}`}>
          <img
            src="/cards/Back.svg"
            alt="Card Back"
            className="card-svg-image"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};
