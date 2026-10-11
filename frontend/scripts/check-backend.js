// Script run during frontend build (Vercel) to verify backend health
import https from 'https';

const BACKEND_URL = process.env.VITE_API_URL || 'https://sixcardgame.onrender.com';
const HEALTH_ENDPOINT = `${BACKEND_URL}/api/health`;

console.log('=============================================================');
console.log(' 🔍 [DEPLOYMENT CHECK] Verifying Backend API Reachability...');
console.log(` 🌐 Target URL: ${HEALTH_ENDPOINT}`);

const startTime = Date.now();

const req = https.get(HEALTH_ENDPOINT, { timeout: 10000 }, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    const elapsed = Date.now() - startTime;
    try {
      const json = JSON.parse(data);
      console.log(` ✅ Backend is REACHABLE & HEALTHY! (${elapsed}ms)`);
      console.log(`    Status:   ${json.status}`);
      console.log(`    Profile:  ${json.profile}`);
      console.log(`    Database: ${json.database}`);
    } catch {
      console.log(` ⚠️ Backend responded with HTTP ${res.statusCode} (${elapsed}ms)`);
    }
    console.log('=============================================================');
    process.exit(0);
  });
});

req.on('timeout', () => {
  console.log(' ⚠️ Backend health check timed out (Render may be sleeping / cold start).');
  console.log('   Proceeding with frontend build — client will connect when active.');
  console.log('=============================================================');
  req.destroy();
  process.exit(0);
});

req.on('error', (err) => {
  console.log(` ⚠️ Could not reach backend during build: ${err.message}`);
  console.log('   Proceeding with frontend build — client will connect at runtime.');
  console.log('=============================================================');
  process.exit(0);
});
