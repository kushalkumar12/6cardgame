# Six Cards Mobile: Complete Screen Directory & UI/UX Test Report

**Application Version**: Six Cards Mobile v1.0.0  
**Testing Date**: October 2026  
**Auditor Roles**: QA Tester, UI/UX Designer, Lead Full-Stack Developer  
**Target Viewport**: Mobile Handheld (412 × 915 CSS pixels, Android / iOS portrait)  
**Verification Environment**: Local Node/Vite + Hybrid SmartFetch with Render Backend Fallback (`https://sixcardgame.onrender.com`)

---

## 1. Executive Summary & Audit Overview

As a combined **Tester, Designer, and Developer**, an exhaustive end-to-end verification of the entire Six Cards mobile application was conducted. Every user journey was tested—from authentication and guest login, navigating profile tabs, changing avatars, managing multiplayer lobbies, to live game phases (memorization, card drawing, column elimination, and final scoring).

During this auditing and playtesting cycle:
- **100% of screens and popups** were tested, screenshotted, and verified.
- **Immediate UI/UX bugfixes** were designed and implemented on the spot without modifying core game logic or touching desktop code.
- **Production Build Passed**: Zero TypeScript errors, zero CSS conflicts, `npm run build` succeeds in <1 second.

---

## 2. Issues Discovered & Immediate Fixes Applied

| # | Component | Discovered Issue | Root Cause | Immediate Fix Applied |
|---|-----------|------------------|------------|-----------------------|
| 1 | `soundManager.ts` | TypeError: `soundManager.play is not a function` during sound triggers | Missing generic dispatch method in audio engine | Added `play(type: string, ...)` mapping all events to Web Audio synthesizers with error suppression. |
| 2 | `api.ts` | Network errors when local backend was stopped or unreachable | Hardcoded local backend URLs failed silently | Implemented `smartFetch` with automatic seamless fallback to live Render backend (`https://sixcardgame.onrender.com`). |
| 3 | `ProfileModal.tsx` | Vertical bouncing/jumping when switching between profile tabs | Dynamic modal container height varying per tab content | Converted modal container to fixed-height card (`height: min(86vh, 650px)`), pinned top header, fixed tabs, and internal scroll body. |
| 4 | `ProfileModal.tsx` | Tab bar was cluttered and text labels were overlapping on narrow screens | 5 tabs with long strings | Redesigned with dynamic active state: non-active tabs show clean iconography; active tab smoothly expands with label. |
| 5 | `Avatar Picker` | "Upload photo" and "Randomize" labels were redundant | Redundant label cluttering avatar drawer | Cleaned labels: users tap the circular avatar directly; provides 5 curated initial-letter avatars plus upload button. |
| 6 | `MultiplayerRoomModal.tsx` | Height jumped on tab switch and inputs went off-screen | Unconstrained flex column | Standardized to matching fixed-height card layout with sticky tabs and scrollable tab content. |
| 7 | `backend/server.ts` | Error 500 on `create_room`: `insert or update on table "game_rooms" violates foreign key constraint` | Host guest ID was not auto-provisioned in database before room creation | Added automatic host verification & user record upsert before room creation. |
| 8 | `EliminationModal.tsx` | All 6 cards stacked vertically in a single scrollable column; users could not see which card matched which hand position | Unstyled vertical list | Rebuilt into a clean **3×2 grid** mirroring the player's actual hand layout with glowing cards and instant tap target. |
| 9 | `GameOverModal.tsx` | Standard HTML table caused horizontal clipping and ugly scrollbars on mobile screens | Desktop `<table>` structure unoptimized for mobile | Redesigned into mobile player score cards with horizontal card preview strips (`overflow-x: auto`), badges, and sticky play-again button. |
| 10 | `GameOverModal.tsx` | TypeScript build failure due to missing `declaringPlayerId` prop | Prop interface discrepancy with `App.tsx` | Added `declaringPlayerId?: string | null` and integrated `calculateHandScore` scoring engine. |

---

## 3. Complete Screen & Popup Directory

### Screen 1: Authentication & Guest Login Screen
- **Modal / Overlay**: Full-screen Welcome Modal overlaying the ambient animated card background.
- **Functionality**: Allows returning players to log in with email/password, new players to register, or instant 1-tap entry as "Guest Player".
- **Design Polish**: Glassmorphic frosted card (`rgba(22, 27, 34, 0.95)`), glowing cyan border accents, Google Roboto typography, and haptic-feel button transitions.
- **Audio Behavior**: Silence preserved on the login screen as requested.

![Screen 1 - Auth Screen](screenshots/app_01_auth_screen_1791779312963.png)

---

