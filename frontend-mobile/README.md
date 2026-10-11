# Six Cards — Frontend Application Documentation

This document covers the architecture, component hierarchy, state management, styling guidelines, and deployment procedures for the **Six Cards Frontend** single-page application (SPA).

---

## 1. Technology Stack

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Dev Server**: [Vite 8](https://vitejs.dev/)
- **Real-Time Client**: [Socket.IO Client v4.8](https://socket.io/)
- **Styling**: Vanilla CSS (Custom design system featuring luxury emerald poker tables, gold foil highlights, dark glassmorphism, and responsive micro-animations).
- **Deployment**: [Vercel](https://vercel.com/) (configured via `vercel.json` SPA rewrites).

---

## 2. Directory Structure

```text
frontend/
├── public/                       # Static public assets
│   ├── favicon.svg               # Browser icon
│   └── logo.png                  # High-resolution game logo
│
├── src/
│   ├── assets/                   # Bundled graphics (logo, card emblems)
│   ├── components/               # Reusable visual UI components
│   │   ├── ActionLog.tsx         # Live turn log and action announcements
│   │   ├── AuthModal.tsx         # Guest login, display name, and Google OAuth setup
│   │   ├── CardView.tsx          # Card rendering (face up, face down, suits, ranks)
│   │   ├── DeclareVictoryModal.ts# Confirmation dialog for victory declaration
│   │   ├── EliminationModal.tsx  # Multi-select card elimination modal
│   │   ├── FriendRequestToast.tsx# Live toast for incoming friend requests
│   │   ├── GameOverModal.tsx     # Final scoreboard, card revelations, winner reveal
│   │   ├── Header.tsx            # Navbar, logo, chip balance, and profile trigger
│   │   ├── InitialMemorizeModal.t# Phase 1: Two-card initial peek modal
│   │   ├── InvitationToast.tsx   # Live toast for incoming room invitations
│   │   ├── JackExchangeModal.tsx # Jack card blind swap interface
│   │   ├── LobbyRoom.tsx         # Multiplayer lobby, room codes, readiness, quick add friend
│   │   ├── ModeSelect.tsx        # Selection cards for Mode 1 (AI), Mode 2 (Multiplayer), Mode 3 (Pass & Play)
│   │   ├── PassDeviceModal.tsx   # Device privacy screen for Pass & Play mode
│   │   ├── PenaltyModal.tsx      # Wrong elimination penalty card display
│   │   ├── PlayerMat.tsx         # Player 6-card grid layout with card indices
│   │   ├── ProfileModal.tsx      # Career stats, scoreboard, friends list, referral codes
│   │   ├── RevealModal.tsx       # 7 & 8 card peek modal
│   │   └── RulesModal.tsx        # Interactive in-game rules modal
│   │
│   ├── engine/                   # Client-side card state machine (for Solo & Pass & Play)
│   │   ├── aiBot.ts              # Intelligent single-player AI decision agent
│   │   ├── deck.ts               # 52-card deck generator and Fisher-Yates shuffler
│   │   ├── gameEngine.ts         # Authoritative client rules engine
│   │   └── scoring.ts            # Point calculation helpers
│   │
│   ├── services/
│   │   └── api.ts                # REST API calls and Socket.IO connection manager
│   │
│   ├── types/                    # Shared TypeScript interfaces (Card, GameState, User)
│   ├── App.tsx                   # Main root application orchestrator
│   ├── index.css                 # Comprehensive design system, utilities, and animations
│   └── main.tsx                  # React DOM root render
│
├── .env.example                  # Environment variable reference
├── index.html                    # Single Page Application HTML shell
├── package.json                  # Frontend-only dependencies
├── tsconfig.json                 # Project TypeScript configuration
├── vercel.json                   # Vercel deployment and routing rules
└── vite.config.ts                # Vite plugin and server configuration
```

---

## 3. Key Components & Responsibilities

### A. Core Screens
1. **[App.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/App.tsx)**:
   - Manages active user authentication session (stored in `sessionStorage` and `localStorage`).
   - Maintains WebSocket listeners (`received_invitation`, `received_friend_request`, `room_updated`, `room_state_update`).
   - Automatically switches views between Mode Selection (`SETUP`), Room Lobby (`activeRoom`), and Active Game Arena (`game-table`).
2. **[ModeSelect.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/components/ModeSelect.tsx)**:
   - **Mode 1**: Play with System (AI Bot).
   - **Mode 2**: Multiplayer (Private Room Codes, Friends, & Matchmaking).
   - **Mode 3**: Classic Pass-and-Play (Single device, 2 to 6 players).
3. **[LobbyRoom.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/components/LobbyRoom.tsx)**:
   - Displays 4-letter Room Code (`ABCD`) with 1-click copy.
   - Shows active room participants, host badge, ready toggles, and **"+ Friend"** quick-add buttons.
   - Allows manual Player ID/username invitations plus 1-click invites for online players.

### B. Modals & Notifications
1. **[ProfileModal.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/components/ProfileModal.tsx)**:
   - **Tab 1: Profile & Stats** — Games played, victories, win rate %, lowest score, zero-card wins, and chips balance.
   - **Tab 2: Scoreboard** — Global leaderboard with rank, avatar, and chips.
   - **Tab 3: Friends** — Real-time friends list, online indicator, search by Player ID/username, and manual refresh button.
   - **Tab 4: Refer & Earn** — Shareable referral code (`REF-XXXX`) with +200 / +100 bonus chips mechanism.
2. **[FriendRequestToast.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/components/FriendRequestToast.tsx)**:
   - Floating notification when another online player sends a friend request.
   - Clicking **"Accept Friend"** connects both players bidirectionally in the PostgreSQL database.
3. **[InvitationToast.tsx](file:///d:/JavaProjects/6CardGame/frontend/src/components/InvitationToast.tsx)**:
   - Floating notification when another player invites you to a multiplayer room.
   - Clicking **"Accept & Join"** joins the room and automatically adds each other as friends.

---

## 4. Environment Variables

The frontend connects to the backend through profile-aware environment variables defined in `.env.example`:

| Variable | Description | Example (Local) | Example (Production) |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base HTTP endpoint for REST requests | `http://localhost:3001` | `https://six-cards-backend.onrender.com` |
| `VITE_SOCKET_URL`| WebSocket endpoint for Socket.IO | `http://localhost:3001` | `https://six-cards-backend.onrender.com` |

---

## 5. Local Development & Production Build

### Running the Frontend Locally:
```bash
cd frontend
npm install
npm run dev
```
*(Runs Vite dev server on `http://localhost:5173` with instant HMR)*

### Validating the Production Build:
```bash
npm run build
```
*(Runs TypeScript validation `tsc -b` and bundles assets into the `dist/` directory)*

---

## 6. Vercel Deployment Step-by-Step

1. Log in to [Vercel](https://vercel.com/) and click **"Add New..."** → **"Project"**.
2. Select the repository: `kushalkumar12/6cardgame`.
3. In **Project Configuration**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite` (detected automatically)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your backend URL (e.g. `https://six-cards-backend.onrender.com`)
   - `VITE_SOCKET_URL`: Your backend URL (e.g. `https://six-cards-backend.onrender.com`)
5. Click **Deploy**. Vercel will build and publish your frontend to a global edge domain.
