# 🎴 Six Cards — Official Game Rules, Mechanics & System Conditions

This document is the **true and comprehensive reference** of the game rules, card point values, deck scaling, turn phases, special powers, player privacy conditions, and victory criteria **as they exist in the Six Cards application today**.

---

## 1. Game Objective

The goal of **Six Cards** is to finish the match with the **lowest total hand point score**, or achieve an **instant zero-card automatic victory** by eliminating all cards in your hand.

---

## 2. Deck Composition & Player Scaling

* **Cards Used**: Standard 52-card decks (no Jokers) with 4 suits: ♠️ Spades, ♥️ Hearts, ♦️ Diamonds, ♣️ Clubs.
* **Deck Scaling by Player Count** *(from `deck.ts`)*:
  * **2 Players**: **1 Deck** (52 cards)
  * **3 to 4 Players**: **2 Decks** (104 cards)
  * **5 to 6 Players**: **3 Decks** (156 cards)
* **Dealing**: Each player is dealt **6 cards face down** in a fixed 2×3 grid layout (Positions 1 through 6).
* **The Center Table**:
  * **Draw Pile**: Placed face down in the center.
  * **Discard Pile**: Starts with 1 card turned face up from the draw pile.

---

## 3. Exact Card Point Values

Scoring is strictly based on the active game engine implementation (`scoring.ts`):

| Rank / Card | Point Value | Notes |
| :--- | :---: | :--- |
| **King (K)** | **0 pts** | 🏆 **Best card in the game!** Zero points (all suits: ♥️ ♦️ ♠️ ♣️). |
| **Ace (A)** | **1 pt** | Ultra-low point value. |
| **2 to 9** | **2 to 9 pts** | Exact face value (e.g. a `7` is 7 pts, an `8` is 8 pts). |
| **10** | **10 pts** | Standard high card. |
| **Queen (Q)** | **10 pts** | Worth 10 pts (matches with 10 during elimination!). |
| **Jack (J)** | **40 pts** | ⚠️ **Highest risk card!** 40 penalty points if kept in hand. Has special Blind Swap ability. |

---

## 4. Game Setup & Initial Memorization

1. Every player receives **6 face-down cards**.
2. **Initial Memorization Phase**:
   * Before Round 1 begins, each player privately chooses and views **exactly 2 of their own cards**.
   * Players memorize the values and positions of these 2 cards.
   * The cards are flipped back face-down.
   * In Multiplayer and Pass-and-Play, this step is completely private; no opponent can see what cards were memorized.

---

## 5. Turn Life Cycle & Player Actions

Play proceeds in clockwise order. On each turn at **`TURN_START`**, the active player chooses **ONE** of the following four actions:

### Option 1: Draw from Draw Pile (`DRAW`)
1. **Card Privacy Rule**:
   * **Only the player who drew the card sees it face up.**
   * **To all opponents**, the card appears **face-down** (`🔒 Secret Card`), and its data is masked over the network.
2. The player then chooses what to do with the drawn card:
   * **Replace a Card in Hand (`REPLACE`)**:
     * Swap the drawn card into any hand position (1 to 6).
     * The drawn card is placed face-down into that position.
     * The old card from that position is placed face-up on the Discard Pile.
   * **Discard Drawn Card (`DISCARD`)**:
     * Discard the drawn card directly face-up onto the Discard Pile.
   * **Use Special Ability** *(if drawn card is 7, 8, or Jack)*:
     * Discard the card and immediately trigger its special power (see Section 6).

---

### Option 2: Take from Discard Pile (`REPLACE_FROM_DISCARD`)
* Take the **top face-up card** from the Discard Pile.
* Replace any card in your hand with it.
* The replaced card from your hand goes face-up to the Discard Pile.
* *(Special powers do NOT trigger when taking from the discard pile).*

---

### Option 3: Matching Elimination (`SELECT_ELIMINATION`)
* Inspect the top face-up card on the Discard Pile.
* If you know you hold 1 or more cards in your hand with the **exact same point value**:
  * *Example A*: Top discard is a `5` (5 pts), and you hold two `5`s.
  * *Example B*: Top discard is a `10` (10 pts), and you hold a `10` and a `Queen` (both are 10 pts!).
  * *Example C*: Top discard is a `King` (0 pts), and you hold another `King` (0 pts).