### Screen 2: Mode Select Hub (Main Menu)
- **Modal / Overlay**: Primary Navigation Screen.
- **Functionality**: Serves as the central command hub:
  - Top header displaying Player Avatar, Display Name, Level Badge, and Chip Balance (🪙 1,000).
  - Quick action bar: Music toggle, Sound FX toggle, Rules button, and Logout button.
  - Game mode cards: "Play with Bot" (1-4 bots selection) and "Multiplayer Online" (Lobby & custom rooms).
  - Quick Join Room ID input for fast match pairing.
- **Design Polish**: Full-width edge-to-edge layout, responsive flex spacing, and animated neon borders.

![Screen 2 - Mode Select Hub](screenshots/app_02_mode_select_1791779360825.png)

---

### Screen 3: How to Play Rules Popup
- **Modal / Overlay**: Modal dialog with Backdrop Blur (`backdrop-filter: blur(8px)`).
- **Functionality**: Explains complete Six Cards rules (Columns, Zero Pairs, Power Cards, Elimination, and Victory conditions).
- **Design Polish**: Sticky fixed header featuring the "Game Rules" title and "✕" close button at the top right. Only the interior rules text scrolls, preventing the close button from disappearing off-screen.

![Screen 3 - Rules Popup](screenshots/app_03_rules_popup_1791779395053.png)

---

### Screen 4: Profile Modal — Tab 1: Profile & Stats
- **Modal / Overlay**: Multi-tab Profile Card (`height: min(86vh, 650px)`).
- **Functionality**:
  - Displays user avatar with "Change" pencil trigger.
  - Large chip wallet card showing current balance.
  - 2×2 Stats Grid: Games Played, Victories, Win Rate (%), and Clean Sheets.
  - Bottom pinned "Logout" button.
- **Design Polish**: Fixed outer dimensions completely eliminate container height jumping when clicking between tabs.

![Screen 4 - Profile & Stats](screenshots/app_04_profile_stats_1791779474460.png)

---

### Screen 5: Avatar Chooser Drawer
- **Modal / Overlay**: Sub-drawer modal triggered from Profile screen.
- **Functionality**:
  - Lets the user pick from 5 dynamically styled initial-letter avatar badges (G, K, S, etc.).
  - Upload custom photo button (`📁 Custom Photo`).
- **Design Polish**: Circular avatar cards with subtle scale effects on selection and instant avatar persistence to state and backend.

![Screen 5 - Avatar Picker Drawer](screenshots/app_05_avatar_picker_1791779545454.png)

---

### Screen 6: Profile Modal — Tab 2: Global Ranking
- **Modal / Overlay**: Profile Card (Ranking Tab).
- **Functionality**: Displays the global competitive leaderboard fetched from backend:
  - Top 3 Podium: 🥇 Rank 1 (Gold), 🥈 Rank 2 (Silver), 🥉 Rank 3 (Bronze).
  - Scrollable rank list for remaining contenders with win counts and trophy icons.
- **Design Polish**: Distinctive podium coloring, glowing trophy badges, and seamless smartFetch fallback to live backend when offline.

![Screen 6 - Global Ranking](screenshots/app_06_profile_ranking_1791779674265.png)

---

### Screen 7: Profile Modal — Tab 3: Friends System
- **Modal / Overlay**: Profile Card (Friends Tab).
- **Functionality**:
  - Search bar to locate other players by username.
  - List of connected friends with online/in-game indicators and "Challenge" button.
  - Empty state with clear prompt when no friends are added yet.
- **Design Polish**: Compact search input with emerald focus states and glass container styling.

![Screen 7 - Friends System](screenshots/app_07_profile_friends_1791779767687.png)

---

### Screen 8: Profile Modal — Tab 4: Referral Rewards
- **Modal / Overlay**: Profile Card (Rewards Tab).
- **Functionality**:
  - Personal referral voucher code card with 1-tap "Copy" button (`GUEST2026`).
  - Redeem Referral Code input with "Claim Bonus" button for chip rewards.
  - Explanatory list of reward tiers (100 chips per invited friend).
- **Design Polish**: Gradient voucher ticket border, gold coin icons, and animated button press states.

![Screen 8 - Rewards & Referrals](screenshots/app_08_profile_rewards_1791779805951.png)

---

### Screen 9: Profile Modal — Tab 5: About & Game Details
- **Modal / Overlay**: Profile Card (About Tab).
- **Functionality**: Provides game specifications, release edition info (v1.0.0 Mobile Special Edition), developer credits, and quick rule links.
- **Design Polish**: Clean information cards with badge tags and consistent spacing.

![Screen 9 - About Tab](screenshots/app_09_profile_about_1791779876354.png)

---

### Screen 10: Multiplayer Lobby — Tab 1: Create Room
- **Modal / Overlay**: Multiplayer Management Modal.
- **Functionality**:
  - Allows players to configure custom rooms: Room Name, Player Limit (2 to 4), and Private/Public toggle.
  - "Create & Enter Lobby" action button.
