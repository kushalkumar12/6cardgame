import React, { useState } from 'react';
import type { Card } from '../types/card';
import type { Player } from '../types/game';
import { CardView } from './CardView';

interface EliminationModalProps {
  topDiscard: Card;
  activePlayer: Player;
  onAttempt: (selectedIndices: number[]) => void;
  onCancel: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({
  topDiscard,
  activePlayer,
  onAttempt,
  onCancel,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleSelect = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== idx));
    } else {
      setSelectedIndices([...selectedIndices, idx]);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-dialog"
        style={{
          width: '94%',
          maxWidth: '390px',
          padding: '16px 14px',
          textAlign: 'center',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.15rem', margin: '0 0 10px', color: '#ffffff' }}>Matching-Card Elimination</h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 12px', borderRadius: 12 }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>
              Target Discard
            </span>
            <CardView card={topDiscard} isFaceUp size="small" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '0.96rem', color: '#38bdf8', fontWeight: 800 }}>
              Target: {topDiscard.pointValue} Points
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              (Matches {topDiscard.pointValue} pts across any suit/rank)
            </p>
          </div>
        </div>

        <div style={{ color: '#fca5a5', fontSize: '0.76rem', background: 'rgba(225,29,72,0.15)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(225,29,72,0.3)', margin: '8px 0', lineHeight: 1.4 }}>
          ⚠️ <strong>All-or-Nothing Rule:</strong> All selected cards must match the discard point value. Any mistake deals 1 penalty card.
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '10px 0 6px' }}>
          Tap the cards in your hand you believe match:
        </p>

        {/* 3-COLUMN COMPACT MOBILE HAND GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px 10px',
            maxWidth: '260px',
            margin: '8px auto 14px',
            justifyItems: 'center',
          }}
        >
          {activePlayer.cards.map((c, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <div key={c.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: '0.72rem', color: isSelected ? '#38bdf8' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 500 }}>
                  Pos {idx + 1}
                </span>
                <CardView
                  card={null}
                  isFaceUp={false}
                  interactive
                  size="small"
                  selected={isSelected}
                  onClick={() => toggleSelect(idx)}
                  label={`Position ${idx + 1}`}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
          <button className="secondary-ghost-btn" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className="action-btn action-btn-eliminate"
            style={{ width: 'auto', padding: '8px 20px', fontSize: '0.84rem' }}
            disabled={selectedIndices.length === 0}
            onClick={() => onAttempt(selectedIndices)}
            id="attempt-elimination-btn"
          >
            Eliminate ({selectedIndices.length})
          </button>
        </div>
      </div>
    </div>
  );
};
