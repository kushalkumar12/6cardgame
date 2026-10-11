import type { Card, Rank } from '../types/card';

export const RANK_POINTS: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 40,
  Q: 10,
  K: 0,
};

/**
 * Returns point value for a given rank according to the exact game rules.
 */
export function getRankPointValue(rank: Rank): number {
  return RANK_POINTS[rank];
}

/**
 * Checks if two cards match by point value (suits and ranks do not need to match).
 */
export function cardsMatchByPoint(cardA: Card, cardB: Card): boolean {
  return cardA.pointValue === cardB.pointValue;
}

/**
 * Checks if a card matches a target point value.
 */
export function cardMatchesPointValue(card: Card, targetPointValue: number): boolean {
  return card.pointValue === targetPointValue;
}

/**
 * Calculates sum of point values for a collection of cards.
 */
export function calculateHandScore(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.pointValue, 0);
}
