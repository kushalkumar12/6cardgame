import React from 'react';

interface PassDeviceModalProps {
  playerName: string;
  onConfirm: () => void;
  subheading?: string;
}

export const PassDeviceModal: React.FC<PassDeviceModalProps> = ({
  playerName,
  onConfirm,
  subheading = 'Please pass the device so secret cards remain hidden from opponents.',
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <div className="privacy-shield-icon">🛡️</div>
        <h2>Pass to {playerName}</h2>
        <p>{subheading}</p>
        <p style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
          Make sure no other players are looking at the screen before clicking below.
        </p>
        <button
          className="primary-gold-btn"
          onClick={onConfirm}
          id="pass-device-ready-btn"
        >
          I am {playerName} - Continue
        </button>
      </div>
    </div>
  );
};
