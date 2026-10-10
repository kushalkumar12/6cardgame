import React, { useState } from 'react';
import type { Player } from '../types/game';
import { CardView } from './CardView';

interface JackExchangeModalProps {
  activePlayer: Player;
  allPlayers: Player[];
  onConfirmExchange: (
    ownCardIndex: number,
    opponentId: string,
    opponentCardIndex: number
  ) => void;
  onCancel: () => void;
}

export const JackExchangeModal: React.FC<JackExchangeModalProps> = ({
  activePlayer,
  allPlayers,
  onConfirmExchange,
  onCancel,
}) => {
  const opponents = allPlayers.filter((p) => p.id !== activePlayer.id);
  const [selectedOwnIndex, setSelectedOwnIndex] = useState<number | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    opponents[0]?.id || ''
  );
  const [selectedOpponentIndex, setSelectedOpponentIndex] = useState<number | null>(null);

  const selectedOpponent = opponents.find((p) => p.id === selectedOpponentId);

  const canConfirm =
    selectedOwnIndex !== null &&
    selectedOpponentId !== '' &&
    selectedOpponentIndex !== null;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '800px' }}>
        <h2>Special Ability: Jack Exchange</h2>
        <p>
          Exchange 1 card from your hand with 1 card from an opponent without looking at either card!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', margin: '16px 0' }}>
          {/* Step 1: Select Own Card */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-light)', marginBottom: 12 }}>
              1. Your Card: {selectedOwnIndex !== null ? `Position ${selectedOwnIndex + 1}` : '(Select)'}
            </h3>
            <div className="player-cards-grid">
              {activePlayer.cards.map((c, idx) => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pos {idx + 1}</span>
                  <CardView
                    card={null}
                    isFaceUp={false}
                    size="small"
                    interactive
                    selected={selectedOwnIndex === idx}
                    onClick={() => setSelectedOwnIndex(idx)}
                    label={`Your card at position ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Select Opponent & Card */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-light)', marginBottom: 8 }}>
              2. Opponent Card
            </h3>
            {opponents.length > 1 && (
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                {opponents.map((opp) => (
                  <button
                    key={opp.id}
                    className={`player-count-btn ${selectedOpponentId === opp.id ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => {
                      setSelectedOpponentId(opp.id);
                      setSelectedOpponentIndex(null);
                    }}
                  >
                    {opp.displayName}
                  </button>
                ))}
              </div>
            )}

            {selectedOpponent && (
              <div className="player-cards-grid">
                {selectedOpponent.cards.map((c, idx) => (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pos {idx + 1}</span>
                    <CardView
                      card={null}
                      isFaceUp={false}
                      size="small"
                      interactive
                      selected={selectedOpponentIndex === idx}
                      onClick={() => setSelectedOpponentIndex(idx)}
                      label={`${selectedOpponent.displayName}'s card at position ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <button className="secondary-ghost-btn" onClick={onCancel}>
            Back / Cancel
          </button>
          <button
            className="primary-gold-btn"
            style={{ width: 'auto' }}
            disabled={!canConfirm}
            onClick={() => {
              if (canConfirm) {
                onConfirmExchange(selectedOwnIndex!, selectedOpponentId, selectedOpponentIndex!);
              }
            }}
            id="confirm-jack-exchange-btn"
          >
            Confirm Blind Exchange
          </button>
        </div>
      </div>
    </div>
  );
};
