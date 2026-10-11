import React from 'react';
import { MusicNoteIcon, SpeakerIcon } from './Icons';

interface BottomBarProps {
  isMusicOn?: boolean;
  onToggleMusic?: () => void;
  isSoundOn?: boolean;
  onToggleSound?: () => void;
  onRoomClick?: () => void;
  showRoomButton?: boolean;
  onExitClick?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  isMusicOn = true,
  onToggleMusic,
  isSoundOn = true,
  onToggleSound,
  onRoomClick,
  showRoomButton = true,
  onExitClick,
}) => {
  return (
    <footer
      className={`app-bottom-bar ${!showRoomButton ? 'bottom-bar-gameplay' : ''}`}
      role="navigation"
      aria-label="Audio and Navigation Controls"
    >
      {/* MUSIC TOGGLE */}
      <button
        type="button"
        className="bottom-bar-icon-btn"
        onClick={onToggleMusic}
        aria-label={isMusicOn ? 'Turn Off Background Music' : 'Turn On Background Music'}
        title="Toggle Background Music"
      >
        <MusicNoteIcon size={22} active={isMusicOn} />
      </button>

      {/* CENTER SLOT: ROOM PILL (IN SETUP) OR SUBTLE EXIT BUTTON (IN GAMEPLAY) */}
      {showRoomButton ? (
        <button
          type="button"
          className="bottom-bar-room-pill"
          onClick={onRoomClick}
          id="bottom-room-btn"
          aria-label="Room Lobby"
        >
          Room
        </button>
      ) : (
        <button
          type="button"
          className="bottom-bar-exit-subtle-btn"
          onClick={onExitClick}
          id="bottom-exit-btn"
          aria-label="Exit Current Game"
          title="Exit to Main Menu"
        >
          Exit
        </button>
      )}

      {/* SOUND TOGGLE */}
      <button
        type="button"
        className="bottom-bar-icon-btn"
        onClick={onToggleSound}
        aria-label={isSoundOn ? 'Turn Off Click Sounds' : 'Turn On Click Sounds'}
        title="Toggle Click Sounds"
      >
        <SpeakerIcon size={22} active={isSoundOn} />
      </button>
    </footer>
  );
};
