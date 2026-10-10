# Six Cards — Project Progress & Handoff Summary
**Date Saved**: 2026-10-10  
**Current Branch**: `master`  
**Workspace**: `d:\JavaProjects\6CardGame`

---

## 1. Project Status Overview
The **Six Cards** multiplayer web application is in a stable, verified, and fully tested state. All core features requested across all iterations have been implemented, architecturally separated, and backed by automated tests.

---

## 2. Completed Features & Architecture

### A. Authoritative Game Engine (`src/engine/gameEngine.ts`)
- **Deck & Configuration**: 52-card decks dynamically calculated based on player count (2 to 6 players, no jokers).
- **Exact Scoring**: King = 0, Ace = 1, 2–10 = numeric values, Queen = 10, Jack = 40.
- **Initial Memorization**: Each player selects and memorizes exactly 2 of their 6 face-down cards before Round 1.
- **Actions at `TURN_START`**:
  1. `🎴 Draw Card`: Draws from the Draw Pile.
  2. `🔄 Replace the Card`: Directly replaces a card in hand with the top card from the Discard Pile.
  3. `⚡ Match & Eliminate`: All-or-nothing numeric point matching against top discard. Multi-card elimination and penalty card handling.
  4. `🏆 Declare Victory`: Eligible after Round 1; compares cumulative scores to determine lowest-score winner.
- **Special Card Abilities**:
  - **7**: Peek any one card in own hand.
  - **8**: Peek any one card in opponent's hand.
  - **Jack**: Blind exchange between 1 own card and 1 opponent card.
- **End-Game Conditions**:
  - Zero-Card Automatic Victory (hand size = 0).
  - Victory Declaration (lowest score wins).
  - Empty Draw Pile (lowest score wins).

### B. Intelligent System AI Bot (`src/engine/aiBot.ts`)
- Implements Mode 1 ("Play with System AI").
- Maintains a memory map of its known cards.
- Strategically chooses memorization, matching eliminations, discard replacements, and special ability usage.

### C. Backend Server & Multiplayer (`server/server.ts`)
- **Express + Socket.IO** running on port 3001 (accessible via `localhost:3001` and local WiFi IP e.g. `10.90.142.193:3001`).
- **Database**: Local JSON database in `server/data.json` storing user profiles, stats, referral codes, and friends.
- **Multi-Socket Tracking**: Robust `Map<string, Set<string>>` supporting multiple tabs and devices per user.
- **Fuzzy Player Matching**: Handles exact IDs (`P-1002`), formatted IDs (`#P-1002`), numeric-only (`1002`), and usernames for invites.
- **Online Presence**: Broadcasts real-time online player updates.
- **State Sanitization**: Hides opponents' private cards across the network.

### D. User Interface & Pro UI/UX Design (`src/`)
- Responsive casino-table aesthetic with dark emerald hues and gold accents.
- Responsive card layouts (6-in-a-row on desktop, 2x3 grid on mobile screens).
- User Profile modal with Scoreboard, Friends list, Refer & Earn, About, and Logout.
- Mode selection screen (AI Bot, Same WiFi LAN, Online Team with Room Codes).
- Lobby room with 1-click invite for active online players and 1-click room code copying.

---

## 3. Test Coverage & Quality Assurance
- **Total Vitest Tests Passing**: **41 Tests** across 6 test suites:
  1. `gameEngine.test.ts` (26 tests)
  2. `aiBot.test.ts` (9 tests)
  3. `serverApi.test.ts` (3 tests)
  4. `integrationFlow.test.ts` (2 tests)
  5. `invitationFlow.test.ts` (1 test)
  6. `fullMatchPlaythrough.test.ts` (1 test)
- **Production Build**: `npm run build` succeeds with 0 TypeScript errors.
- **Linter**: `oxlint` reports 0 warnings and 0 errors across all 35 files.

---

## 4. Current Work & Where We Stopped
- **Test Plan Created**: Documented in `C:\Users\kusha\.gemini\antigravity-ide\brain\fedc2e31-b58f-4f74-b8a1-5d15dc9b0de0\full_game_test_plan.md`.
- **Simulation Test Added**: Added `src/engine/__tests__/fullMatchPlaythrough.test.ts` which plays through an entire multi-round match against the AI, logs each turn, and validates human victory.
- **Browser Playthrough**: Tested interactive browser play through multiple rounds (drawing, replacing cards, peeking with 7, discard replacements).

---

## 5. How to Resume Tomorrow

### Quick Start Commands:
```bash
# 1. Start backend server (Terminal 1)
npx tsx server/server.ts

# 2. Start Vite dev server (Terminal 2)
npx vite

# 3. Run all tests to verify green status
npm test
```

### URLs:
- **Local Web App**: `http://localhost:5173`
- **LAN WiFi URL**: `http://10.90.142.193:5173` (for testing mobile/other devices on same WiFi)
- **Backend API**: `http://localhost:3001`
