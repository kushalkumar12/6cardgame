import type { Card } from '../types/card';
import { GameEngine } from './gameEngine';

export interface AIMemory {
  /** Known cards in AI's own hand: index -> Card */
  ownKnownCards: Map<number, Card>;
  /** Known cards in opponent's hand: opponentId -> Map<index, Card> */
  opponentKnownCards: Map<string, Map<number, Card>>;
}

export function createAIMemory(): AIMemory {
  return {
    ownKnownCards: new Map(),
    opponentKnownCards: new Map(),
  };
}

/**
 * AI Bot logic for "Play with System" mode.
 * Deterministic, intelligent memory and decision-making.
 */
export class AIBot {
  public memory: AIMemory;
  public playerId: string;

  constructor(playerId: string = 'player-2') {
    this.playerId = playerId;
    this.memory = createAIMemory();
  }

  /**
   * AI chooses 2 cards to memorize during setup.
   */
  public chooseInitialMemorization(): [number, number] {
    return [0, 1];
  }

  /**
   * Records memorized cards into memory.
   */
  public recordMemorizedCards(indices: [number, number], cards: [Card, Card]): void {
    this.memory.ownKnownCards.set(indices[0], cards[0]);
    this.memory.ownKnownCards.set(indices[1], cards[1]);
  }

  /**
   * Makes a turn decision at TURN_START.
   */
  public decideTurnStartAction(
    engine: GameEngine,
    allowDiscardReplacement: boolean = true
  ): 'ELIMINATE' | 'DECLARE_VICTORY' | 'REPLACE_FROM_DISCARD' | 'DRAW' {
    const state = engine.getState();
    const self = state.players.find((p) => p.id === this.playerId);
    if (!self) return 'DRAW';

    // 1. Check if eligible for victory declaration:
    // If round 1 complete, and AI has low total score (e.g. <= 8) across known cards and few cards
    if (state.firstRoundCompleted && self.cards.length <= 4) {
      let knownScore = 0;
      let knownCount = 0;
      self.cards.forEach((_, idx) => {
        if (this.memory.ownKnownCards.has(idx)) {
          knownScore += this.memory.ownKnownCards.get(idx)!.pointValue;
          knownCount++;
        }
      });
      if (knownCount === self.cards.length && knownScore <= 8) {
        return 'DECLARE_VICTORY';
      }
    }

    // 2. Check if eligible for matching elimination:
    if (state.discardPile.length > 0) {
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      const targetPoint = topDiscard.pointValue;
      const targetRank = topDiscard.rank;

      // Find any known cards in hand that match targetRank or targetPoint
      const matchingIndices: number[] = [];
      self.cards.forEach((_, idx) => {
        const known = this.memory.ownKnownCards.get(idx);
        if (known && (known.rank === targetRank || known.pointValue === targetPoint)) {
          matchingIndices.push(idx);
        }
      });

      if (matchingIndices.length > 0) {
        return 'ELIMINATE';
      }
    }

    // 3. Check if top discard card is attractive to replace a higher known card in hand (only if allowed by mode):
    if (allowDiscardReplacement && state.discardPile.length > 0) {
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      const replaceIdx = this.getBestDiscardReplacementIndex(engine);
      if (replaceIdx !== -1 && topDiscard.pointValue <= 7) {
        return 'REPLACE_FROM_DISCARD';
      }
    }

    // Otherwise, draw a card
    return 'DRAW';
  }

  /**
   * Finds the best card index to replace with top discard, if beneficial.
   */
  public getBestDiscardReplacementIndex(engine: GameEngine): number {
    const state = engine.getState();
    const self = state.players.find((p) => p.id === this.playerId);
    if (!self || state.discardPile.length === 0) return -1;

    const topDiscard = state.discardPile[state.discardPile.length - 1];
    let worstIndex = -1;
    let highestPoints = topDiscard.pointValue;

    self.cards.forEach((_, idx) => {
      const known = this.memory.ownKnownCards.get(idx);
      if (known && known.pointValue > highestPoints) {
        highestPoints = known.pointValue;
        worstIndex = idx;
      }
    });

    return worstIndex;
  }

  /**
   * Updates bot memory after replacing a card from discard pile.
   */
  public onCardReplacedFromDiscard(index: number, newCard: Card): void {
    this.memory.ownKnownCards.set(index, newCard);
  }

