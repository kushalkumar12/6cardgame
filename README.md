# Six Cards — Strategic Memory & Elimination Card Game

A high-stakes, responsive multiplayer card game for 2 to 6 players combining hidden-card memory, strategic replacement, special abilities (7, 8, Jack), numeric point-value matching, permanent card elimination, and the lowest-final-score victory rule.

---

## 🎮 Game Modes

1. **Mode 1: Play with System (AI Bot)**
   - Practice and play 1-on-1 solo vs the intelligent **System AI Bot**.
   - The AI maintains memory of its known cards and takes smart autonomous decisions (drawing, replacing, peeking with 7/8, exchanging with Jack, and eliminating matches).

2. **Mode 2: Same WiFi / Localhost LAN Multiplayer**
   - Connect multiple devices on the same WiFi network (or multiple tabs on localhost).
   - Generates a **4-letter Room Code** and displays the host's local WiFi URL (e.g. `http://10.90.142.193:5173`).
   - Each player views their own private screen on their own device with real-time WebSocket synchronization.

3. **Mode 3: Online Team & Search Players**
   - Form multiplayer teams and lobbies.
   - Search players by their unique **Player ID** (e.g. `#P-1001`) or username.
   - Send live game room invitations to friends and team members.

---

## 👤 User Profile & Social Features

- **Profile & Scoreboard**: Displays Player ID, avatar, chips balance, games played, wins, win rate %, lowest score, and zero-card wins. Global leaderboard ranking.
- **Friends System**: Search and add players by Player ID. See live online/offline presence and quick "Invite to Game" button.
- **Refer & Earn**: Unique referral codes (`REF-XXXX`). Earn +200 chips when a friend uses your code; referred player receives +100 bonus chips.
- **Authentication**: Guest / Direct Login with custom display name, plus a **Google Sign-In component ready for production deployment**.
- **About & Logout**: Complete rules overview, version credits, and quick logout/account switching.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 + TypeScript + Vite.
- **Backend / Real-Time**: Node.js + Express + Socket.IO with automatic local WiFi IP discovery.
- **Engine**: Pure TypeScript, deterministic, authoritative finite state machine with injectable RNG.
- **AI**: Intelligent memory-mapped bot (`AIBot.ts`) with strategic turn execution.
- **Styling**: Vanilla CSS design system with luxurious dark velvet casino aesthetics, glassmorphism, and gold accents.
- **Testing**: Vitest automated suite (37 unit, integration, and API tests).
- **Linter**: Oxlint.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Server (for LAN & Online Modes)
```bash
npm run server
```
The server runs on port 3001 and outputs your local WiFi network address:
```
=========================================
 Six Cards Game Server running on:
 Local:    http://localhost:3001
 LAN/WiFi: http://<your-wifi-ip>:3001
=========================================
```

### 3. Start the Vite Frontend
```bash
npm run dev
```
Open your browser at `http://localhost:5173` (or `http://<your-wifi-ip>:5173` from any phone or laptop on the same WiFi).

### 4. Run Automated Tests
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

### 6. Run Lint Check
```bash
npm run lint
```

---

## 📂 Project Structure

```
d:/JavaProjects/6CardGame/
├── RULES_AND_ASSUMPTIONS.md      # Authoritative rules & edge-case specifications
├── package.json                  # Dependencies and scripts (dev, server, test, build, lint)
├── index.html                    # HTML entry point with typography & SEO
├── server/
│   ├── server.ts                 # Express + Socket.IO multiplayer, LAN IP, auth & rooms
│   └── data.json                 # Persistent account records, stats & friends
├── src/
│   ├── types/
│   │   ├── card.ts               # Card, Rank, Suit types
│   │   ├── game.ts               # GameState, Player, Phase, ActionLog types
│   │   └── user.ts               # UserProfile, Friends, Scoreboard, Network types
│   ├── engine/
│   │   ├── deck.ts               # Deck creation (52/104/156 cards) & shuffle
│   │   ├── scoring.ts            # Exact point values & matching logic
│   │   ├── gameEngine.ts         # Authoritative pure state machine
│   │   ├── aiBot.ts              # System AI bot memory & strategic decisions
│   │   └── __tests__/
│   │       ├── gameEngine.test.ts # Core engine rules & edge-cases test suite
│   │       ├── aiBot.test.ts      # Mode 1 System AI bot test suite
│   │       ├── integrationFlow.test.ts # Complete game flow test suite
│   │       └── serverApi.test.ts  # Backend API & network test suite
│   ├── services/
│   │   └── api.ts                # REST API client & Socket.IO connector
│   ├── components/
│   │   ├── CardView.tsx          # Accessible, styled playing card component
│   │   ├── PlayerMat.tsx         # Opponent hands & active player mat
│   │   ├── Header.tsx            # Navigation, round info, user profile trigger & reset
│   │   ├── AuthModal.tsx         # Guest & Google Sign-In authentication modal
│   │   ├── ProfileModal.tsx      # Profile, Scoreboard, Friends, Refer, About & Logout
│   │   ├── ModeSelect.tsx        # Selection for System AI, Same WiFi LAN, and Online Team
│   │   ├── LobbyRoom.tsx         # Room lobby with code, player list & ready status
│   │   ├── InvitationToast.tsx   # Real-time incoming invitation popup
│   │   ├── PassDeviceModal.tsx   # Privacy handoff overlay
│   │   ├── InitialMemorizeModal.tsx # Setup 2-card reveal & memorization
│   │   ├── RevealModal.tsx       # 7 (own) & 8 (opponent) peeking modal
│   │   ├── JackExchangeModal.tsx # Blind card swap modal
│   │   ├── EliminationModal.tsx  # Multi-card matching & all-or-nothing check
│   │   ├── PenaltyModal.tsx      # Incorrect elimination penalty card display
│   │   ├── DeclareVictoryModal.tsx # Declaration confirmation
│   │   ├── GameOverModal.tsx     # Final results, all hands revealed & scores
│   │   ├── RulesModal.tsx        # In-game rules & scoring reference
│   │   └── ActionLog.tsx         # Public event history drawer
│   ├── index.css                 # Master design system & CSS tokens
│   ├── App.tsx                   # Top-level coordinator for all 3 modes & profile
│   └── main.tsx                  # React DOM mount point
```

---

## 📜 Key Gameplay Rules Summary

- **Exact Scoring**: Ace = 1, 2–9 = face value, 10 = 10, Queen = 10, King = 0, Jack = 40.
- **Matching by Numeric Points**: Suits and ranks are ignored; only point values must match (e.g., Queen matches 10; King matches King).
- **All-or-Nothing Multi-Card Elimination**: If any selected card in an elimination attempt does not match, none are eliminated and 1 penalty card is drawn into the player's hand.
- **Instant Zero-Card Victory**: If a player eliminates their last card, they win immediately without score comparison!
- **Victory Declaration**: Allowed on active turn after Round 1 completes. Lowest total points wins.
- **Draw Pile Empty**: Game ends immediately; lowest total points wins. Discard pile is never reshuffled.
- See [`RULES_AND_ASSUMPTIONS.md`](file:///d:/JavaProjects/6CardGame/RULES_AND_ASSUMPTIONS.md) for full details.
