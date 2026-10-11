import React from 'react';

interface AvatarProps {
  avatar?: string;
  name?: string;
  size?: number;
  className?: string;
}

// Generate consistent gradient colors based on string
const getAvatarGradient = (str: string = 'User') => {
  const gradients = [
    ['#3b82f6', '#1d4ed8'],
    ['#8b5cf6', '#6d28d9'],
    ['#ec4899', '#be185d'],
    ['#06b6d4', '#0e7490'],
    ['#10b981', '#047857'],
    ['#f59e0b', '#b45309'],
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  name = 'Player',
  size = 36,
  className = '',
}) => {
  const isImage = Boolean(
    avatar && (avatar.startsWith('data:image') || avatar.startsWith('http') || avatar.startsWith('/'))
  );

  if (isImage) {
    return (
      <img
        src={avatar}
        alt={name}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid #38bdf8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      />
    );
  }

  // System-generated real vector avatar
  const [col1, col2] = getAvatarGradient(name);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${col1} 0%, ${col2} 100%)`,
        border: '1.5px solid #38bdf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: '0.02em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
};
