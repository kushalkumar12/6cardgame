import React from 'react';

interface DeclareVictoryModalProps {
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeclareVictoryModal: React.FC<DeclareVictoryModalProps> = ({
  playerName,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <h2 style={{ color: '#a7f3d0' }}>Declare Victory?</h2>
        <p>
          {playerName}, are you confident that you currently hold the <strong>lowest score</strong> at the table?
        </p>

        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', padding: '16px', borderRadius: '10px', textAlign: 'left', margin: '16px 0', fontSize: '0.88rem', color: '#d1fae5', lineHeight: 1.5 }}>
          <p>⚠️ <strong>Important End-Game Rules:</strong></p>
          <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
            <li>The game ends immediately for all players.</li>
            <li>All remaining cards in all players' hands will be revealed.</li>
            <li>The player with the <strong>lowest total card point value</strong> wins.</li>
            <li>If another player has a lower score than you, they will win!</li>
            <li>If players tie for lowest score, it is declared a draw.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 24 }}>
          <button className="secondary-ghost-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="action-btn action-btn-declare"
            style={{ width: 'auto', padding: '12px 28px' }}
            onClick={onConfirm}
            id="confirm-declare-victory-btn"
          >
            Yes, Declare Victory!
          </button>
        </div>
      </div>
    </div>
  );
};
