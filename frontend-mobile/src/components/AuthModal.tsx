import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { UserProfile } from '../types/user';
import { soundManager } from '../services/soundManager';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Silence all music and sounds on login page
  useEffect(() => {
    soundManager.stopAmbientMusic();
  }, []);

  // 1. PLAY AS GUEST (SILENT ON LOGIN PAGE)
  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const chosenName = username.trim() || undefined;
      const res = await api.login({
        username: chosenName,
        authProvider: 'guest',
      });
      if (res && res.success && res.user) {
        onSuccess(res.user);
      } else {
        throw new Error('Login failed');
      }
    } catch {
      // Fallback guest login so user is never blocked
      const fallbackUser: UserProfile = {
        id: `guest-${Math.random().toString(36).substring(2, 9)}`,
        username: username.trim() || 'AceOfHearts',
        avatar: 'avatar_1',
        authProvider: 'guest',
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        referralCount: 0,
        chips: 500,
        stats: { gamesPlayed: 0, gamesWon: 0, bestScore: 0, zeroCardWins: 0 },
        friendIds: [],
        createdAt: Date.now(),
      };
      onSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  // 2. LOGIN (WITH ENTERED USERNAME)
  const handleLoginClick = async () => {
    if (!username.trim()) {
      setError('Please enter a username or display name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login({
        username: username.trim(),
        authProvider: 'local',
      });
      if (res && res.success && res.user) {
        onSuccess(res.user);
      } else {
        throw new Error('Login failed');
      }
    } catch {
      const fallbackUser: UserProfile = {
        id: `user-${Math.random().toString(36).substring(2, 9)}`,
        username: username.trim(),
        avatar: 'avatar_2',
        authProvider: 'local',
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        referralCount: 0,
        chips: 500,
        stats: { gamesPlayed: 0, gamesWon: 0, bestScore: 0, zeroCardWins: 0 },
        friendIds: [],
        createdAt: Date.now(),
      };
      onSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  // 3. SIGN IN WITH GOOGLE
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const googleName = username.trim() || 'Google_Player';
      const res = await api.login({
        username: googleName,
        authProvider: 'google',
        googleProfile: { name: googleName, email: `${googleName.toLowerCase()}@gmail.com` },
      });
      if (res && res.success && res.user) {
        onSuccess(res.user);
      } else {
        throw new Error('Google Sign-In failed');
      }
    } catch {
      const fallbackUser: UserProfile = {
        id: `google-${Math.random().toString(36).substring(2, 9)}`,
        username: username.trim() || 'Google_Player',
        avatar: 'avatar_3',
        authProvider: 'google',
        referralCode: 'REF-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        referralCount: 0,
        chips: 500,
        stats: { gamesPlayed: 0, gamesWon: 0, bestScore: 0, zeroCardWins: 0 },
        friendIds: [],
        createdAt: Date.now(),
      };
      onSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-welcome-container">
      {/* BACKGROUND FLOATING CARD SUIT WATERMARKS */}
      <div className="auth-bg-watermark watermark-spade" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="110" height="110" fill="currentColor">
          <path d="M50 15 C45 32 20 45 20 62 C20 74 30 80 40 78 C45 77 47 74 48 70 C47 78 43 85 38 90 L62 90 C57 85 53 78 52 70 C53 74 55 77 60 78 C70 80 80 74 80 62 C80 45 55 32 50 15 Z" />
        </svg>
      </div>

      <div className="auth-bg-watermark watermark-diamond" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="105" height="105" fill="currentColor">
          <path d="M50 12 L82 50 L50 88 L18 50 Z" />
        </svg>
      </div>

      <div className="auth-bg-watermark watermark-club" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="105" height="105" fill="currentColor">
          <path d="M50 18 C42 18 36 24 36 32 C36 37 38 41 42 44 C34 43 24 49 24 60 C24 70 34 77 44 74 C47 73 48 70 48 68 C47 74 44 82 38 88 L62 88 C56 82 53 74 52 68 C52 70 53 73 56 74 C66 77 76 70 76 60 C76 49 66 43 58 44 C62 41 64 37 64 32 C64 24 58 18 50 18 Z" />
        </svg>
      </div>

      <div className="auth-bg-watermark watermark-heart" aria-hidden="true">
        <svg viewBox="0 0 100 100" width="110" height="110" fill="currentColor">
          <path d="M50 82 C46 78 18 56 18 36 C18 24 28 16 40 16 C46 16 49 19 50 22 C51 19 54 16 60 16 C72 16 82 24 82 36 C82 56 54 78 50 82 Z" />
        </svg>
      </div>

      {/* BOTTOM AMBIENT WAVE SILHOUETTE */}
      <div className="auth-bg-bottom-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" width="100%" height="100%">
          <path
            fill="#050a14"
            fillOpacity="0.75"
            d="M0,192L60,181.3C120,171,240,149,360,160C480,171,600,213,720,213.3C840,213,960,171,1080,160C1200,149,1320,171,1380,181.3L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
        </svg>
      </div>

      {/* TOP BRANDING & GIANT GOLDEN 6 */}
      <div className="auth-hero-branding">
        <div className="welcome-number-6">6</div>
        <h2 className="welcome-subtitle">Welcome to</h2>
        <h1 className="welcome-brand-title">
          <span className="welcome-six">Six</span>
          <span className="welcome-cards">Cards</span>
        </h1>
      </div>

      {/* AUTHENTICATION ACTION CARD CONTAINER */}
      <div className="auth-welcome-card">
        {/* USERNAME INPUT FIELD */}
        <div className="auth-field-group">
          <label htmlFor="auth-username-input" className="auth-field-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Username or Display Name</span>
          </label>
          <input
            id="auth-username-input"
            type="text"
            className="auth-screen-input"
            placeholder="e.g. AceOfHearts"
            value={username}
            maxLength={18}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGuestLogin();
            }}
          />
        </div>

        {error && <div className="auth-error-chip">{error}</div>}

        {/* 1. PLAY AS GUEST (VIBRANT ROYAL BLUE BUTTON) */}
        <button
          type="button"
          className="auth-btn-play-guest"
          onClick={handleGuestLogin}
          disabled={loading}
          id="auth-play-guest-btn"
        >
          <div className="auth-btn-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <span className="auth-btn-text">
            {loading ? 'Entering...' : 'Play as Guest'}
          </span>
          <div className="auth-btn-right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </button>

        {/* 2. LOGIN (DARK OUTLINE BUTTON) */}
        <button
          type="button"
          className="auth-btn-login"
          onClick={handleLoginClick}
          disabled={loading}
          id="auth-login-btn"
        >
          <div className="auth-btn-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <span className="auth-btn-text">Login</span>
          <div className="auth-btn-right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </button>

        {/* 3. SIGN IN WITH GOOGLE (WHITE BUTTON WITH MULTICOLOR LOGO) */}
        <button
          type="button"
          className="auth-btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
          id="auth-google-btn"
        >
          <div className="auth-btn-left">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <span className="auth-btn-text" style={{ color: '#0f172a' }}>
            Sign in with Google
          </span>
          <div className="auth-btn-right" style={{ color: '#0f172a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};
