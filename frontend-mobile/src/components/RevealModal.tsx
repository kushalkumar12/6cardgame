import React, { useState } from 'react';
import type { Card } from '../types/card';
import type { Player } from '../types/game';
import { CardView } from './CardView';

interface RevealModalProps {
  abilityType: '7' | '8';
  activePlayer: Player;
  allPlayers: Player[];
  peekedCard: {
    card: Card;
    targetPlayerId: string;
    cardIndex: number;
  } | null;
  onSelectOwnCard: (cardIndex: number) => void;
  onSelectOpponentCard: (opponentId: string, cardIndex: number) => void;
  onFinish: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({
  abilityType,
  activePlayer,
  allPlayers,
  peekedCard,
  onSelectOwnCard,
  onSelectOpponentCard,
  onFinish,
}) => {
  const opponents = allPlayers.filter((p) => p.id !== activePlayer.id);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    opponents[0]?.id || ''
  );

  const selectedOpponent = opponents.find((p) => p.id === selectedOpponentId);

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '750px' }}>
        <h2>Special Ability: {abilityType === '7' ? 'Seven (Peek Own)' : 'Eight (Peek Opponent)'}</h2>

        {!peekedCard ? (
          <div>
            {abilityType === '7' ? (
              <>
                <p>Select any one card in your hand to privately reveal.</p>
                <div className="player-cards-grid" style={{ margin: '20px 0' }}>
                  {activePlayer.cards.map((card, idx) => (
                    <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pos {idx + 1}</span>
                      <CardView
                        card={null}
                        isFaceUp={false}
                        interactive
                        onClick={() => onSelectOwnCard(idx)}
                        label={`Your card at position ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p>Select an opponent and one of their cards to privately reveal.</p>
                {opponents.length > 1 && (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    {opponents.map((opp) => (
                      <button
                        key={opp.id}
                        className={`player-count-btn ${selectedOpponentId === opp.id ? 'active' : ''}`}
                        style={{ padding: '8px 16px', fontSize: '0.95rem' }}
                        onClick={() => setSelectedOpponentId(opp.id)}
                      >
                        {opp.displayName}
                      </button>
                    ))}
                  </div>
                )}

                {selectedOpponent && (
                  <div className="player-cards-grid" style={{ margin: '20px 0' }}>
                    {selectedOpponent.cards.map((card, idx) => (
                      <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pos {idx + 1}</span>
                        <CardView
                          card={null}
                          isFaceUp={false}
                          interactive
                          onClick={() => onSelectOpponentCard(selectedOpponent.id, idx)}
                          label={`${selectedOpponent.displayName}'s card at position ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
              Privately Revealed Card (Position {peekedCard.cardIndex + 1}):
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
              <CardView
                card={peekedCard.card}
                isFaceUp
                size="large"
                label="Privately revealed card"
              />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#a7f3d0', marginBottom: '20px' }}>
              Memorize the card value and position. When ready, click below to return it face down and discard the {abilityType}.
            </p>
            <button className="primary-gold-btn" onClick={onFinish} id="reveal-done-btn">
              I Have Memorized This Card - Complete Ability
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
