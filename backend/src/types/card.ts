export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  /** Unique identifier for this card instance across all decks */
  id: string;
  rank: Rank;
  suit: Suit;
  /**
   * Numeric scoring value:
   * A = 1, 2-10 = numeric value, J = 40, Q = 10, K = 0
   */
  pointValue: number;
  /** Internal index of which physical deck this card belongs to (0, 1, 2) */
  deckIndex?: number;
}
