# Six Cards — Rules & Architectural Assumptions

This document acts as the authoritative source of truth for the Six Cards gameplay rules, system assumptions, scoring algorithms, edge-case resolutions, and architectural separation.

---

## 1. Game Overview & Core Objective

**Six Cards** is a strategic hidden-card memory, card-replacement, and elimination game for 2 to 6 players. 

- Each player starts with 6 face-down cards placed in stable positions.
- The primary objective is to either:
  1. **Achieve an Instant Zero-Card Victory**: Successfully eliminate all cards in your hand; OR
  2. **Achieve Lowest Final Score**: End the game with the lowest cumulative point value when victory is declared or the draw pile is exhausted.

---

## 2. Deck & Player Configuration

Standard 52-card poker decks (ranks A through K across Hearts, Diamonds, Clubs, and Spades) are used without Jokers:

| Player Count | Number of Physical 52-Card Decks | Total Cards | Cards Dealt (6 per player) | Initial Draw Pile Size |
| :---: | :---: | :---: | :---: | :---: |
| **2 Players** | 1 Deck | 52 | 12 | 40 |
| **3 Players** | 2 Decks | 104 | 18 | 86 |
| **4 Players** | 2 Decks | 104 | 24 | 80 |
| **5 Players** | 3 Decks | 156 | 30 | 126 |
| **6 Players** | 3 Decks | 156 | 36 | 120 |

- Physical card instances are uniquely identified (`id: deckIndex-rank-suit`).
- Matching compares point values only; cards from different decks match identically.
- Turn order is clockwise round-robin: Player 1 &rarr; Player 2 &rarr; ... &rarr; Player $N$ &rarr; Player 1.

---

## 3. Exact Scoring Values

| Rank | Point Value | Notes |
| :--- | :---: | :--- |
| **King (K)** | **0** | Lowest point card |
| **Ace (A)** | **1** | |
| **2** | **2** | Numeric face value |
| **3** | **3** | Numeric face value |
| **4** | **4** | Numeric face value |
| **5** | **5** | Numeric face value |
| **6** | **6** | Numeric face value |
| **7** | **7** | Numeric face value; special ability if drawn |
| **8** | **8** | Numeric face value; special ability if drawn |
| **9** | **9** | Numeric face value |
| **10** | **10** | Matches 10 and Queen |
| **Queen (Q)** | **10** | Matches Queen and 10 |
| **Jack (J)** | **40** | High-penalty value; special ability if drawn |

*Note: No Jokers are included in the game.*

---

## 4. Initial Memorization (Pass-and-Play Setup)

1. Before Round 1 begins, each player is given a private turn on the device.
2. The player selects **exactly 2 of their 6 face-down cards**.
3. Both selected cards are revealed simultaneously to that player only.
4. The player commits their values and positions to memory.
5. Upon confirmation, both cards return to their original positions face down.
6. A privacy handoff overlay ("Pass to Next Player") ensures opponent cards remain protected during shared-device play.

---

## 5. Round Progression & Turn Flow

A round consists of every player taking exactly one full turn in clockwise order.
- Round 1 is only marked complete after the final player in round-robin order resolves their first turn.
- The round counter increments when turn control cycles back to Player 1.

### Actions Available on a Player's Turn (`TURN_START`)
On their own turn, the active player may:
1. **Draw a Card from Draw Pile**:
   - If the draw pile is empty, the game ends immediately.
   - Otherwise, reveals the drawn card privately to the active player.
   - The player chooses one of the following:
     - **Replace**: Choose an existing position in hand. The drawn card takes this spot face-down; the replaced card is moved face-up to the discard pile.
     - **Discard**: Move the drawn card directly face-up to the discard pile.
     - **Special Ability (7, 8, J)**: Execute the card's ability, then discard the special card.
2. **Replace Card with Top Discard Card**:
   - Eligible if the discard pile contains at least one card.
   - The active player takes the visible top card from the discard pile and swaps it with any card in their hand (e.g. replacing a high penalty card like Jack with a low card like 9, 2, or King).
   - The replaced card from hand is moved face-up to the discard pile and becomes the new top discard.
   - This completes the turn and control advances clockwise.
3. **Attempt Matching Elimination**:
   - Eligible if the discard pile contains at least one card.
   - Compare numeric point values against the top face-up discard card.
4. **Declare Victory**:
   - Eligible only after Round 1 has finished (i.e. `roundNumber > 1`).

---

## 6. Special Card Abilities (7, 8, Jack)

Special abilities may be activated **only when the card is drawn from the draw pile**:
- **Seven (7) — Peek Own Card**:
  - The player privately peeks at any 1 card in their own hand.
  - The card is returned face-down to its position.
  - The 7 is discarded to the discard pile.
- **Eight (8) — Peek Opponent's Card**:
  - The player privately peeks at any 1 card in any opponent's hand.
  - The opponent's card is returned face-down to its position.
  - The 8 is discarded to the discard pile.
- **Jack (J) — Blind Exchange**:
  - The player selects 1 card from their own hand and 1 card from any opponent's hand.
  - The two cards are swapped between the two players' hands **without revealing either card**.
  - Both cards remain face-down.
  - The Jack is discarded to the discard pile.
  - *Note: Retaining a Jack in hand via replacement gives 40 penalty points to that hand and does NOT trigger any exchange ability.*

---

## 7. Matching-Card Elimination & The All-or-Nothing Rule

### 7.1 Numeric Point Matching
Matching is strictly by **numeric point value**. Suits, physical deck identity, and ranks (where values match) are irrelevant.
- Example: Queen (10 pts) matches 10 (10 pts).
- Example: King (0 pts) matches King (0 pts).
- Example: 5 matches 5 across any suit.

