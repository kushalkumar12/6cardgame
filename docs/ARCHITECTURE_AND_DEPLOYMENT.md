# Six Cards — Cloud Architecture & Deployment Runbook

This guide details the complete cloud architecture, networking flow, security considerations, and deployment sequence connecting Vercel, Render, and Supabase.

---

## 1. System Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│                         (Worldwide Browsers)                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           HTTPS (Static Assets)     │      WSS & HTTPS (APIs & Turns)
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌─────────────────────────────┐                    ┌─────────────────────┐
│       VERCEL EDGE CDN       │                    │    RENDER SERVICE   │
│   (React 19 + Vite 8 SPA)   │                    │ (Node.js + Socket.IO│
│  https://6cardgame.vercel.app                    │ https://...onrender.│
└─────────────────────────────┘                    └──────────┬──────────┘
                                                              │
                                            PostgreSQL (SSL)  │ Pooler Port 6543
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │   SUPABASE CLOUD    │
                                                   │    (PostgreSQL)     │
                                                   │   Database Tables   │
                                                   └─────────────────────┘
```

---

## 2. Responsibilities by Layer

| Layer | Host Platform | Purpose | Scaling Model |
| :--- | :--- | :--- | :--- |
| **Desktop UI (`frontend/`)** | **Vercel** | Widescreen poker table UI for desktop browsers | Globally distributed Edge CDN, automatic cache invalidation |
| **Mobile UI (`frontend-mobile/`)** | **Vercel** | Responsive 100dvh mobile web application with Web Audio engine and mobile rooms | Globally distributed Edge CDN, instant touch responsiveness |
| **Backend Service** | **Render** | Maintains active WebSocket TCP connections, validates card moves, manages 4-letter room codes, delivers real-time notifications | Persistent Node.js container with dedicated CPU & RAM |
| **Database** | **Supabase** | Permanent relational storage for users, career stats, mutual friends, chips, and match logs | Managed PostgreSQL with transaction pooling (`port 6543`) |

---

## 3. Production Deployment Checklist

### Step 1: Provision Supabase PostgreSQL Database
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Settings** → **Database** → **Connection String** → Select **URI**.
3. Choose **Transaction Pooler** (Port 6543).
4. Copy the URI:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

### Step 2: Deploy Backend to Render
1. Create a new **Web Service** on [render.com](https://render.com).
2. Select your repository `kushalkumar12/6cardgame`.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Configure Environment Variables:
   - `APP_PROFILE`: `prod`
   - `PORT`: `3001`
   - `DATABASE_URL`: *(Your Supabase connection string)*
   - `ALLOWED_ORIGINS`: `*` *(or your Vercel domain)*
5. Deploy and copy your generated Render domain (e.g. `https://six-cards-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Create a new project on [vercel.com](https://vercel.com).
2. Select your repository `kushalkumar12/6cardgame`.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://six-cards-backend.onrender.com`
   - `VITE_SOCKET_URL`: `https://six-cards-backend.onrender.com`
5. Click **Deploy**.

### Step 4: Lock Down CORS on Render
Once Vercel gives you your production domain (e.g. `https://6cardgame.vercel.app`):
1. In Render, change `ALLOWED_ORIGINS` to `https://6cardgame.vercel.app`.
2. Save changes.
