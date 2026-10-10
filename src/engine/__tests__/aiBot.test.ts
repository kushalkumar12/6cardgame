import { describe, it, expect, beforeEach } from 'vitest';
import { AIBot } from '../aiBot';
import { GameEngine } from '../gameEngine';
import type { Card } from '../../types/card';

describe('AIBot Unit Tests for Mode 1 (Play with System)', () => {
  let bot: AIBot;
  let engine: GameEngine;

  beforeEach(() => {
    bot = new AIBot('player-2');
    engine = new GameEngine({ playerNames: ['Human', 'System AI'] });
  });

  it('chooses two valid cards for initial memorization', () => {
    const indices = bot.chooseInitialMemorization();
    expect(indices.length).toBe(2);
    expect(indices[0]).not.toBe(indices[1]);
    expect(indices[0]).toBeGreaterThanOrEqual(0);
    expect(indices[1]).toBeLessThan(6);
  });

  it('records memorized cards in memory and retrieves them', () => {
    const card0: Card = { id: 'c0', rank: 'K', suit: 'HEARTS', pointValue: 0 };
    const card1: Card = { id: 'c1', rank: '5', suit: 'SPADES', pointValue: 5 };
    bot.recordMemorizedCards([0, 1], [card0, card1]);

    expect(bot.memory.ownKnownCards.get(0)?.pointValue).toBe(0);
    expect(bot.memory.ownKnownCards.get(1)?.pointValue).toBe(5);
  });

  it('decides to eliminate when discard top matches a known card', () => {
    const card0: Card = { id: 'c0', rank: '5', suit: 'HEARTS', pointValue: 5 };
    bot.recordMemorizedCards([0, 1], [card0, { id: 'c1', rank: '9', suit: 'CLUBS', pointValue: 9 }]);

    const state = engine.getState();
    state.discardPile.push({ id: 'top-5', rank: '5', suit: 'DIAMONDS', pointValue: 5 });
    engine.loadState(state);

    const decision = bot.decideTurnStartAction(engine);
    expect(decision).toBe('ELIMINATE');

    const matchingIndices = bot.getKnownMatchingIndices(engine);
    expect(matchingIndices).toContain(0);
  });

  it('decides to draw when no matching cards are known', () => {
    const card0: Card = { id: 'c0', rank: '2', suit: 'HEARTS', pointValue: 2 };
    bot.recordMemorizedCards([0, 1], [card0, { id: 'c1', rank: '3', suit: 'CLUBS', pointValue: 3 }]);

    const state = engine.getState();
    state.discardPile.push({ id: 'top-K', rank: 'K', suit: 'DIAMONDS', pointValue: 0 });
    engine.loadState(state);

    const decision = bot.decideTurnStartAction(engine);
    expect(decision).toBe('DRAW');
  });

  it('uses 7 ability to peek an unknown card in its hand', () => {
    const sevenCard: Card = { id: '7c', rank: '7', suit: 'HEARTS', pointValue: 7 };
    const decision = bot.decideCardDrawnAction(sevenCard, engine);
    expect(decision.action).toBe('USE_7');
    expect(decision.targetCardIndex).toBeDefined();
  });

  it('uses Jack ability to swap its highest card with opponent', () => {
    const highCard: Card = { id: 'high', rank: 'J', suit: 'SPADES', pointValue: 40 };
    bot.recordMemorizedCards([0, 1], [highCard, { id: 'low', rank: 'K', suit: 'HEARTS', pointValue: 0 }]);

    const jackCard: Card = { id: 'jack', rank: 'J', suit: 'HEARTS', pointValue: 40 };
    const decision = bot.decideCardDrawnAction(jackCard, engine);
    expect(decision.action).toBe('USE_JACK');
    expect(decision.jackOwnIndex).toBe(0); // Index of highest card
    expect(decision.targetOpponentId).toBe('player-1');
  });

  it('replaces a high known card with a low drawn card (<= 5 points)', () => {
    const tenCard: Card = { id: 'ten', rank: '10', suit: 'SPADES', pointValue: 10 };
    bot.recordMemorizedCards([0, 1], [tenCard, { id: 'two', rank: '2', suit: 'HEARTS', pointValue: 2 }]);

    const drawnLow: Card = { id: 'ace', rank: 'A', suit: 'HEARTS', pointValue: 1 };
    const decision = bot.decideCardDrawnAction(drawnLow, engine);
    expect(decision.action).toBe('REPLACE');
    expect(decision.replaceIndex).toBe(0); // Replaces the 10 with the Ace
  });

  it('discards high non-special cards when they would not improve hand', () => {
    const king0: Card = { id: 'k0', rank: 'K', suit: 'HEARTS', pointValue: 0 };
    const king1: Card = { id: 'k1', rank: 'K', suit: 'SPADES', pointValue: 0 };
    bot.recordMemorizedCards([0, 1], [king0, king1]);

    const drawnNine: Card = { id: 'nine', rank: '9', suit: 'DIAMONDS', pointValue: 9 };
    const decision = bot.decideCardDrawnAction(drawnNine, engine);
    expect(decision.action).toBe('DISCARD');
  });
});
