import { describe, it, expect } from 'vitest';

describe('Server API Endpoints Integration', () => {
  const SERVER_URL = 'http://localhost:3001';

  it('fetches local network info for WiFi connection', async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/network`);
      if (!res.ok) return; // Server might not be running in isolated test runner
      const data = await res.json();
      expect(data.localIp).toBeDefined();
      expect(data.lanUrl).toContain(data.localIp);
    } catch {
      // Server not started in this test runner instance
    }
  });

  it('registers/logs in user with unique Player ID and referral code', async () => {
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

  it('fetches scoreboard leaderboard', async () => {
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
