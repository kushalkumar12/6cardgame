# Six Cards — Complete Game Rules & Engine Specification

This document provides the authoritative reference for the card mechanics, scoring rules, turn life cycle, special powers, penalties, and victory conditions implemented in Six Cards.

---

## 1. Deck Composition & Scaling

- **Standard Deck**: 52 cards (no Jokers), consisting of 4 suits (Spades, Hearts, Diamonds, Clubs) with ranks Ace through King.
- **Player Scaling**:
  - **2 to 4 Players**: Uses **1 single deck** (52 cards).
  - **5 to 6 Players**: Uses **2 combined decks** (104 cards).
- **Dealing**: Each player is dealt exactly **6 cards face down** in a 2×3 grid layout (Cards 1 to 6).

---

## 2. Card Point Values

The objective is to achieve the **lowest hand point total** or eliminate all cards down to zero.

| Rank | Point Value | Category / Power |
| :--- | :--- | :--- |
| **King (Hearts / Diamonds)** | **0 pts** | Red Kings (Best card in standard play) |
| **King (Spades / Clubs)** | **13 pts** | Black Kings (Heavy penalty if kept) |
| **Ace** | **1 pt** | Ultra-low point card |
| **2 through 6** | **Face Value (2 – 6 pts)** | Standard numeric cards |
| **7** | **7 pts** | **Special Ability**: Peek at 1 of your own face-down cards |
| **8** | **8 pts** | **Special Ability**: Peek at 1 of any opponent's face-down cards |
| **9 & 10** | **9 & 10 pts** | Standard numeric cards |
| **Jack** | **11 pts** | **Special Ability**: Blind swap 1 of your cards with 1 opponent card |
| **Queen** | **12 pts** | High point card |

---

## 3. Game Phases & Life Cycle

```text
[ SETUP ]
    │
    ▼
[ INITIAL MEMORIZATION ] (Each player secretly views any 2 of their 6 cards)
    │
    ▼
[ TURN LOOP: Round 1, Round 2, ... ]
    ├── 1. TURN_START
    │       ├── Option A: Draw from Draw Pile ──► [ CARD_DRAWN ]
    │       │                                          ├── Replace own card ──► Discard replaced card
    │       │                                          ├── Use Special Ability (7 / 8 / Jack)
    │       │                                          └── Discard drawn card directly
    │       ├── Option B: Take top card from Discard Pile ──► Replace any of own cards
    │       ├── Option C: Attempt Matching Elimination ──► [ SELECT_ELIMINATION ]
    │       └── Option D: Declare Victory (Allowed only after Round 1) ──► [ FINAL ROUND ]
    │
    ▼
[ PASS DEVICE / CONFIRM ] (In Pass & Play / Multiplayer screen transition)
    │
    ▼
[ GAME OVER & SCORING ]
```

---

## 4. Special Abilities

Special abilities trigger **only when the card is drawn from the Draw Pile and immediately discarded**:

### 1. Ability 7 (Self Peek)
- **Trigger**: Draw a 7 from the Draw Pile and discard it.
- **Action**: Secretly view **one** of your own face-down cards.
- **Advantage**: Strengthens your memory of your hand to prepare for a future swap, replacement, or elimination.

### 2. Ability 8 (Opponent Peek)
- **Trigger**: Draw an 8 from the Draw Pile and discard it.
- **Action**: Secretly view **one** face-down card belonging to any opponent of your choice.
- **Advantage**: Identifies high-value cards to target with a Jack, or low-value cards to avoid taking.

### 3. Ability Jack (Blind Exchange)
- **Trigger**: Draw a Jack from the Draw Pile and discard it.
- **Action**: Swap **one** card from your hand with **one** card from an opponent's hand **without looking at either card during the swap**.
- **Strategy**: Send a known high card (e.g. Black King, Queen) to an opponent in exchange for a card you believe is low.

---

## 5. Matching Elimination & Penalties

Matching elimination allows players to permanently reduce their hand size:

1. **Rule**:
   - On your turn at `TURN_START`, you may inspect the top face-up card of the **Discard Pile**.
   - If you know you hold one or more cards in your hand with the **exact same point value** (e.g. top discard is a 5, and you have two 5s), you can select them to eliminate.
2. **Success**:
   - If all selected cards match the point value of the discard card:
     - The matching cards are **permanently removed from your hand** into the Eliminated Zone.
     - Your hand size decreases (e.g. from 6 cards down to 4 cards).
3. **Penalty**:
   - If **any** selected card does not match:
     - Elimination fails.
     - A penalty card is dealt face-down to your hand from the draw pile.
     - You acknowledge the penalty, and your turn ends.

---

## 6. End of Game & Victory Evaluation

### A. Automatic Zero-Card Victory
- If any player eliminates all cards in their hand down to **0 cards**, the game ends **immediately**.
- That player is crowned the absolute winner (`ZERO_CARD_AUTOMATIC_VICTORY`).

### B. Declaring Victory
- A player who believes their total hand value is the lowest can call **Declare Victory** on their turn (available after Round 1).
- **Final Round**: Every other player receives **one final turn** to optimize their hand.
- After the final round, all cards of all players are revealed:
  - If the declaring player has the strictly lowest score (or ties for lowest), they win.
  - If any opponent has an equal or lower score than the declaring player, the declarer incurs a **+10 point penalty**, and the lowest player wins.
