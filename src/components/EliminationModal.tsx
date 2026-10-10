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
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '780px' }}>
        <h2>Matching-Card Elimination</h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '16px 0' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--gold-light)', display: 'block', marginBottom: 4 }}>
              Target Discard Value
            </span>
            <CardView card={topDiscard} isFaceUp size="small" />
          </div>
          <div style={{ textAlign: 'left', maxWidth: '420px' }}>
            <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--gold-light)', fontWeight: 700 }}>
              Target: {topDiscard.pointValue} Points
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              (Matches {topDiscard.pointValue} pts across any suit or rank)
            </p>
          </div>
        </div>

        <p style={{ color: '#fca5a5', fontSize: '0.88rem', background: 'rgba(225,29,72,0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(225,29,72,0.3)', margin: '12px auto', maxWidth: '600px' }}>
          ⚠️ <strong>All-or-Nothing Rule:</strong> If all selected cards match, they are permanently eliminated. If ANY card does not match, NONE are eliminated and you receive 1 penalty card.
        </p>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 14 }}>
          Select the card positions in your hand that you believe match:
        </p>

        <div className="player-cards-grid" style={{ margin: '16px 0' }}>
          {activePlayer.cards.map((c, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pos {idx + 1}</span>
                <CardView
                  card={null}
                  isFaceUp={false}
                  interactive
                  selected={isSelected}
                  onClick={() => toggleSelect(idx)}
                  label={`Your card at position ${idx + 1}`}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 20 }}>
          <button className="secondary-ghost-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="action-btn action-btn-eliminate"
            style={{ width: 'auto', padding: '12px 28px' }}
            disabled={selectedIndices.length === 0}
            onClick={() => onAttempt(selectedIndices)}
            id="attempt-elimination-btn"
          >
            Attempt Elimination ({selectedIndices.length} Selected)
          </button>
        </div>
      </div>
    </div>
  );
};