* Select the matching card(s) from your hand:
  * **Success**: The matching cards are permanently removed from your hand into the Eliminated Zone. **Your hand size shrinks!**
  * **Failure (Mismatch)**: If any selected card does not match the discard point value, elimination fails:
    * A **penalty card** is dealt face-down into your hand from the draw pile.
    * Your hand size increases by 1.

---

### Option 4: Declare Victory (`DECLARE_VICTORY`)
* **Restriction**: Allowed **only after Round 1 is completed** (everyone has taken at least 1 turn).
* If you believe your hand total is the lowest among all players, you declare victory.
* This locks your hand and initiates the **Final Round** (see Section 7).

---

## 6. Special Abilities (7, 8, Jack)

Special abilities trigger **only when the card is drawn from the Draw Pile and discarded**:

### 🔍 Power of 7 — Self Peek (`SPECIAL_ABILITY_7`)
* **Effect**: Secretly view **one of your own face-down cards**.
* **Advantage**: Refresh your memory or discover an unrevealed card to prepare for future replacements or eliminations.
* **Privacy**: Only you see the revealed card.

### 👁️ Power of 8 — Opponent Peek (`SPECIAL_ABILITY_8`)
* **Effect**: Secretly view **one face-down card belonging to any opponent**.
* **Advantage**: Scout an opponent's hand to spot high cards (like Jacks or Queens) to swap, or Kings to avoid.
* **Privacy**: Only you see the card. The targeted opponent does not see the card value.

### 🔄 Power of Jack — Blind Exchange (`SPECIAL_ABILITY_JACK`)
* **Effect**: Swap **one of your cards** with **one opponent card**.
* **Condition**: Swapped **blindly** — neither player looks at the cards during the exchange.
* **Strategy**: Transfer your known high cards (like 40-pt Jacks, 10-pt Queens, or high numbers) to an opponent in exchange for a card you believe is low.

---

## 7. Victory Conditions & Scoring Evaluation

A match concludes in one of three ways:

### A. 🏆 Automatic Zero-Card Victory
* If any player successfully eliminates all cards in their hand down to **0 cards**:
* The match ends **immediately**.
* That player wins automatically with **0 points** (`ZERO_CARD_AUTOMATIC_VICTORY`). No final round is played!

### B. 🏁 Declared Victory & The Final Round
1. When a player declares victory:
   * That player's turn ends, and they take no further turns.
   * **Every other player gets exactly ONE final turn** to optimize their hand, replace high cards, or attempt eliminations.
2. At the end of the final round, **all cards of all players are flipped face-up** and point values are summed:
   * **Successful Call**: If the declaring player has the **strictly lowest hand score** (or ties for lowest):
     * The declaring player wins!
   * **Failed Call (Under-cut)**: If any opponent has an **equal or lower hand score** than the declaring player:
     * The declarer incurs a **+10 point penalty** added to their score.
     * The opponent with the lowest score wins!

### C. 📦 Draw Pile Exhaustion
* If the draw pile empties and cannot be replenished, the match ends immediately.
* All hands are revealed, and the player with the lowest score wins.

---

## 8. Supported Game Modes

The application currently supports 3 distinct play modes:

| Mode | Players | Description |
| :--- | :---: | :--- |
| **Mode 1: Play with System AI** | 1 Human vs 1 AI | Single-player match against an intelligent bot (`AIBot`) that tracks memory, calculates odds, uses abilities, and declares victory. |
| **Mode 2: Online Multiplayer** | 2 to 4 Players | Real-time WebSocket rooms (`Socket.IO`). Features 4-character Room Codes (e.g. `7K2X`), live player invitations, and friend lists. |
| **Mode 3: Pass & Play** | 2 to 6 Players | Local multiplayer on a single device or shared screen. Features private device-handover screens to protect card secrecy between turns. |

---

## 9. Player Profiles & Economy

* **Player Identity**: Permanent Player ID (e.g. `P-1001`), username, and selectable custom avatar.
* **Chips & Currency**:
  * Guest / New players receive starting bonus chips (500 – 1,000 chips).
  * Winning a match awards **+100 chips**.
* **Referral System**:
  * Every player has a unique referral code (e.g. `REF-7K2X`).
  * Both players receive **+100 bonus chips** when a new player signs up with a referral code.
* **Scoreboard & Stats**:
  * Persisted in PostgreSQL (Supabase).
  * Tracks: Games Played, Games Won, Best Score, and Zero-Card Wins.
