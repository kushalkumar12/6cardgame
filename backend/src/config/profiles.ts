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
[rootDir, process.cwd()].forEach((dir) => {
  dotenv.config({ path: path.join(dir, '.env') });
  dotenv.config({ path: path.join(dir, `.env.${currentProfile}`) });
  dotenv.config({ path: path.join(dir, '.env.local') });
});

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

export function sanitizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const match = rawUrl.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@\/]+(?::\d+)?(?:(?:\/|\?).*)?)$/);
  if (!match) return rawUrl;
  const [, prefix, user, pass, rest] = match;
  let decodedPass = pass;
  try {
    decodedPass = decodeURIComponent(pass);
  } catch {
    decodedPass = pass;
  }
  const encodedPass = encodeURIComponent(decodedPass);
  return `${prefix}${user}:${encodedPass}@${rest}`;
}

function resolveDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/6cardgame';
  if (currentProfile === 'test') {
    url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/6cardgame';
  }
  return sanitizeDatabaseUrl(url);
}

function resolveSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  // Supabase or hosted cloud postgres requires SSL with rejectUnauthorized: false
  if (url.includes('supabase.co') || url.includes('sslmode=require') || currentProfile === 'prod') {
    return { rejectUnauthorized: false };
  }
  return false;
}

function resolveCorsOrigins(): any {
  if (currentProfile === 'prod') {
    const allowed = process.env.ALLOWED_ORIGINS;
    if (allowed && allowed !== '*') {
      return allowed.split(',').map((o) => o.trim());
    }
    // Return true to reflect origin (required for CORS when credentials: true)
    return true;
  }
  return true;
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
