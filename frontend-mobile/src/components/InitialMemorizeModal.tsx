import React, { useState } from 'react';
import type { Card } from '../types/card';
import { CardView } from './CardView';

interface InitialMemorizeModalProps {
  playerName: string;
  cards: Card[];
  onFinishMemorization: (selectedIndices: number[]) => void;
}

export const InitialMemorizeModal: React.FC<InitialMemorizeModalProps> = ({
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

  const handleDone = () => {
    if (selectedIndices.length === 2) {
      onFinishMemorization(selectedIndices);
    } else {
      // If user presses Remembered or close before selecting 2, pick first two by default
      const fallback = selectedIndices.length === 1
        ? [selectedIndices[0], selectedIndices[0] === 0 ? 1 : 0]
        : [0, 1];
      onFinishMemorization(fallback);
    }
  };

  return (
    <div className="memorize-modal-backdrop">
      <div className="memorize-modal-card">
        {/* RED CIRCULAR CLOSE BUTTON AT TOP RIGHT */}
        <button
          type="button"
          className="modal-close-circle-btn"
          onClick={handleDone}
          aria-label="Close"
          title="Close and continue"
        >
          ✕
        </button>

        {/* MODAL HEADING MATCHING MOCKUP */}
        <h2 className="memorize-modal-title">Choose and Remember any two cards</h2>

        {/* 2x3 GRID OF CARDS (3 on top row, 3 on bottom row) */}
        <div className="memorize-cards-grid">
          {cards.slice(0, 6).map((card, index) => {
            const isSelected = selectedIndices.includes(index);
            const isRevealed = isSelected;

            return (
              <div
                key={card.id || `mem-${index}`}
                className={`memorize-card-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggleSelect(index)}
              >
                <CardView
                  card={isRevealed ? card : null}
                  isFaceUp={isRevealed}
                  interactive={!hasRevealed}
                  selected={isSelected}
                  cardTheme={isSelected ? 'light' : 'dark'}
                  label={`Card ${index + 1}`}
                />
              </div>
            );
          })}
        </div>

        {/* "REMEMBERED" BLUE PILL BUTTON */}
        <button
          type="button"
          className="memorize-confirm-btn"
          onClick={handleDone}
          id="memorize-done-btn"
        >
          Remembered
        </button>
      </div>
    </div>
  );
};
