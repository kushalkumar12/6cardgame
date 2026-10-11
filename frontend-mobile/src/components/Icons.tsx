import React from 'react';

// Theater Masks Logo for Top Header (White comedy in front, Blue tragedy behind)
export const TheaterMasksLogo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
  >
    {/* Tragedy Mask (Blue, Background, shifted right & up) */}
    <g transform="translate(15, 4) scale(0.68) rotate(6, 20, 20)">
      <path
        d="M6 8C14 2 26 2 34 8C38 18 36 32 20 40C4 32 2 18 6 8Z"
        fill="#2563eb"
        stroke="#1d4ed8"
        strokeWidth="1.5"
      />
      {/* Downturned Eyes */}
      <path d="M11 15C13 18 16 18 17 17" stroke="#08101d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 17C24 18 27 18 29 15" stroke="#08101d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Frowning sad mouth */}
      <path d="M13 30C16 26 24 26 27 30" stroke="#08101d" strokeWidth="2.8" strokeLinecap="round" />
    </g>

    {/* Comedy Mask (White, Foreground) */}
    <g transform="translate(1, 6) scale(0.72) rotate(-4, 20, 20)">
      <path
        d="M6 8C14 2 26 2 34 8C38 18 36 32 20 40C4 32 2 18 6 8Z"
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      {/* Tilted Smiling Slit Eyes */}
      <ellipse cx="13" cy="17" rx="2.5" ry="3.5" transform="rotate(-15, 13, 17)" fill="#08101d" />
      <ellipse cx="27" cy="17" rx="2.5" ry="3.5" transform="rotate(15, 27, 17)" fill="#08101d" />
      {/* Big Theatrical Smiling Open Mouth */}
      <path
        d="M11 25C13 34 27 34 29 25C26 27 14 27 11 25Z"
        fill="#08101d"
      />
    </g>
  </svg>
);

// Two Drama Masks for "Multiplayer Online" Card (Left: Sad, Right: Happy)
export const TwoDramaMasks: React.FC<{ size?: number; className?: string }> = ({ size = 68, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Left Mask: Sad / Tragedy (White mask, tilted left) */}
    <g transform="translate(4, 10) scale(0.64) rotate(-8, 20, 20)">
      <path
        d="M6 8C14 2 26 2 34 8C38 18 36 32 20 40C4 32 2 18 6 8Z"
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Sad Eyes */}
      <ellipse cx="14" cy="17" rx="2.4" ry="3.2" transform="rotate(10, 14, 17)" fill="#0c1524" />
      <ellipse cx="26" cy="17" rx="2.4" ry="3.2" transform="rotate(-10, 26, 17)" fill="#0c1524" />
      {/* Frowning Sad Mouth */}
      <path d="M14 29C17 25 23 25 26 29" stroke="#0c1524" strokeWidth="3" strokeLinecap="round" />
    </g>

    {/* Right Mask: Happy / Comedy (White mask, tilted right) */}
    <g transform="translate(22, 6) scale(0.68) rotate(8, 20, 20)">
      <path
        d="M6 8C14 2 26 2 34 8C38 18 36 32 20 40C4 32 2 18 6 8Z"
        fill="#ffffff"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Smiling Slit Eyes */}
      <ellipse cx="13" cy="17" rx="2.5" ry="3.5" transform="rotate(-15, 13, 17)" fill="#0c1524" />
      <ellipse cx="27" cy="17" rx="2.5" ry="3.5" transform="rotate(15, 27, 17)" fill="#0c1524" />
      {/* Big Smiling Open Mouth */}
      <path
        d="M11 25C13 34 27 34 29 25C26 27 14 27 11 25Z"
        fill="#0c1524"
      />
    </g>
  </svg>
);

// Single Theatrical Comedy Mask (For card backs and card faces)
export const ComedyMask: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 28,
  color = '#ffffff',
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Mask Shell */}
    <path
      d="M6 8C13 2 27 2 34 8C38 18 36 34 20 42C4 34 2 18 6 8Z"
      fill={color}
    />
    {/* Eyes */}
    <ellipse
      cx="13"
      cy="17"
      rx="2.5"
      ry="3.5"
      transform="rotate(-12, 13, 17)"
      fill={color === '#ffffff' ? '#0c1524' : '#ffffff'}
    />
    <ellipse
      cx="27"
      cy="17"
      rx="2.5"
      ry="3.5"
      transform="rotate(12, 27, 17)"
      fill={color === '#ffffff' ? '#0c1524' : '#ffffff'}
    />
    {/* Open Smile Mouth */}
    <path
      d="M11 26C13.5 35 26.5 35 29 26C26 28 14 28 11 26Z"
      fill={color === '#ffffff' ? '#0c1524' : '#ffffff'}
    />
  </svg>
);