  /**
   * Get matching card indices that AI knows it has.
   */
  public getKnownMatchingIndices(engine: GameEngine): number[] {
    const state = engine.getState();
    const self = state.players.find((p) => p.id === this.playerId);
    if (!self || state.discardPile.length === 0) return [];

    const topDiscard = state.discardPile[state.discardPile.length - 1];
    const targetPoint = topDiscard.pointValue;
    const targetRank = topDiscard.rank;

    const matchingIndices: number[] = [];
    self.cards.forEach((_, idx) => {
      const known = this.memory.ownKnownCards.get(idx);
      if (known && (known.rank === targetRank || known.pointValue === targetPoint)) {
        matchingIndices.push(idx);
      }
    });

    return matchingIndices;
  }

  /**
   * Makes a decision after drawing a card.
   */
  public decideCardDrawnAction(
    drawnCard: Card,
    engine: GameEngine
  ): {
    action: 'REPLACE' | 'DISCARD' | 'USE_7' | 'USE_8' | 'USE_JACK';
    replaceIndex?: number;
    targetOpponentId?: string;
    targetCardIndex?: number;
    jackOwnIndex?: number;
  } {
    const state = engine.getState();
    const self = state.players.find((p) => p.id === this.playerId);
    const opponents = state.players.filter((p) => p.id !== this.playerId);
    if (!self) return { action: 'DISCARD' };

    // Special Ability 7: Peek own unknown card
    if (drawnCard.rank === '7') {
      // Find an unknown index in self hand
      const unknownIndex = self.cards.findIndex((_, idx) => !this.memory.ownKnownCards.has(idx));
      if (unknownIndex !== -1) {
        return { action: 'USE_7', targetCardIndex: unknownIndex };
      }
    }

    // Special Ability 8: Peek opponent's card
    if (drawnCard.rank === '8' && opponents.length > 0) {
      const opp = opponents[0];
      return {
        action: 'USE_8',
        targetOpponentId: opp.id,
        targetCardIndex: Math.floor(Math.random() * opp.cards.length),
      };
    }

    // Special Ability Jack: Blind swap AI's highest known card with opponent's card
    if (drawnCard.rank === 'J' && opponents.length > 0) {
      let highestKnownIndex = 0;
      let highestValue = -1;
      self.cards.forEach((_, idx) => {
        const card = this.memory.ownKnownCards.get(idx);
        if (card && card.pointValue > highestValue) {
          highestValue = card.pointValue;
          highestKnownIndex = idx;
        }
      });

      // If AI knows a card with value >= 7 or has unknown cards, swap it
      const opp = opponents[0];
      const oppIdx = Math.floor(Math.random() * opp.cards.length);
      return {
        action: 'USE_JACK',
        jackOwnIndex: highestKnownIndex,
        targetOpponentId: opp.id,
        targetCardIndex: oppIdx,
      };
    }

    // Normal replacement decision:
    // If drawn card is low (<= 5)
    if (drawnCard.pointValue <= 5) {
      // Find highest known card or an unknown card
      let replaceIdx = -1;
      let maxKnownVal = drawnCard.pointValue;

      self.cards.forEach((_, idx) => {
        const known = this.memory.ownKnownCards.get(idx);
        if (known && known.pointValue > maxKnownVal) {
          maxKnownVal = known.pointValue;
          replaceIdx = idx;
        }
      });

      if (replaceIdx === -1) {
        // Look for unknown card to replace
        replaceIdx = self.cards.findIndex((_, idx) => !this.memory.ownKnownCards.has(idx));
      }

      if (replaceIdx !== -1) {
        this.memory.ownKnownCards.set(replaceIdx, drawnCard);
        return { action: 'REPLACE', replaceIndex: replaceIdx };
      }
    }

    // Otherwise discard
    return { action: 'DISCARD' };
  }

  /**
   * Updates memory when cards shift or eliminate.
   */
  public onCardEliminated(eliminatedIndices: number[]): void {
    const newMap = new Map<number, Card>();
    // Sort eliminated descending
    const sorted = [...eliminatedIndices].sort((a, b) => a - b);
    let shift = 0;
    this.memory.ownKnownCards.forEach((card, idx) => {
      if (sorted.includes(idx)) {
        shift++;
      } else {
        newMap.set(idx - shift, card);
      }
    });
    this.memory.ownKnownCards = newMap;
  }
}
