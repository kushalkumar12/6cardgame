import React, { useState } from 'react';
import type { Card } from '../types/card';
import { CardView } from './CardView';

interface InitialMemorizeModalProps {
  playerName: string;
  cards: Card[];
  onFinishMemorization: (selectedIndices: number[]) => void;
}

export const InitialMemorizeModal: React.FC<InitialMemorizeModalProps> = ({
  playerName,
  cards,
  onFinishMemorization,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hasRevealed, setHasRevealed] = useState(false);

  const toggleSelect = (index: number) => {
    if (hasRevealed) return;
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      if (selectedIndices.length < 2) {
        const next = [...selectedIndices, index];
        setSelectedIndices(next);
        if (next.length === 2) {
          setHasRevealed(true);
        }
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '720px' }}>
        <h2>Initial Memorization</h2>
        <p style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
          {playerName}, select 2 of your 6 cards to privately reveal and memorize.
        </p>

        <div className="player-cards-grid" style={{ margin: '24px 0' }}>
          {cards.map((card, index) => {
            const isSelected = selectedIndices.includes(index);
            const isRevealed = hasRevealed && isSelected;
            return (
              <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Pos {index + 1}
                </span>
                <CardView
                  card={isRevealed ? card : null}
                  isFaceUp={isRevealed}
                  interactive={!hasRevealed}
                  selected={isSelected}
                  onClick={() => toggleSelect(index)}
                  label={`Position ${index + 1}`}
                />
              </div>
            );
          })}
        </div>

        {!hasRevealed ? (
          <p style={{ fontSize: '0.88rem' }}>
            Selected: {selectedIndices.length} / 2 cards
          </p>
        ) : (
          <div>
            <p style={{ color: '#a7f3d0', fontSize: '0.9rem', marginBottom: '16px' }}>
              ✓ Memorize the ranks, values, and positions of your 2 cards.
            </p>
            <button
              className="primary-gold-btn"
              onClick={() => onFinishMemorization(selectedIndices)}
              id="memorize-done-btn"
            >
              I Have Memorized My Cards
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