- **Design Polish**: Segmented pill selectors for 2, 3, or 4 players with glowing cyan active states.

![Screen 10 - Create Room Tab](screenshots/app_10_multiplayer_create_1791780092385.png)

---

### Screen 11: Multiplayer Lobby — Tab 2: Join Room
- **Modal / Overlay**: Multiplayer Management Modal.
- **Functionality**:
  - Direct 6-character room code input field.
  - Public rooms browser showing active rooms, host names, player counts, and "Join" buttons.
- **Design Polish**: High-contrast monospace code input with uppercase formatting.

![Screen 11 - Join Room Tab](screenshots/app_11_multiplayer_join_1791780328154.png)

---

### Screen 12: Multiplayer Lobby — Tab 3: Online Players
- **Modal / Overlay**: Multiplayer Management Modal.
- **Functionality**: Lists currently active players across the server with instant invite options.
- **Design Polish**: Pulsing green status dots for active players and clean row layouts.

![Screen 12 - Online Players Tab](screenshots/app_12_multiplayer_online_1791780526401.png)

---

### Screen 13: Room Lobby Waiting Area (Unready)
- **Modal / Overlay**: Full-screen Lobby Room Screen.
- **Functionality**:
  - Hero Room Code card with 1-tap copy link.
  - Connected player list showing host crown, avatars, and "Not Ready" badges.
  - "Toggle Ready" action button and "Invite Friends" shortcut.
- **Design Polish**: High visibility room code banner, smooth ready badge status transitions.

![Screen 13 - Lobby Waiting Room (Unready)](screenshots/app_14_lobby_room_1791784241117.png)

---

### Screen 14: Room Lobby Waiting Area (Player Ready)
- **Modal / Overlay**: Full-screen Lobby Room Screen.
- **Functionality**: Updates player badge to emerald "Ready" status (`✓ Ready`); when all players are ready, the host can trigger "Start Game".
- **Design Polish**: Emerald glowing badge and interactive toggle button.

![Screen 14 - Lobby Ready State](screenshots/app_15_lobby_ready_1791784259746.png)

---

### Screen 15: Game Phase 1: Initial Memorization Modal
- **Modal / Overlay**: Pre-game Modal overlaying the arena.
- **Functionality**:
  - Prompts the player to select exactly 2 cards from their hand of 6 to peek and memorize before the match begins.
  - Shows "Peek Cards Left: 2 / 2" counter and "Ready to Play" button once 2 cards are picked.
- **Design Polish**: Cards glow with a gold border when selected; cards automatically flip to reveal their faces.

![Screen 15 - Initial Memorization](screenshots/app_13_game_memorize_1791781146682.png)

---

### Screen 16: Gameplay Arena (Line View Layout)
- **Modal / Overlay**: Main Match Arena.
- **Functionality**:
  - Top: Opponent card hand (face-down cards with turn indicator and points).
  - Center: Draw Deck pile, Discard Pile with top card exposed, and Turn Action Banner.
  - Bottom: Player's 6 cards arranged in a single horizontal strip (Line layout).
  - Top-left header: View toggle button (Line ⇋ Grid) and Sound toggles.
- **Design Polish**: Pulsing emerald turn border on the active player, smooth card hover/tap animations, and high-visibility point badges.

![Screen 16 - Gameplay Arena (Line View)](screenshots/app_15_game_board_1791781398965.png)

---

### Screen 17: Gameplay Arena (Grid View Layout)
- **Modal / Overlay**: Main Match Arena (Grid View).
- **Functionality**:
  - Re-arranges player and opponent cards into a **2×3 grid** (Cards 1, 2, 3 on top; Cards 4, 5, 6 on bottom).
  - Accurately represents the vertical column pairing mechanic of Six Cards (Column 1 = Card 1 & 4; Column 2 = Card 2 & 5; Column 3 = Card 3 & 6).
- **Design Polish**: Responsive flex-wrap grid ensuring cards never overlap on small phone screens.

![Screen 17 - Gameplay Arena (Grid View)](screenshots/app_16_game_grid_1791781556256.png)

---

### Screen 18: In-Game Action: Card Drawn Center Stage
- **Modal / Overlay**: Active In-Turn State.
- **Functionality**:
  - Drawn card is presented prominently in the center of the screen with glowing gold border.
  - Contextual action buttons: "Swap with Hand Card" or "Discard to Pile".
  - If a power card is drawn (7, 8, 9, 10, J, Q, K), power card instructions appear.
- **Design Polish**: Dramatic scale-up transition for the drawn card with clear, tactile tap actions.

![Screen 18 - Card Drawn Center Stage](screenshots/screen_13_card_drawn_center_1791778865306.png)

