# Six Cards — PostgreSQL, Profiles & Deployment Guide

## 1. Architecture & Profiles Overview

The application features a **Profile-Driven Architecture** supporting three distinct environments:

| Profile | Command / Variable | Database | Network & Security |
| :--- | :--- | :--- | :--- |
| **`dev`** | `APP_PROFILE=dev` (default) | Local PostgreSQL (`localhost:5432/sixcardgame`) with automatic zero-config fallback to in-memory SQL mock if PG is offline | `localhost:3001`, open CORS for local Vite dev server |
| **`test`** | `APP_PROFILE=test` (`npm test`) | Isolated In-Memory SQL Mock Database | Headless test runner, instant execution, zero external dependencies |
| **`prod`** | `APP_PROFILE=prod` | **Supabase PostgreSQL** with SSL enabled (`sslmode=require`) | Strict CORS origins (`ALLOWED_ORIGINS`), secure cookies, domain-level routing |

---

## 2. PostgreSQL & Supabase Database Configuration

### A. Automatic SQL Schema
The server automatically applies the idempotent schema from [server/db/schema.sql](file:///d:/JavaProjects/6CardGame/server/db/schema.sql) upon startup.

Tables managed:
1. **`users`**: User profiles, unique player IDs (`P-1001`), usernames, avatars, referral codes, and chips.
2. **`user_stats`**: Career performance (`games_played`, `games_won`, `best_score`, `zero_card_wins`).
3. **`friends`**: Relational social graph connecting users.
4. **`rooms`**: Multiplayer rooms, host IDs, status (`WAITING`, `IN_PROGRESS`, `FINISHED`), and serializable game states.
5. **`room_participants`**: Active players in each room.
6. **`connections`**: Real-time socket mapping tracking active connected devices per user.
7. **`game_history`**: Permanent match logs, timestamps, winners, final scores, and end reasons.

### B. Connecting Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** → **Database** → **Connection String** → Select **URI** (Transaction pooler or direct connection).
3. In your production environment or `.env.production`, set:
   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. When `APP_PROFILE=prod`, the server automatically enables `ssl: { rejectUnauthorized: false }`.

---

## 3. Deployment Configuration

### A. Deploying Frontend to Vercel
The frontend is built with React 19 and Vite 8 and includes [vercel.json](file:///d:/JavaProjects/6CardGame/vercel.json) for single-page application (SPA) routing:

1. Push this repository to GitHub/GitLab.
2. Import the repository into [vercel.com](https://vercel.com).
3. In Vercel Project Settings, add the following Environment Variables:
   - `VITE_API_URL`: URL of your backend server (e.g. `https://six-cards-backend.up.railway.app`)
   - `VITE_SOCKET_URL`: URL of your backend server (e.g. `https://six-cards-backend.up.railway.app`)
4. Build settings (automatically detected from `vercel.json`):
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### B. Deploying Backend (Node.js + WebSockets + PostgreSQL)
Because real-time multiplayer requires persistent WebSocket connections (Socket.IO rooms), host the backend on a platform that supports long-lived Node.js services (e.g. **Railway**, **Render**, **Fly.io**, or **AWS/DigitalOcean**):

1. Set the root build command to: `npm run build` (or leave default).
2. Set the start command to: `npx tsx server/server.ts`.
3. Set Environment Variables in your hosting dashboard:
   ```env
   APP_PROFILE=prod
   PORT=3001
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```

---

## 4. Local Development Quick Start

```bash
# 1. Start backend server (starts in dev profile)
npx tsx server/server.ts

# 2. Start frontend dev server
npx vite

# 3. Run all 51 automated unit, integration & SQL tests
npm test

# 4. Verify production build
npm run build
```