// Cute Robot Face Icon (For "Play with Bot" card)
export const RobotFace: React.FC<{ size?: number; className?: string }> = ({ size = 64, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Antenna */}
    <circle cx="32" cy="11" r="3" fill="#1e3a5f" />
    <line x1="32" y1="14" x2="32" y2="19" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round" />
    {/* Ears */}
    <rect x="8" y="28" width="4" height="10" rx="2" fill="#1e3a5f" />
    <rect x="52" y="28" width="4" height="10" rx="2" fill="#1e3a5f" />
    {/* Head */}
    <rect x="12" y="19" width="40" height="28" rx="10" fill="#ffffff" stroke="#1e3a5f" strokeWidth="3" />
    {/* Eyes */}
    <circle cx="23" cy="31" r="3.5" fill="#1e3a5f" />
    <circle cx="41" cy="31" r="3.5" fill="#1e3a5f" />
    {/* Mouth */}
    <path d="M26 38C28 40 36 40 38 38" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 6-Dots Icon (Header button, red dots when active, white/gray in menu)
export const SixDotsIcon: React.FC<{ active?: boolean; size?: number }> = ({ active = false, size = 18 }) => {
  const dotColor = active ? '#ef4444' : '#cbd5e1';
  return (
    <svg width={size} height={size + 6} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Row 1 */}
      <circle cx="4" cy="4" r="2" fill={dotColor} />
      <circle cx="12" cy="4" r="2" fill={dotColor} />
      {/* Row 2 */}
      <circle cx="4" cy="11" r="2" fill={dotColor} />
      <circle cx="12" cy="11" r="2" fill={dotColor} />
      {/* Row 3 */}
      <circle cx="4" cy="18" r="2" fill={dotColor} />
      <circle cx="12" cy="18" r="2" fill={dotColor} />
    </svg>
  );
};

// Smiley Profile Avatar Icon (Matching mockup header avatar)
export const SmileyAvatarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" stroke="#38bdf8" strokeWidth="1.8" />
    <circle cx="8.5" cy="9.5" r="1.3" fill="#38bdf8" />
    <circle cx="15.5" cy="9.5" r="1.3" fill="#38bdf8" />
    <path d="M7.5 14.5C9 17.5 15 17.5 16.5 14.5" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// Music Note Icon (Bottom bar)
export const MusicNoteIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 20, active = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: active ? 1 : 0.4 }}
  >
    <path
      d="M9 18V5L20 3V16"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="6" cy="18" r="3" fill="#ffffff" />
    <circle cx="17" cy="16" r="3" fill="#ffffff" />
  </svg>
);

// Speaker / Volume Icon (Bottom bar)
export const SpeakerIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 20, active = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity: active ? 1 : 0.4 }}
  >
    <path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {active ? (
      <>
        <path d="M15.54 8.46C16.47 9.4 17 10.66 17 12C17 13.34 16.47 14.6 15.54 15.54" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <path d="M19.07 4.93C20.94 6.81 22 9.33 22 12C22 14.67 20.94 17.19 19.07 19.07" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </>
    ) : (
      <path d="M22 2L2 22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
);

// Question Mark (Draw Pile Center Card)
export const QuestionMarkIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="14" stroke="#94a3b8" strokeWidth="1.8" />
    <path
      d="M14 14C14 11.8 15.8 10 18 10C20.2 10 22 11.8 22 14C22 15.5 21 16.5 19.5 17.5C18.5 18.2 18 19 18 20.5"
      stroke="#64748b"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="18" cy="24" r="1.3" fill="#64748b" />
  </svg>
);

// Diamond Suit Outline (Discard Slot Center Card)
export const DiamondOutlineIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 3L28 16L16 29L4 16L16 3Z"
      stroke="#2563eb"
      strokeWidth="2.5"
      fill="none"
      style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.6))' }}
    />
  </svg>
);

// Hamburger Menu (Top Right of "You" Mat)
export const HamburgerIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6H20M4 12H20M4 18H20" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Right Chevron Arrow
export const ChevronRightIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18L15 12L9 6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
