import React from 'react';
import type { PendingPenalty } from '../types/game';
import { CardView } from './CardView';

interface PenaltyModalProps {
  pendingPenalty: PendingPenalty;
  onAcknowledge: () => void;
}

export const PenaltyModal: React.FC<PenaltyModalProps> = ({
  pendingPenalty,
  onAcknowledge,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <h2 style={{ color: '#fda4af' }}>Incorrect Elimination Penalty!</h2>
        <p>
          One or more of your selected cards did not match the target value of{' '}
          <strong>{pendingPenalty.targetPointValue} points</strong>.
        </p>
        <p style={{ color: '#fca5a5' }}>
          None of your cards were eliminated, and you must draw 1 penalty card from the draw pile!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gold-light)', fontWeight: 600 }}>
            Penalty Card Added to Your Hand:
          </span>
          <CardView card={pendingPenalty.penaltyCard} isFaceUp size="large" label="Penalty card" />
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Memorize this card and its position in your hand. When you click below, it will remain face down and your turn will end.
        </p>

        <button className="primary-gold-btn" onClick={onAcknowledge} id="acknowledge-penalty-btn">
          Understood - End Turn
        </button>
      </div>
    </div>
  );
};
