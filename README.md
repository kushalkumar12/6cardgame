# Six Cards — Strategic Memory & Elimination Card Game

A high-stakes, responsive multiplayer card game for 2 to 6 players combining hidden-card memory, strategic replacement, special abilities (7, 8, Jack), numeric point-value matching, permanent card elimination, and the lowest-final-score victory rule.

---

## 🛠️ Tech Stack & Architecture

- **Engine**: Pure TypeScript, deterministic, fully isolated state machine with injectable RNG.
- **Frontend**: React 19 + TypeScript + Vite.
- **Styling**: Vanilla CSS design system with luxurious dark casino aesthetics, glassmorphism, gold accents, and responsive layout.
- **Testing**: Vitest automated unit and rule verification suite.
- **Linter**: Oxlint.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser at the displayed local URL (default: `http://localhost:5173`).

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```

### 5. Run Lint Check
```bash
npm run lint
```

---

## 📂 Project Structure

```
d:/JavaProjects/6CardGame/
├── RULES_AND_ASSUMPTIONS.md      # Authoritative rules, interpretations & edge-cases
├── package.json                  # Dependencies and scripts (test, build, lint, dev)
├── index.html                    # HTML entry point with typography & SEO
├── src/
│   ├── types/
│   │   ├── card.ts               # Card, Rank, Suit types
│   │   └── game.ts               # GameState, Player, Phase, ActionLog types
│   ├── engine/
│   │   ├── deck.ts               # Deck creation (52/104/156 cards) & shuffle
│   │   ├── scoring.ts            # Exact point values & matching logic
│   │   ├── gameEngine.ts         # Authoritative pure state machine
│   │   └── __tests__/
│   │       └── gameEngine.test.ts # Vitest suite covering all required rules
│   ├── components/
│   │   ├── CardView.tsx          # Accessible, styled playing card component
│   │   ├── PlayerMat.tsx         # Opponent hands & active player mat
│   │   ├── Header.tsx            # Navigation, round info, rules & reset
│   │   ├── ActionLog.tsx         # Public event history drawer
│   │   ├── PassDeviceModal.tsx   # Privacy handoff overlay
│   │   ├── InitialMemorizeModal.tsx # Setup 2-card reveal & memorization
│   │   ├── RevealModal.tsx       # 7 (own) & 8 (opponent) peeking modal
│   │   ├── JackExchangeModal.tsx # Blind card swap modal
│   │   ├── EliminationModal.tsx  # Multi-card matching & all-or-nothing check
│   │   ├── PenaltyModal.tsx      # Incorrect elimination penalty card display
│   │   ├── DeclareVictoryModal.tsx # Declaration confirmation
│   │   ├── GameOverModal.tsx     # Final results, all hands revealed & scores
│   │   └── RulesModal.tsx        # In-game rules & scoring reference
│   ├── index.css                 # Master design system & CSS tokens
│   ├── App.tsx                   # Top-level coordinator with localStorage sync
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
