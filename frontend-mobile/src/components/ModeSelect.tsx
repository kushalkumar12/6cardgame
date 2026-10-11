import React from 'react';
import { RobotFace, TwoDramaMasks } from './Icons';
import { soundManager } from '../services/soundManager';

export type GamePlayMode = 'system' | 'multiplayer' | 'online_team' | 'lan' | 'pass_and_play';

interface ModeSelectProps {
  onSelectMode: (mode: GamePlayMode) => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({ onSelectMode }) => {
  return (
    <div className="mode-select-container">
      {/* MODE 1: PLAY WITH BOT */}
      <div
        className="mode-card"
        onClick={() => {
          soundManager.playClick();
          onSelectMode('system');
        }}
        id="mode-system-btn"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            soundManager.playClick();
            onSelectMode('system');
          }
        }}
      >
        <div className="mode-card-icon-circle">
          <RobotFace size={68} />
        </div>
        <div className="mode-card-info">
          <h2 className="mode-card-title">Play with Bot</h2>
          <p className="mode-card-subtitle">Practice and play with computer</p>
        </div>
      </div>

      {/* MODE 2: MULTIPLAYER ONLINE */}
      <div
        className="mode-card"
        onClick={() => {
          soundManager.playClick();
          onSelectMode('multiplayer');
        }}
        id="mode-multiplayer-btn"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            soundManager.playClick();
            onSelectMode('multiplayer');
          }
        }}
      >
        <div className="mode-card-icon-circle">
          <TwoDramaMasks size={68} />
        </div>
        <div className="mode-card-info">
          <h2 className="mode-card-title">Multiplayer Online</h2>
          <p className="mode-card-subtitle">Play with friends and other players</p>
        </div>
      </div>
    </div>
  );
};
