import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export type AppProfile = 'dev' | 'prod' | 'test';

// Determine profile from APP_PROFILE or NODE_ENV
const rawProfile = (process.env.APP_PROFILE || process.env.NODE_ENV || 'dev').toLowerCase();
export const currentProfile: AppProfile =
  rawProfile === 'prod' || rawProfile === 'production'
    ? 'prod'
    : rawProfile === 'test'
    ? 'test'
    : 'dev';

// Load environment files based on active profile:
// 1. .env (base)
// 2. .env.[profile] (overrides)
// 3. .env.local (developer overrides)
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, `.env.${currentProfile}`) });
dotenv.config({ path: path.join(rootDir, '.env.local') });

export interface ProfileConfig {
  profile: AppProfile;
  isProd: boolean;
  isDev: boolean;
  isTest: boolean;
  port: number;
  databaseUrl: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  corsOrigins: string[] | string;
  secureCookies: boolean;
}

function resolveDatabaseUrl(): string {
  if (currentProfile === 'test') {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/6cardgame';
  }
  return process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/6cardgame';
}

function resolveSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  // Supabase or hosted cloud postgres requires SSL with rejectUnauthorized: false
  if (url.includes('supabase.co') || url.includes('sslmode=require') || currentProfile === 'prod') {
    return { rejectUnauthorized: false };
  }
  return false;
}

function resolveCorsOrigins(): string[] | string {
  if (currentProfile === 'prod') {
    const allowed = process.env.ALLOWED_ORIGINS;
    if (allowed) {
      return allowed.split(',').map((o) => o.trim());
    }
    // Default to origin reflection or specified Vercel app domain
    return process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : '*';
  }
  // In dev / test allow local frontend dev servers
  return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', '*'];
}

export const config: ProfileConfig = {
  profile: currentProfile,
  isProd: currentProfile === 'prod',
  isDev: currentProfile === 'dev',
  isTest: currentProfile === 'test',
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: resolveDatabaseUrl(),
  ssl: resolveSsl(resolveDatabaseUrl()),
  corsOrigins: resolveCorsOrigins(),
  secureCookies: currentProfile === 'prod',
};

export function printProfileBanner() {
  console.log('=====================================================');
  console.log(` 🎴 Six Cards Game Server — Profile: [${config.profile.toUpperCase()}]`);
  console.log(` 🌐 Port: ${config.port}`);
  console.log(` 🗄️  Database: ${config.databaseUrl ? (config.databaseUrl.includes('@') ? `PostgreSQL (${config.databaseUrl.split('@')[1]})` : 'PostgreSQL') : 'In-Memory / Mock DB'}`);
  console.log(` 🔒 SSL: ${config.ssl ? 'Enabled' : 'Disabled'}`);
  console.log(` 🛡️  CORS: ${Array.isArray(config.corsOrigins) ? config.corsOrigins.join(', ') : config.corsOrigins}`);
  console.log('=====================================================');
}
