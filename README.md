# Six Cards — Strategic Memory & Elimination Card Game

A high-stakes, responsive multiplayer card game for 2 to 6 players combining hidden-card memory, strategic replacement, special abilities (7, 8, Jack), numeric point-value matching, permanent card elimination, and career statistics.

---

## 📁 Project Architecture

The repository is organized into two standalone, decoupled applications:

```text
6CardGame/
├── frontend/                     # Standalone React + Vite SPA (Deploy to Vercel)
│   ├── public/                   # Logo, icons, favicon
│   ├── src/                      # UI components, modals, styles, game engine
│   ├── index.html                # Entry HTML
│   ├── package.json              # Frontend dependencies (React 19, Vite 8, Socket.IO client)
│   ├── vite.config.ts            # Vite configuration
│   ├── vercel.json               # Vercel SPA rewrites
│   └── .env.example              # VITE_API_URL, VITE_SOCKET_URL
│
├── backend/                      # Standalone Node.js + Socket.IO Server (Deploy to Render)
│   ├── src/
│   │   ├── config/profiles.ts    # Profiles (dev: local PG, test: mock, prod: Supabase)
│   │   ├── db/                   # Schema, connection pool, PostgreSQL repositories
│   │   ├── engine/               # Authoritative game rules and turn engine
│   │   └── server.ts             # Express & Socket.IO server
│   ├── package.json              # Backend dependencies (Express, Socket.IO, pg, tsx)
│   ├── tsconfig.json             # Node.js TypeScript configuration
│   └── .env.example              # DATABASE_URL, APP_PROFILE, PORT
│
├── package.json                  # Root npm workspace runner
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Run Backend Server
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:3001` using local PostgreSQL `6cardgame`)*

### 2. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## ☁️ Deployment Guide

### A. Deploy Frontend to Vercel
1. In Vercel, import `kushalkumar12/6cardgame`.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Add Environment Variables:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://six-cards-backend.onrender.com`)
   - `VITE_SOCKET_URL`: Your Render backend URL (e.g. `https://six-cards-backend.onrender.com`)
5. Click **Deploy**.

### B. Deploy Backend to Render
1. In Render, create a new **Web Service** from `kushalkumar12/6cardgame`.
2. Set **Root Directory** to `backend`.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add Environment Variables:
   - `APP_PROFILE`: `prod`
   - `PORT`: `3001`
   - `DATABASE_URL`: Your Supabase connection string (`postgresql://postgres:[PASSWORD]@...pooler.supabase.com:6543/postgres?sslmode=require`)
   - `ALLOWED_ORIGINS`: Your Vercel frontend URL
6. Click **Deploy Web Service**.
