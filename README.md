# Six Cards — Strategic Memory & Elimination Card Game

A high-stakes, responsive multiplayer card game for 2 to 6 players combining hidden-card memory, strategic replacement, special abilities (7, 8, Jack), numeric point-value matching, permanent card elimination, and career statistics.

---

## 📚 Complete Documentation Index

For complete and detailed technical references, consult the dedicated guides below:

| Documentation | Location | Contents & Purpose |
| :--- | :--- | :--- |
| **Mobile Frontend Documentation** | [frontend-mobile/README.md](frontend-mobile/README.md) | Mobile-specific React 19 architecture, synthesized Web Audio sound engine, Gemini gradient active borders, mobile multiplayer rooms, avatar customization, and 100dvh viewport layout. |
| **Desktop Frontend Documentation** | [frontend/README.md](frontend/README.md) | Desktop React 19 architecture, component hierarchy, visual design system, state machine, and Vercel edge deployment. |
| **Backend Documentation** | [backend/README.md](backend/README.md) | Node.js + Express + Socket.IO server, profiles (`dev`/`test`/`prod`), PostgreSQL schema, REST APIs, and WebSocket events supporting both Desktop and Mobile frontends. |
| **Game Rules & Scoring Engine** | [docs/GAME_RULES_AND_SCORING.md](docs/GAME_RULES_AND_SCORING.md) | Card point values, 7/8/Jack special powers, matching elimination rules, penalties, and victory evaluation. |
| **Cloud Architecture & Runbook** | [docs/ARCHITECTURE_AND_DEPLOYMENT.md](docs/ARCHITECTURE_AND_DEPLOYMENT.md) | Step-by-step production setup linking Vercel (Frontends), Render (WebSockets), and Supabase (PostgreSQL). |

---

## 📁 Project Architecture

The repository is organized into standalone, decoupled applications sharing a unified backend:

```text
6CardGame/
├── frontend-mobile/              # Mobile Smartphone React + Vite SPA (Port 5180)
│   ├── src/                      # Mobile UI components, avatar system, synthesized Web Audio
│   ├── package.json              # React 19, Vite 8, Socket.IO client
│   └── README.md                 # Detailed Mobile Frontend Documentation
│
├── frontend/                     # Desktop Browser React + Vite SPA (Port 5173)
│   ├── src/                      # Desktop UI components, emerald felt tables, modals
│   ├── package.json              # React 19, Vite 8, Socket.IO client
│   └── README.md                 # Detailed Desktop Frontend Documentation
│
├── backend/                      # Unified Node.js + Socket.IO Server (Port 3001)
│   ├── src/
│   │   ├── config/profiles.ts    # Profiles (dev: local PG, test: mock, prod: Supabase)
│   │   ├── db/                   # Schema, connection pool, PostgreSQL repositories
│   │   ├── engine/               # Authoritative game rules and turn engine
│   │   └── server.ts             # Express & Socket.IO server
│   ├── package.json              # Backend dependencies (Express, Socket.IO, pg, tsx)
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

### 2. Run Mobile Frontend App
```bash
cd frontend-mobile
npm install
npm run dev
```
*(Runs on `http://localhost:5180` tailored for mobile devices and smartphone emulation)*

### 3. Run Desktop Frontend App
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:5173` for widescreen desktop monitors)*

---

## ☁️ Deployment Summary

1. **Mobile Frontend**: Deploy `frontend-mobile` to **Vercel** with `VITE_API_URL` and `VITE_SOCKET_URL`.
2. **Desktop Frontend**: Deploy `frontend` to **Vercel** with `VITE_API_URL` and `VITE_SOCKET_URL`.
3. **Backend Service**: Deploy `backend` to **Render** with `DATABASE_URL` (Supabase URI) and `APP_PROFILE=prod`.
4. **Database Tier**: Managed on **Supabase** (PostgreSQL with transaction pooler and SSL).
