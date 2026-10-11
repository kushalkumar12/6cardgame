# Six Cards — Strategic Memory & Elimination Card Game

A high-stakes, responsive multiplayer card game for 2 to 6 players combining hidden-card memory, strategic replacement, special abilities (7, 8, Jack), numeric point-value matching, permanent card elimination, and career statistics.

---

## 📚 Complete Documentation Index

For complete and detailed technical references, consult the dedicated guides below:

| Documentation | Location | Contents & Purpose |
| :--- | :--- | :--- |
| **Frontend Documentation** | [frontend/README.md](frontend/README.md) | React 19 architecture, component hierarchy, visual design system, state machine, and Vercel edge deployment. |
| **Backend Documentation** | [backend/README.md](backend/README.md) | Node.js + Express + Socket.IO server, profiles (`dev`/`test`/`prod`), PostgreSQL schema, REST APIs, and WebSocket events. |
| **Game Rules & Scoring Engine** | [docs/GAME_RULES_AND_SCORING.md](docs/GAME_RULES_AND_SCORING.md) | Card point values, 7/8/Jack special powers, matching elimination rules, penalties, and victory evaluation. |
| **Cloud Architecture & Runbook** | [docs/ARCHITECTURE_AND_DEPLOYMENT.md](docs/ARCHITECTURE_AND_DEPLOYMENT.md) | Step-by-step production setup linking Vercel (Frontend), Render (WebSockets), and Supabase (PostgreSQL). |

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
│   └── README.md                 # Detailed Frontend Documentation
│
├── backend/                      # Standalone Node.js + Socket.IO Server (Deploy to Render)
│   ├── src/
│   │   ├── config/profiles.ts    # Profiles (dev: local PG, test: mock, prod: Supabase)
│   │   ├── db/                   # Schema, connection pool, PostgreSQL repositories
│   │   ├── engine/               # Authoritative game rules and turn engine
│   │   └── server.ts             # Express & Socket.IO server
│   ├── package.json              # Backend dependencies (Express, Socket.IO, pg, tsx)
│   ├── tsconfig.json             # Node.js TypeScript configuration
│   └── README.md                 # Detailed Backend Documentation
│
├── docs/                         # Specifications & Runbooks
│   ├── GAME_RULES_AND_SCORING.md # Rules & scoring reference
│   └── ARCHITECTURE_AND_DEPLOYMENT.md # Cloud deployment guide
│
├── package.json                  # Root npm workspace runner
└── README.md                     # Root project documentation
```

---

## 🚀 Quick Start (Local Development)

### 1. Run Backend Server
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:3001` with Dev profile connected to local PostgreSQL `6cardgame`)*

### 2. Run Frontend App
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173`)*

---

## ☁️ Deployment Summary

1. **Frontend**: Deploy `frontend` directory to **Vercel** with `VITE_API_URL` and `VITE_SOCKET_URL`.
2. **Backend**: Deploy `backend` directory to **Render** with `DATABASE_URL` (Supabase URI) and `APP_PROFILE=prod`.
3. **Database**: Managed on **Supabase** (PostgreSQL with SSL enabled).
