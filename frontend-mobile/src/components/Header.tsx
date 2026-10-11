import React from 'react';
import type { UserProfile } from '../types/user';
import { TheaterMasksLogo, SixDotsIcon } from './Icons';
import { Avatar } from './Avatar';

interface HeaderProps {
  roundNumber: number;
  firstRoundCompleted: boolean;
  onOpenRules: () => void;
  onRestartGame: () => void;
  isGameActive: boolean;
  user: UserProfile | null;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRules,
  isGameActive,
  user,
  onOpenProfile,
}) => {
  return (
    <header className="app-header">
      {/* BRAND LOGO & TITLE */}
      <div className="brand-badge">
        <TheaterMasksLogo size={38} />
        <h1 className="brand-title">
          <span className="brand-six">Six</span> <span className="brand-cards">Cards</span>
        </h1>
      </div>

      {/* TOP RIGHT CONTROLS: 6-DOTS RULES BUTTON & PROFILE AVATAR */}
      <div className="header-actions">
        {/* 6-DOTS RULES BUTTON */}
        <button
          type="button"
          className="header-dots-btn"
          onClick={onOpenRules}
          aria-label="Open Game Rules"
          id="rules-btn"
          title="Open Game Rules"
        >
          <SixDotsIcon active={isGameActive} size={16} />
        </button>

        {/* REAL PROFILE PICTURE (System generated or user uploaded) */}
        <button
          type="button"
          className="header-avatar-btn"
          onClick={onOpenProfile}
          aria-label={user ? `Profile for ${user.username}` : 'User Profile'}
          id="profile-btn"
          title={user ? `${user.username} (${user.id})` : 'Profile'}
        >
          <Avatar avatar={user?.avatar} name={user?.username || 'Player'} size={32} />
        </button>
      </div>
    </header>
  );
};
