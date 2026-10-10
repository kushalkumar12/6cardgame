import React from 'react';

interface InvitationToastProps {
  fromName: string;
  roomCode: string;
  onAccept: (roomCode: string) => void;
  onDecline: () => void;
}

export const InvitationToast: React.FC<InvitationToastProps> = ({
  fromName,
  roomCode,
  onAccept,
  onDecline,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'rgba(11, 24, 18, 0.95)',
        border: '1px solid var(--gold-primary)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
        borderRadius: '12px',
        padding: '16px 20px',
        zIndex: 200,
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.5rem' }}>✉️</span>
        <div>
          <strong style={{ color: 'var(--gold-light)', fontSize: '0.95rem' }}>Game Invitation!</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-main)' }}>
            <strong>{fromName}</strong> invited you to join Room <code>{roomCode}</code>.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="action-btn action-btn-declare"
          style={{ flex: 1, padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={() => onAccept(roomCode)}
        >
          Accept & Join
        </button>
        <button
          className="secondary-ghost-btn"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={onDecline}
        >
          Decline
        </button>
      </div>
    </div>
  );
};
