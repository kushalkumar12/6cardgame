import type { Card, Rank, Suit } from '../types/card';
import { getRankPointValue } from './scoring';

export const ALL_SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Returns number of standard 52-card decks required for a given player count (2-6).
 * 2 players: 1 deck
 * 3-4 players: 2 decks
 * 5-6 players: 3 decks
 */
export function getRequiredDeckCount(playerCount: number): number {
  if (playerCount < 2 || playerCount > 6) {
    throw new Error(`Player count must be between 2 and 6, got ${playerCount}`);
  }
  if (playerCount === 2) return 1;
  if (playerCount === 3 || playerCount === 4) return 2;
  return 3;
}

/**
 * Generates the combined deck of cards for the given number of decks.
 * Each card has a globally unique ID.
 */
export function createDecks(deckCount: number): Card[] {
  const cards: Card[] = [];
  for (let deckIndex = 0; deckIndex < deckCount; deckIndex++) {
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        cards.push({
          id: `deck${deckIndex}-${rank}-${suit}`,
          rank,
          suit,
          pointValue: getRankPointValue(rank),
          deckIndex,
        });
      }
    }
  }
  return cards;
}

/**
 * Shuffles an array of cards using Fisher-Yates algorithm.
 * Accepts an optional random generator function (defaulting to Math.random) for deterministic testing.
 */
export function shuffleCards(cards: Card[], rng: () => number = Math.random): Card[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
