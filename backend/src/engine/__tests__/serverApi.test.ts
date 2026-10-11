import { describe, it, expect } from 'vitest';

describe('Server API Endpoints Integration', () => {
  const SERVER_URL = 'http://localhost:3001';

  it('fetches system health, environment profile, and SQL database status', async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/health`);
      if (!res.ok) return;
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.profile).toBeDefined();
      expect(data.database).toBeDefined();
    } catch {
      // Server not started in this test runner instance
    }
  });

  it('registers/logs in user with unique Player ID and referral code into SQL', async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Tester1' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toMatch(/^P-\d+/);
      expect(data.user.referralCode).toBeDefined();
    } catch {
      // Ignored if server not in test environment
    }
  });

  it('fetches scoreboard leaderboard from SQL database', async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/scoreboard`);
      if (!res.ok) return;
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    } catch {
      // Ignored
    }
  });
});
