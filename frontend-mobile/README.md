# Six Cards — Mobile Frontend Application (`frontend-mobile`)

This document provides comprehensive documentation for the **Six Cards Mobile Frontend**, engineered specifically for mobile device viewports (smartphones and handheld browsers) with a luxury dark sapphire casino aesthetic, zero-latency Web Audio sound engine, and full real-time multiplayer capabilities.

> 📸 **Visual Test Documentation**: For screenshots of every single screen, modal, and popup alongside UX bugfix logs, refer to [Mobile App Screens & Test Report](../docs/MOBILE_APP_SCREENS_AND_TEST_REPORT.md).

---

## 1. Technology Stack

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Bundler**: [Vite 8](https://vitejs.dev/)
- **Real-Time Client**: [Socket.IO Client v4.8](https://socket.io/)
- **Audio Engine**: Custom synthesized Web Audio API sound engine (Velvet Lo-Fi jazz lounge BGM, haptic click SFX, felt card slides, elimination bells, and victory fanfares — zero external asset downloads).
- **Styling**: Vanilla CSS (Tailored mobile design tokens, Gemini-inspired active turn gradient animated borders, glassmorphism, fluid flexbox/grid layout, and zero desktop horizontal scrolling).
- **Target Viewport**: Mobile phones (optimal viewports 360px – 430px wide, 100dvh full bleed).

---

## 2. Directory Structure

```text
frontend-mobile/
├── public/                       # Static public assets (logo, favicons)
├── src/
│   ├── assets/                   # Bundled graphics
│   ├── components/               # Mobile UI Components
│   │   ├── ActionLog.tsx         # Live turn log and action announcements
│   │   ├── AuthModal.tsx         # Mobile Welcome screen with Google & Guest login
│   │   ├── Avatar.tsx            # Real vector initial & image profile avatar renderer
│   │   ├── BottomBar.tsx         # Mobile bottom bar (Music toggle, SFX toggle, Exit button)
│   │   ├── CardView.tsx          # Uniform ratio card component (face-up, face-down, ranks, suits)
│   │   ├── DeclareVictoryModal.ts# Victory declaration confirmation modal
│   │   ├── EliminationModal.tsx  # Multi-card matching elimination dialog
│   │   ├── FriendRequestToast.tsx# Floating real-time friend request toast notification
│   │   ├── GameOverModal.tsx     # Final match results, card reveal, and winner podium
│   │   ├── Header.tsx            # Sticky mobile header (Logo, Rules 6-dot button, Avatar)
│   │   ├── Icons.tsx             # Custom SVG game icons (cards, bots, multiplayer masks, etc.)
│   │   ├── InitialMemorizeModal.t# Phase 1: Two-card initial memorization modal
│   │   ├── InvitationToast.tsx   # Live room invitation toast notification
│   │   ├── JackExchangeModal.tsx # Jack blind card swap selection interface
│   │   ├── LobbyRoom.tsx         # Mobile multiplayer lobby (Room code card, player slots, readiness)
│   │   ├── ModeSelect.tsx        # Mode 1: Play with Bot / Mode 2: Multiplayer Online
│   │   ├── MultiplayerRoomModal.t# Dedicated mobile modal: Create Room, Join with Code, Online Players
│   │   ├── PassDeviceModal.tsx   # Privacy transition screen for Pass & Play
│   │   ├── PenaltyModal.tsx      # Wrong elimination penalty card display
│   │   ├── PlayerMat.tsx         # Player 6-card hand with dynamic Line (1x6) vs Grid (2x3) layout
│   │   ├── ProfileModal.tsx      # Profile, Global Scoreboard, Friends, Refer & Earn, and About
│   │   ├── RevealModal.tsx       # 7 & 8 card peek reveal dialog
│   │   └── RulesModal.tsx        # Mobile rules modal with fixed header & scrollable content
│   │
│   ├── engine/                   # Client-side card state machine (Solo AI & Pass & Play)
│   │   ├── aiBot.ts              # Single-player bot decision engine
│   │   ├── deck.ts               # Standard 52-card deck generator and shuffler
│   │   ├── gameEngine.ts         # Authoritative local rules and turn transition engine
│   │   └── scoring.ts            # Scoring and point calculation helpers
│   │
│   ├── services/
│   │   ├── api.ts                # REST API client and Socket.IO connection manager
│   │   ├── logger.ts             # Debugging logger
│   │   └── soundManager.ts       # Zero-latency Web Audio API synthesizer engine
│   │
│   ├── types/                    # Shared TypeScript interfaces (Game, User, Cards)
│   ├── App.tsx                   # Main root application orchestrator for mobile
│   ├── index.css                 # Comprehensive mobile design system and animations
│   └── main.tsx                  # React DOM entry point
```

---

## 3. Core Features & Mobile UX Innovations

### A. Multiplayer & Rooms
1. **Multiplayer Selection Modal (`MultiplayerRoomModal.tsx`)**:
   - **Create Room**: Configure Max Players (2, 3, 4, or 6 players) and Game Mode (Team Battle vs Casual), then opens the lobby instantly.
   - **Join Room**: Enter a 4-to-6 character Room Code (auto-capitalized) with 1-tap clipboard paste.
   - **Live Online Players**: Real-time counter and listing of online players connected to the server.
2. **Multiplayer Lobby Screen (`LobbyRoom.tsx`)**:
   - **Room Code Hero Card**: High-contrast, glowing Room Code with 1-tap "Copy" button.
   - **Player Slots**: Real avatar rendering, Host crown 👑 badge, readiness indicator (`✓ Ready` vs `⏳ Waiting`), and `+ Friend` button.
   - **Host & Player Controls**: Prominent "I am Ready!" toggle and "Start Match Now!" button for host (enabled when 2+ players are ready).
   - **Invitations**: Search by Player ID/name and 1-tap quick invite from the online player list.

### B. Profile, Avatar Customization & Social Features
1. **Avatar Customization (`ProfileModal.tsx`)**:
   - Tapping the avatar circle opens the **Choose Profile Avatar** drawer:
     - **Upload Photo**: Upload custom photo from device gallery/camera.
     - **5 Initial-Based Themes**: 5 vector gradient avatars featuring the player's initial letter (*Amber Gold*, *Sapphire Blue*, *Emerald Jade*, *Crimson Ruby*, and *Amethyst Purple*).
2. **Dynamic Menu Bar**:
   - Only the **active tab** expands to show its icon and text label.
   - Unselected tabs collapse into sleek compact icons, perfectly fitting mobile viewports without horizontal scrollbar overflow.
3. **Global Scoreboard & Ranking**:
   - Global leaderboard with Gold 🥇, Silver 🥈, and Bronze 🥉 medals for top 3 players.
   - Shows Wins, Win Rate %, Games Played, and Chips Balance with user row highlighted.
4. **Friends & Player Search**:
   - Real-time friends list with emerald pulse `● Online` / `○ Offline` status badges.
   - Instant search by Player ID or Username with "+ Add Friend" capability.
   - "✉️ Invite" button to bring online friends directly into your game lobby.
5. **Refer & Earn**:
   - Unique referral code with 1-tap copy.
   - Earn +200 bonus chips per referral, and newly invited friends receive +100 bonus chips upon redemption.

### C. In-Game Mobile Arena
1. **Gemini Gradient Border**:
   - Active player turn is highlighted by an animated, shifting cosmic gradient border.
2. **Dynamic Hand Layout (Line vs Grid)**:
   - "Line" mode displays all 6 cards side by side (1×6).
   - "Grid" mode wraps cards into 2 rows of 3 (2×3).
   - Contraction and expansion animate smoothly.
3. **Center Field Alignment**:
   - Discard pile card count and draw pile "In Hand" label aligned symmetrically.
   - Uniform medium card ratio across discard, draw, and dealt piles.
4. **Multiplayer Opponent Strip**:
   - Horizontal scrollable strip for 2 to 5 opponents in multiplayer games, keeping individual hands accessible without vertical layout distortion.
5. **Turn Announcement Banner**:
   - Real-time turn announcement showing active player and context-sensitive instructions (e.g. Draw, Swap with Discard, Swap with Hand, Eliminate, Declare).

---

## 4. Running and Testing Locally

```bash
# Navigate to mobile frontend
cd frontend-mobile

# Install dependencies
npm install

# Start development server
npm run dev
# Running on http://localhost:5180
```

To run a production verification build:
```bash
npm run build
```
Build verifies backend reachability, compiles TypeScript with zero errors, and bundles assets with Vite.
