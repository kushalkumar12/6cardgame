import React from 'react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '820px', textAlign: 'left', maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>📜 Rules & How to Play</h2>
          <button className="secondary-ghost-btn" onClick={onClose} style={{ padding: '6px 14px' }}>
            ✕ Close
          </button>
        </div>

        <div style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              🎯 Objective & Victory Rule
            </h3>
            <p>
              The objective is to finish the game with the <strong>lowest total card score</strong> or achieve an <strong>instant zero-card automatic victory</strong> by eliminating all your cards.
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              🔢 Exact Scoring Values
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
              <div><strong>King (K):</strong> 0 pts</div>
              <div><strong>Ace (A):</strong> 1 pt</div>
              <div><strong>2 – 9:</strong> 2 – 9 pts</div>
              <div><strong>10 & Queen (Q):</strong> 10 pts</div>
              <div><strong>Jack (J):</strong> 40 pts</div>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 6 }}>
              * No Jokers are used. Decks: 2 players = 1 deck (52 cards); 3-4 players = 2 decks (104 cards); 5-6 players = 3 decks (156 cards).
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              🃏 Setup & Initial Memorization
            </h3>
            <p>
              Each player receives 6 face-down cards in fixed positions. Before Round 1 begins, each player privately reveals and memorizes exactly <strong>2 of their own cards</strong>, then returns them face down.
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              ⚡ Turn Actions
            </h3>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Draw a Card:</strong> Draw from the top of the draw pile, reveal it to yourself, then choose:
                <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                  <li><strong>Replace:</strong> Put the drawn card into any position in your hand face-down; the replaced card goes face-up to the discard pile.</li>
                  <li><strong>Discard:</strong> Send the drawn card straight to the discard pile.</li>
                  <li><strong>Use Ability (if 7, 8, or Jack):</strong> Execute its special power, then discard it.</li>
                </ul>
              </li>
              <li><strong>Attempt Matching Elimination:</strong> If the discard pile is not empty, you can attempt to eliminate 1 or more cards from your hand that match the top discard card&apos;s point value.</li>
              <li><strong>Declare Victory:</strong> Allowed on your turn after Round 1 completes. Immediately ends the game and reveals all hands. Lowest total score wins!</li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              ✨ Special Abilities
            </h3>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Seven (7):</strong> Privately view any 1 card in your own hand, then hide it again.</li>
              <li><strong>Eight (8):</strong> Privately view any 1 card in an opponent&apos;s hand, then hide it again.</li>
              <li><strong>Jack (J):</strong> Blindly exchange 1 card from your hand with 1 card from an opponent without looking at either card.</li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              💥 Elimination & All-or-Nothing Penalty
            </h3>
            <p>
              Matching is based <strong>strictly on numeric point value</strong> (suits and ranks do not matter; e.g. a 10 matches a Queen because both are worth 10 points; a King matches a King because both are worth 0 points).
            </p>
            <p style={{ marginTop: 6, color: '#fca5a5' }}>
              <strong>All-or-Nothing Rule:</strong> If you select multiple cards to eliminate, all selected cards must match the target point value. If ANY selected card is incorrect, NONE are eliminated and you receive 1 penalty card added to your hand face-down from the draw pile.
            </p>
          </div>

          <div>
            <h3 style={{ color: 'var(--gold-light)', fontSize: '1.05rem', marginBottom: 6 }}>
              🏁 Game End Conditions
            </h3>
            <ol style={{ paddingLeft: 20 }}>
              <li><strong>Zero-Card Automatic Victory:</strong> If a player eliminates all their cards, they win immediately without score comparison!</li>
              <li><strong>Declared Victory:</strong> Lowest final score wins. Tied lowest scores result in a draw.</li>
              <li><strong>Draw Pile Empty:</strong> If the draw pile empties during a draw or penalty, the game ends immediately. Lowest total score wins. Discards are never reshuffled!</li>
            </ol>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button className="primary-gold-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={onClose}>
            Got It! Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};