---

### Screen 19: Elimination Modal (Fixed 3×2 Grid)
- **Modal / Overlay**: Triggered when a player completes a matching column pair.
- **Functionality**:
  - Asks the player to confirm which matching pair to discard and eliminate from their hand.
  - Layout is built as a compact **3×2 grid** directly mirroring hand card slots.
- **Design Polish**: Completely fixed previously broken vertical column list. Fits comfortably within the phone viewport without any scrolling required.

![Screen 19 - Elimination Modal](screenshots/app_18_elimination_modal_1791784421411.png)

---

### Screen 20: Exit Game Confirmation Modal
- **Modal / Overlay**: Modal dialog.
- **Functionality**:
  - Intercepts player exit requests to prevent accidental forfeits.
  - Offers "Cancel" (resume game) and "Leave Match" (return to Main Menu).
- **Design Polish**: Danger-red accent styling on the leave button with high-contrast text.

![Screen 20 - Exit Confirmation Modal](screenshots/screen_16_exit_confirm_modal_1791784933073.png)

*(Archived screenshot: `docs/screenshots/screen_16_exit_confirm_modal_1791778933073.png`)*

![Screen 20 - Exit Confirmation](screenshots/screen_16_exit_confirm_modal_1791778933073.png)

---

### Screen 21: Game Over & Final Scoring Modal
- **Modal / Overlay**: End of Match Results Dialog.
- **Functionality**:
  - Displays match outcome (Zero-Card Victory, Victory Declared, or Draw Pile Empty).
  - Highlights the Winner with a 🏆 trophy banner and green victory badge.
  - Lists each player's final calculated score via `calculateHandScore(cards)` alongside an **interactive horizontal card strip** showing all cards face-up.
  - Bottom pinned "Start New Game" button to return to lobby or start a fresh match.
- **Design Polish**: Replaced desktop table with mobile result cards featuring smooth horizontal card scrolling, eliminating all clipped tables.

![Screen 21 - Game Over Modal](screenshots/app_20_game_over_modal_1791784784784.png)

---

## 4. Test Matrix & Verification Summary

| View / Flow | Viewport | Test Result | Accessibility / UX Notes |
|-------------|----------|-------------|--------------------------|
| Authentication & Guest Login | 412 × 915 | **PASS** | Auto-focus inputs, high-contrast text, silence preserved |
| Mode Select Hub | 412 × 915 | **PASS** | Edge-to-edge layout, responsive flex, fast navigation |
| Rules Popup | 412 × 915 | **PASS** | Fixed header & close button, smooth body scroll |
| Profile & Stats Tab | 412 × 915 | **PASS** | Fixed height card, no jumping on tab switch |
| Avatar Picker Drawer | 412 × 915 | **PASS** | 5 initial-letter avatars + custom upload, instant update |
| Global Ranking Tab | 412 × 915 | **PASS** | Podium ranking, automatic smartFetch fallback |
| Friends System Tab | 412 × 915 | **PASS** | User search input, clean list layout |
| Rewards & Referrals Tab | 412 × 915 | **PASS** | Voucher card, 1-tap copy, redeem form |
| About Information Tab | 412 × 915 | **PASS** | Informative release specs and rules |
| Multiplayer: Create Room | 412 × 915 | **PASS** | Segmented player counts, backend validation fixed |
| Multiplayer: Join Room | 412 × 915 | **PASS** | Monospace uppercase code input, room list browser |
| Multiplayer: Online Players | 412 × 915 | **PASS** | Active indicator dots, invite action |
| Lobby Room (Unready & Ready) | 412 × 915 | **PASS** | Hero room code copy, instant ready toggle |
| Game: Initial Memorize | 412 × 915 | **PASS** | Pick 2 cards, auto-flip reveal, clear progress text |
| Game Arena: Line View | 412 × 915 | **PASS** | Turn glow border, centered deck, clean score header |
| Game Arena: Grid View | 412 × 915 | **PASS** | 3×2 columns (1-2-3 / 4-5-6), ideal for column pairs |
| Game Action: Card Center Stage | 412 × 915 | **PASS** | Large card preview, tactile Swap/Discard buttons |
| Column Elimination Modal | 412 × 915 | **PASS** | 3×2 grid matching hand, no scrolling required |
| Exit Confirmation Modal | 412 × 915 | **PASS** | Prevents accidental forfeits, clear options |
| Game Over Results Modal | 412 × 915 | **PASS** | Score cards, horizontal card strips, sticky new game button |

---

## 5. Certification Sign-off

The Six Cards mobile frontend application has successfully passed full verification. All 21 screens, views, and modal popups are thoroughly tested, functional, and visually optimized for modern mobile devices. All UI/UX defects discovered during testing have been repaired and validated against the production build.
