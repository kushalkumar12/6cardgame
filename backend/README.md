# Six Cards — Backend Application Documentation

This document provides complete documentation for the **Six Cards Backend** server, covering environment profiles, database schema, REST API endpoints, real-time WebSocket protocol, and cloud deployment.

---

## 1. Technology Stack & Key Highlights

- **Runtime & Framework**: [Node.js](https://nodejs.org/) + [Express v5](https://expressjs.com/)
- **Real-Time WebSockets**: [Socket.IO v4.8](https://socket.io/) (Persistent bidirectional TCP connections)
- **Database**: PostgreSQL 18 (Local) & [Supabase](https://supabase.com/) (Production)
- **Database Driver**: `pg` (`node-postgres` connection pool with SSL support)
- **TypeScript Runner**: [tsx](https://github.com/privatenumber/tsx) (Zero-build TypeScript execution)
- **Testing**: [Vitest](https://vitest.dev/) (51 automated unit and integration tests)

---

## 2. Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── profiles.ts           # Environment profile manager (dev / test / prod)
│   │
│   ├── db/
│   │   ├── createDatabase.ts     # CLI script to automatically provision local database
│   │   ├── database.ts           # PostgreSQL connection pool and mock DB fallback
│   │   ├── schema.sql            # Idempotent DDL (tables, indexes, foreign keys)
│   │   └── repositories/
│   │       ├── connectionRepo.ts # User-to-socket mapping in SQL
│   │       ├── historyRepo.ts    # Game match logs repository
│   │       ├── roomRepo.ts       # Room and participant state repository
│   │       └── userRepo.ts       # Users, career stats, and bidirectional friends
│   │
│   ├── engine/                   # Server-side authoritative game rules engine
│   │   ├── aiBot.ts              # Heuristic AI bot decision logic
│   │   ├── deck.ts               # Standard 52-card deck generator & seeded shuffle
│   │   ├── gameEngine.ts         # Authoritative turn and phase state machine
│   │   └── scoring.ts            # Hand value and lowest-score calculation
│   │
│   ├── types/                    # Shared TypeScript interfaces (card.ts, game.ts, user.ts)
│   └── server.ts                 # Express REST API & Socket.IO server orchestrator
│
├── .env                          # Base environment configuration
├── .env.development              # Local development configuration (PostgreSQL localhost:5432)
├── .env.production               # Production configuration (Supabase SSL connection)
├── .env.test                     # Isolated testing configuration (In-memory SQL mock)
├── .env.example                  # Environment variable reference
├── package.json                  # Backend dependencies and scripts
└── tsconfig.json                 # Node.js TypeScript configuration
```

---

## 3. Environment Profiles

The backend implements a **Profile-Driven Architecture** managed by [profiles.ts](file:///d:/JavaProjects/6CardGame/backend/src/config/profiles.ts):

| Profile | Activated By | Database | SSL | CORS Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **`dev`** | `APP_PROFILE=dev` (default) | Local PostgreSQL (`localhost:5432/6cardgame`) | Disabled | Open (`localhost:5173`, `localhost:3000`, `*`) |
| **`test`** | `APP_PROFILE=test` (`npm test`) | Isolated In-Memory Mock Database | Disabled | Headless / in-process execution |
| **`prod`** | `APP_PROFILE=prod` (`npm start`) | **Supabase PostgreSQL** | `rejectUnauthorized: false` | Restricted to `ALLOWED_ORIGINS` (e.g. Vercel) |

---

## 4. PostgreSQL Database Schema

The database schema is defined in [schema.sql](file:///d:/JavaProjects/6CardGame/backend/src/db/schema.sql) and auto-synchronized upon server startup:

1. **`users`**:
   - `id VARCHAR(64) PRIMARY KEY` — Unique Player ID (e.g. `P-1001`).
   - `username`, `avatar`, `auth_provider`, `referral_code`, `referred_by`, `referral_count`, `chips`.
2. **`user_stats`**:
   - `user_id` (foreign key to `users`).
   - `games_played`, `games_won`, `best_score`, `zero_card_wins`.
3. **`friends`**:
   - `user_id`, `friend_id`, `created_at`.
   - Guaranteed bidirectional mapping (queries check both directions: `user_id` & `friend_id`).
4. **`rooms`**:
   - `room_code VARCHAR(16) PRIMARY KEY` — 4-letter join code (e.g. `7K2X`).
   - `host_user_id`, `status` (`WAITING`, `IN_PROGRESS`, `FINISHED`), `config`, `game_state`.
5. **`room_participants`**:
   - `room_code`, `user_id`, `socket_id`, `is_host`.
6. **`connections`**:
   - Real-time online socket presence mapping active socket IDs to user IDs.
7. **`game_history`**:
   - Permanent match log recording winners, final hand scores, cards remaining, and end reasons.

---

## 5. REST API Endpoints Reference

| Method | Endpoint | Description | Request Body / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and active profile info | None |
| `POST` | `/api/auth/login` | Login as guest or save profile | `{ username, authProvider, referralCodeInput }` |
| `GET` | `/api/users/profile/:userId` | Get user profile and career stats | None |
| `GET` | `/api/users/search?q=:query` | Search players by ID or username | Query string `?q=P-1001` |
| `GET` | `/api/friends/list/:userId` | Get full friends list with online status | None |
| `POST` | `/api/friends/add` | Add player as friend (bidirectional) | `{ userId, targetId }` |
| `POST` | `/api/refer/use` | Validate referral code and claim chips | `{ userId, referralCode }` |
| `GET` | `/api/scoreboard` | Global leaderboard sorted by wins | None |
| `GET` | `/api/history` | Last 15 completed multiplayer matches | None |
| `GET` | `/api/online-players` | List of players currently online | Query string `?exclude=:userId` |

---

## 6. Real-Time Socket.IO Protocol Reference

### Client-to-Server Events
- `register_user`: `{ userId, username, avatar }` — Registers socket into L1 memory map and L2 SQL `connections` table.
- `get_online_players`: Requests the list of all currently active users.
- `create_room`: `{ userId, displayName, avatar, maxPlayers }` — Creates a new game lobby with a 4-letter Room Code.
- `join_room`: `{ roomCode, userId, displayName, avatar }` — Joins an existing game lobby.
- `toggle_ready`: `{ roomCode, userId }` — Toggles readiness in the lobby.
- `invite_player`: `{ roomCode, targetPlayerId, fromName, fromUserId }` — Sends an invitation toast to an online player.
- `send_friend_request`: `{ fromUserId, targetPlayerId }` — Sends a real-time friend request toast to an online player.
- `accept_friend_request`: `{ userId, friendId }` — Accepts a friend request and syncs bidirectional friendship in PostgreSQL.
- `start_room_game`: `{ roomCode }` — Starts the match (Host only, minimum 2 players).
- `room_action`: `{ roomCode, actionType, payload }` — Authoritative turn action (`DRAW`, `REPLACE`, `DISCARD`, `ABILITY_7`, `ABILITY_8`, `ABILITY_JACK`, `ELIMINATE`, `DECLARE_VICTORY`).

### Server-to-Client Broadcasts
- `received_invitation`: `{ roomCode, fromName, fromUserId, timestamp }` — Delivered to invitee socket.
- `received_friend_request`: `{ fromUserId, fromName, fromAvatar, timestamp }` — Delivered to target player socket.
- `friend_list_updated`: Emitted to both players when a friendship is established.
- `room_updated`: `{ roomCode, players, hostId, status }` — Emitted when players join, leave, or ready up.
- `game_started`: `{ state, myGamePlayerId, room }` — Emitted with sanitized hands (opponent cards hidden).
- `room_state_update`: `{ state, myGamePlayerId }` — Emitted after every turn or elimination.

---

## 7. Local Development & Testing

### Running the Backend Server:
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:3001` with Dev profile connected to local PostgreSQL `6cardgame`)*

### Running Automated Test Suite:
```bash
npm test
```
*(Executes all 51 Vitest unit, SQL repository, and engine integration tests in test profile)*

### Bootstrapping Local PostgreSQL Database:
```bash
npm run db:init
```
*(Creates the `6cardgame` database and verifies credentials on `localhost:5432`)*

---

## 8. Render Deployment Step-by-Step

1. Log in to [Render](https://render.com/) and click **"New +"** → **"Web Service"**.
2. Connect your GitHub repository: `kushalkumar12/6cardgame`.
3. In service settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` *(runs `tsx src/server.ts` with `APP_PROFILE=prod`)*
4. In **Environment Variables**, add:
   ```env
   APP_PROFILE=prod
   PORT=3001
   DATABASE_URL=postgresql://postgres:[PASSWORD]@...pooler.supabase.com:6543/postgres?sslmode=require
   ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-mobile-frontend.vercel.app
   ```
5. Click **Deploy Web Service**.

---

## 9. Client Compatibility & Supported Frontends

The backend is fully decoupled and seamlessly supports:
1. **Desktop Web App (`frontend/`)**: Optimized for widescreen displays, emerald poker table layout, and keyboard/mouse interaction.
2. **Mobile Web App (`frontend-mobile/`)**: Optimized for smartphones, handheld touch gestures, synthesized Web Audio, and dedicated mobile multiplayer room creation & join flows.

Both clients connect simultaneously to the same WebSocket server, allowing seamless cross-platform multiplayer matches between desktop and mobile players.
