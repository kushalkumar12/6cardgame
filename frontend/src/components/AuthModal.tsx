import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { UserProfile } from '../types/user';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverHealth, setServerHealth] = useState<{ checked: boolean; healthy: boolean; profile?: string }>({
    checked: false,
    healthy: false,
  });

  useEffect(() => {
    console.log(`[SixCards] 🌐 Connecting to backend: ${api.getServerUrl()}`);
    api
      .getHealth()
      .then((data) => {
        console.log('[SixCards] ✅ Backend health check response:', data);
        setServerHealth({ checked: true, healthy: data.status === 'healthy', profile: data.profile });
      })
      .catch((err) => {
        console.warn('[SixCards] ⚠️ Backend health check failed:', err);
        setServerHealth({ checked: true, healthy: false });
      });
  }, []);

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.login({
        username: username.trim() || undefined,
        authProvider: 'guest',
        referralCodeInput: referralCode.trim() || undefined,
      });
      if (res.success) {
        onSuccess(res.user);
      } else {
        setError('Login failed');
      }
    } catch (err: any) {
      console.error('[SixCards] Login failed:', err);
      setError(`Connection failed. Target: ${api.getServerUrl()}. If the server was sleeping, please wait a few seconds and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    // Google Auth integration readiness:
    // In production, initialize google.accounts.id.renderButton or google.accounts.id.prompt()
    try {
      const fakeGoogleName = username.trim() || 'Google_Player';
      const res = await api.login({
        username: fakeGoogleName,
        authProvider: 'google',
        googleProfile: { name: fakeGoogleName, email: `${fakeGoogleName.toLowerCase()}@gmail.com` },
        referralCodeInput: referralCode.trim() || undefined,
      });
      if (res.success) {
        onSuccess(res.user);
      }
    } catch {
      setError('Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.png"
            alt="Six Cards Logo"
            style={{ width: 68, height: 68, objectFit: 'contain', borderRadius: 14, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
          />
        </div>
        <h2>Welcome to Six Cards</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Sign in to access Player Profiles, Match Scoreboard, Friends list, Refer & Earn, and Online Multiplayer!
        </p>

        {/* Live Server Health Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 12,
            background: serverHealth.healthy
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(234, 179, 8, 0.15)',
            border: `1px solid ${
              serverHealth.healthy ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
            }`,
            color: serverHealth.healthy ? '#4ade80' : '#facc15',
          }}
        >
          <span>{serverHealth.healthy ? '🟢' : serverHealth.checked ? '🟡' : '🔄'}</span>
          <span>
            {serverHealth.healthy
              ? `Backend Connected (${serverHealth.profile?.toUpperCase() || 'PROD'})`
              : serverHealth.checked
              ? 'Waking up backend server...'
              : 'Verifying server connection...'}
          </span>
        </div>

        {error && (
          <div style={{ color: '#fda4af', background: 'rgba(225,29,72,0.15)', padding: 10, borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', margin: '20px 0' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--gold-light)', display: 'block', marginBottom: 6 }}>
              Username or Display Name
            </label>
            <input
              type="text"
              className="player-name-input"
              style={{ width: '100%' }}
              placeholder="e.g. AceOfHearts"
              value={username}
              maxLength={16}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Referral Code (Optional - get +100 bonus chips!)
            </label>
            <input
              type="text"
              className="player-name-input"
              style={{ width: '100%' }}
              placeholder="e.g. REF-7K2X or ACE100"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="primary-gold-btn"
            disabled={loading}
            onClick={handleGuestLogin}
            id="auth-guest-btn"
          >
            {loading ? 'Entering...' : 'Enter Game (Guest / Direct)'}
          </button>

          {/* Google Auth Button (Ready for production domain OAuth) */}
          <button
            type="button"
            className="secondary-ghost-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '12px',
              fontSize: '0.95rem',
            }}
            onClick={handleGoogleLogin}
            id="auth-google-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
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
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            className="secondary-ghost-btn"
            style={{
              padding: '8px 12px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
            }}
            onClick={async () => {
              setLoading(true);
              try {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                const res = await api.login({
                  username: `Player_${randomNum}`,
                  authProvider: 'guest',
                });
                if (res.success) onSuccess(res.user);
              } finally {
                setLoading(false);
              }
            }}
          >
            🎲 Generate New Player Profile (For Tab 2 Test)
          </button>
        </div>
      </div>
    </div>
  );
};