### 7.2 Matching Target
The matching target is the latest top card in the public face-up discard pile.

### 7.3 Multi-Card All-or-Nothing Rule
A player may select multiple cards from their hand in a single elimination attempt:
- **If ALL selected cards match the target point value**:
  - All selected cards are removed permanently from the player's hand into the **Eliminated Zone**.
  - The player's hand size decreases.
  - If the player now has 0 cards, **Zero-Card Automatic Victory** triggers immediately!
- **If ANY selected card does NOT match**:
  - **None** of the selected cards are eliminated. All remain in the player's hand.
  - The player draws **1 penalty card** from the top of the draw pile and adds it to their hand face-down (increasing hand size by 1).
  - The penalty card is shown to the active player so they know its value and position.
  - If the draw pile is empty when a penalty card is needed, the game ends immediately.

### 7.4 Distinction Between Discard & Eliminated Zones
- **Discard Pile**: Cards discarded during normal turns or special abilities. Visible face-up. Top card provides matching target values.
- **Eliminated Zone**: Cards permanently removed from gameplay. They **never** enter the discard pile, hand, or draw pile, and do not count toward final scores.

---

## 8. End-Game Conditions & Scoring

### 8.1 Zero-Card Automatic Victory
If a player successfully eliminates all cards from their hand (hand size reaches 0), that player **wins immediately and unconditionally**. No final score comparison with opponents is performed.

### 8.2 Victory Declaration
- May only be triggered on a player's own turn after Round 1 is complete.
- Declaration halts all gameplay immediately: no further draws, replacements, or eliminations occur.
- Every player's remaining cards are revealed face-up.
- The **lowest total score wins**.
- The declaring player does **not** receive any score bonus or guaranteed victory; if an opponent holds a lower score, that opponent wins.

### 8.3 Draw Pile Empty
- The discard pile is **never reshuffled** into the draw pile.
- When the draw pile empties (during a regular draw or a penalty draw), the game ends immediately.
- All hands are revealed, and the player with the lowest total score wins.

### 8.4 Ties & Draws
- If two or more players share the lowest final score, the outcome is officially recorded as a **Draw** among all tied players.

---

## 9. Edge-Case Implementation Decisions

1. **Multi-Card Elimination All-or-Nothing**:
   - If any chosen card is incorrect, no cards are eliminated and exactly 1 penalty card is drawn.
2. **Jack Exchange with Shrinking Hands**:
   - Opponents whose hands have shrunk due to successful eliminations can still be selected for Jack exchanges, picking from whatever cards they currently hold (indices 0 to $k-1$).
3. **Empty Draw Pile During Penalty**:
   - If a penalty card is required but the draw pile is empty, the game terminates immediately and final scores are evaluated with existing hands.
4. **Information Privacy**:
   - Card values for face-down cards are never leaked in public action logs, tooltips, DOM attributes, or public state.
   - Local pass-the-device screen overlays protect hidden card values during local multiplayer.
5. **State Persistence**:
   - The authoritative game state is persisted to `localStorage` after each action, enabling seamless recovery across browser refreshes while providing an explicit "New Game" reset action.

---

## 10. Game Modes & Multiplayer Architecture

### 10.1 Mode 1: Play with System (AI Bot)
- **Structure**: 1 human player ("original player") vs the System AI bot.
- **AI Behavior**: The AI maintains an internal memory map of its own known cards and peeks.
- **Turn Actions**: AI evaluates whether to eliminate matching known cards, declare victory when holding <= 8 points across known cards in Round 2+, or draw. On draw, it uses 7/8/Jack abilities intelligently or replaces high cards with low ones (<= 5 points).
- **Pacing**: AI decisions include a simulated thought delay (700ms - 1000ms) with full transparent entries in the public action history log.

### 10.2 Mode 2: Same WiFi / Localhost LAN Multiplayer
- **Structure**: Real-time room-based multiplayer via Node.js + Express + Socket.IO.
- **Localhost & Same WiFi Support**: The backend server automatically discovers the host machine's local WiFi IPv4 address (e.g. `http://10.90.142.193:5173`) and provides a 4-letter Room Code (e.g. `7K2X`).
- **Privacy Enforcement**: Each player connects from their own browser tab, phone, or laptop. Opponent cards sent over the network have their rank, suit, and point values sanitized and masked so hidden values cannot be inspected in client memory or network traces.

### 10.3 Mode 3: Online Multiplayer Team & Player Search
- **Player Identification**: Each user account is assigned a unique Player ID (`#P-XXXX`).
- **Player Search**: Players can search for other users by Player ID or username and send instant friend requests or live room game invitations.
- **Team Lobby**: Host creates a party lobby, team members join, mark ready, and host starts the match.

### 10.4 User Profile, Scoreboard, Friends, Refer & Auth
- **User Profile**: Tracks display name, Player ID, avatar, chips balance, and comprehensive match statistics (Games Played, Wins, Win Rate %, Best Score, Zero-Card Wins).
- **Global Scoreboard**: Displays leaderboard rankings of top players by wins and win rate.
- **Friends System**: List of added friends with live Online/Offline status and quick "Invite to Game" button.
- **Refer & Earn**: Unique referral code generation (`REF-XXXX`), referral count tracking, and reward bonuses (+200 chips for referrer, +100 bonus chips for referred player).
- **Google Auth Integration**: Login screen includes direct sign-in and a Google OAuth-ready component configured for production deployment.

