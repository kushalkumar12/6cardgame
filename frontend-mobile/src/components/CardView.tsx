import React from 'react';
import type { Card, Suit } from '../types/card';
import { ComedyMask, QuestionMarkIcon, DiamondOutlineIcon } from './Icons';

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
  cardTheme = 'dark',
}) => {
  const isRed = card?.suit === 'HEARTS' || card?.suit === 'DIAMONDS';
  const suitSymbol = card ? SUIT_SYMBOLS[card.suit] : '';

  const classNames = [
    'card-frame',
    `size-${size}`,
    `theme-${cardTheme}`,
    interactive && !disabled ? 'interactive' : '',
    selected ? 'selected' : '',
    isTarget ? 'selectable-target' : '',
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
      {/* FACE UP STATE */}
      {isFaceUp && card ? (
        <div className={`card-face-front ${isRed ? 'suit-red' : 'suit-black'}`}>
          <div className="corner-index corner-top-left">
            <span className="corner-rank">{card.rank}</span>
            <span className="corner-suit">{suitSymbol}</span>
          </div>

          <div className="center-card-content">
            <span className="center-suit-symbol">{suitSymbol}</span>
            <ComedyMask size={18} color={isRed ? '#fecaca' : '#cbd5e1'} />
          </div>

          <div className="corner-index corner-bottom-right">
            <span className="corner-rank">{card.rank}</span>
            <span className="corner-suit">{suitSymbol}</span>
          </div>

          <div className="card-points-badge">{card.pointValue}p</div>
        </div>
      ) : cardTheme === 'question' ? (
        /* DRAW PILE SPECIAL CARD (White textured card with ? circle) */
        <div className="card-face-question">
          <QuestionMarkIcon size={28} />
        </div>
      ) : cardTheme === 'diamond' ? (
        /* DISCARD EMPTY / SPECIAL CARD (Dark card with blue diamond outline) */
        <div className="card-face-diamond">
          <DiamondOutlineIcon size={28} />
        </div>
      ) : cardTheme === 'light' ? (
        /* LIGHT CARD BACK (White with dark mask - Used by opponent/bot) */
        <div className="card-face-back light-back">
          <ComedyMask size={22} color="#0c1524" />
        </div>
      ) : (
        /* DARK CARD BACK (Navy with white mask & blue border - Used by player) */
        <div className="card-face-back dark-back">
          <ComedyMask size={22} color="#ffffff" />
        </div>
      )}
    </div>
  );
};
