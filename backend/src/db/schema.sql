-- =========================================================
-- Six Cards Game Database Schema (PostgreSQL / Supabase)
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  avatar VARCHAR(255) NOT NULL,
  auth_provider VARCHAR(50) DEFAULT 'guest',
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referred_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  referral_count INT DEFAULT 0,
  chips INT DEFAULT 1000,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. USER STATS TABLE
CREATE TABLE IF NOT EXISTS user_stats (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  best_score INT DEFAULT 999,
  zero_card_wins INT DEFAULT 0,
  updated_at BIGINT NOT NULL
);

-- 3. FRIENDS TABLE
CREATE TABLE IF NOT EXISTS friends (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- 4. ROOMS TABLE (Tracks Multiplayer Rooms and in-flight Game State)
CREATE TABLE IF NOT EXISTS rooms (
  room_code VARCHAR(16) PRIMARY KEY,
  host_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'IN_PROGRESS', 'FINISHED'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  game_state JSONB DEFAULT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 5. ROOM PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS room_participants (
  id BIGSERIAL PRIMARY KEY,
  room_code VARCHAR(16) NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(128),
  is_host BOOLEAN DEFAULT FALSE,
  joined_at BIGINT NOT NULL,
  UNIQUE(room_code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_code);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);

-- 6. ACTIVE CONNECTIONS TABLE (Replaces in-memory socket maps)
CREATE TABLE IF NOT EXISTS connections (
  socket_id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_at BIGINT NOT NULL,
  last_heartbeat BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);

-- 7. GAME HISTORY TABLE (Comprehensive game logs, scores, winners)
CREATE TABLE IF NOT EXISTS game_history (
  id VARCHAR(64) PRIMARY KEY,
  room_code VARCHAR(16),
  mode VARCHAR(32) NOT NULL,
  start_time BIGINT NOT NULL,
  end_time BIGINT NOT NULL,
  end_reason VARCHAR(64),
  winner_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  round_count INT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_history_room ON game_history(room_code);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
