import React from 'react';

interface FriendRequestToastProps {
  fromName: string;
  fromAvatar?: string;
  fromUserId: string;
  onAccept: (fromUserId: string, fromName: string) => void;
  onDecline: () => void;
}

export const FriendRequestToast: React.FC<FriendRequestToastProps> = ({
  fromName,
  fromAvatar = '🃏',
  fromUserId,
  onAccept,
  onDecline,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        background: 'rgba(11, 24, 18, 0.96)',
        border: '1px solid var(--emerald)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.85)',
        borderRadius: '12px',
        padding: '16px 20px',
        zIndex: 210,
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.8rem' }}>{fromAvatar}</span>
        <div>
          <strong style={{ color: '#a7f3d0', fontSize: '0.95rem' }}>👋 Friend Request!</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-main)' }}>
            <strong>{fromName}</strong> (<code>{fromUserId}</code>) wants to be your friend.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="action-btn action-btn-declare"
          style={{ flex: 1, padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={() => onAccept(fromUserId, fromName)}
        >
          ✓ Accept Friend
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
