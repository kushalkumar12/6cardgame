import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureDatabaseExists(
  host = 'localhost',
  port = 5432,
  user = 'postgres',
  password = 'admin',
  databaseName = '6cardgame'
) {
  // Connect to default maintenance database 'postgres'
  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (res.rows.length === 0) {
      console.log(`🔨 Creating PostgreSQL database "${databaseName}"...`);
      // Note: database name in DDL cannot use parameterized query
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`✅ Database "${databaseName}" created successfully!`);
    } else {
      console.log(`ℹ️  Database "${databaseName}" already exists.`);
    }
  } catch (err: any) {
    console.error('Database creation check error:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Connect to "6cardgame" and sync schema
  const dbClient = new Client({
    host,
    port,
    user,
    password,
    database: databaseName,
  });

  try {
    await dbClient.connect();
    console.log(`🔌 Connected to database "${databaseName}". Syncing schema...`);
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await dbClient.query(sql);
      console.log(`✅ Tables, indexes, and constraints synchronized in "${databaseName}".`);
    }

    // Seed default records if users table is empty
    const usersCount = await dbClient.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo player profiles into "6cardgame"...');
      const now = Date.now();
      await dbClient.query(
        `INSERT INTO users (id, username, avatar, auth_provider, referral_code, referral_count, chips, created_at, updated_at)
         VALUES 
         ('P-1001', 'Kushal', '👑', 'guest', 'KUSH1001', 3, 2500, $1, $1),
         ('P-1002', 'Aiden', '🦊', 'guest', 'AIDEN1002', 1, 1400, $1, $1)`,
        [now]
      );
      await dbClient.query(
        `INSERT INTO user_stats (user_id, games_played, games_won, best_score, zero_card_wins, updated_at)
         VALUES 
         ('P-1001', 12, 8, 2, 3, $1),
         ('P-1002', 7, 4, 5, 1, $1)`,
        [now]
      );
      console.log('✅ Demo accounts seeded: P-1001 (Kushal) and P-1002 (Aiden).');
    }
  } catch (err: any) {
    console.error(`Error syncing schema for "${databaseName}":`, err.message);
    throw err;
  } finally {
    await dbClient.end();
  }
}

// Allow direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureDatabaseExists()
    .then(() => {
      console.log('🎉 PostgreSQL setup complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error during DB initialization:', err);
      process.exit(1);
    });
}
