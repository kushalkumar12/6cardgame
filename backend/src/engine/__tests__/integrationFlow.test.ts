import { describe, it, expect } from 'vitest';
import { GameEngine } from '../gameEngine';
import type { Card } from '../../types/card';

describe('Integration & Full Flow Tests', () => {
  it('executes a complete game flow: Setup -> Memorize -> Turns -> Elimination -> Zero Card Win', () => {
    const engine = new GameEngine({ playerNames: ['Alice', 'Bob', 'Charlie'] });
    expect(engine.getState().currentPhase).toBe('INITIAL_MEMORIZATION');

    // 1. Initial Memorization for all 3 players
    for (let p = 0; p < 3; p++) {
      expect(engine.getState().initialMemorizationPlayerIndex).toBe(p);
      const revealed = engine.memorizeCards([0, 1]);
      expect(revealed.length).toBe(2);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
    }

    // Now Round 1 begins with Player 0 (Alice)
    expect(engine.getState().currentPhase).toBe('TURN_START');
    expect(engine.getState().currentPlayerIndex).toBe(0);
    expect(engine.getState().roundNumber).toBe(1);

    // Alice draws a card and replaces card at index 0
    const aliceDrawn = engine.drawCard();
    expect(engine.getState().currentPhase).toBe('CARD_DRAWN');
    const aliceReplaced = engine.replaceCard(0);
    expect(engine.getState().discardPile.length).toBe(1);
    expect(engine.getState().discardPile[0].id).toBe(aliceReplaced.id);
    expect(engine.getState().players[0].cards[0].id).toBe(aliceDrawn.id);

    // Turn moves to Bob
    expect(engine.getState().currentPhase).toBe('PASS_DEVICE');
    engine.confirmPassDevice();
    expect(engine.getState().currentPlayerIndex).toBe(1);

    // Bob draws and discards
    engine.drawCard();
    engine.discardDrawnCard();
    engine.confirmPassDevice();

    // Turn moves to Charlie
    expect(engine.getState().currentPlayerIndex).toBe(2);
    engine.drawCard();
    engine.discardDrawnCard();
    engine.confirmPassDevice();

    // Round 1 is complete! Now Round 2 starts with Alice
    expect(engine.getState().roundNumber).toBe(2);
    expect(engine.getState().firstRoundCompleted).toBe(true);
    expect(engine.getState().currentPlayerIndex).toBe(0);

    // Setup an elimination scenario for Alice:
    // Discard top card is 10 of Spades (10 pts)
    const state = engine.getState();
    const tenCard: Card = { id: 'disc-10', rank: '10', suit: 'SPADES', pointValue: 10 };
    state.discardPile.push(tenCard);

    // Give Alice only 1 card: Queen of Hearts (10 pts)
    state.players[0].cards = [{ id: 'alice-q', rank: 'Q', suit: 'HEARTS', pointValue: 10 }];
    engine.loadState(state);

    // Alice performs matching elimination with Queen matching the 10
    engine.startElimination();
    const elimResult = engine.attemptElimination([0]);
    expect(elimResult.success).toBe(true);
    expect(elimResult.eliminatedCount).toBe(1);

    // Alice now has 0 cards -> Immediate Automatic Victory!
    const finalState = engine.getState();
    expect(finalState.gameOver).toBe(true);
    expect(finalState.endReason).toBe('ZERO_CARD_AUTOMATIC_VICTORY');
    expect(finalState.winnerIds).toEqual(['player-1']);
  });

  it('verifies that action log NEVER leaks hidden card ranks or values', () => {
    const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
    engine.memorizeCards([0, 1]);
    engine.completeMemorizationForPlayer();
    engine.confirmPassDevice();
    engine.memorizeCards([0, 1]);
    engine.completeMemorizationForPlayer();
    engine.confirmPassDevice();

    // P1 draws and replaces
    engine.drawCard();
    engine.replaceCard(2);
    engine.confirmPassDevice();

    // P2 draws 7 and uses ability
    const state = engine.getState();
    state.drawPile.unshift({ id: 'secret-7', rank: '7', suit: 'HEARTS', pointValue: 7 });
    engine.loadState(state);

    engine.drawCard();
    engine.startAbility7();
    engine.executeAbility7(0);
    engine.finishAbility7();

    const logTexts = engine.getState().actionHistory.map((l) => l.text);

    // Check that hidden card values (e.g. peeked card, replaced card identity) are not leaked
    for (const text of logTexts) {
      expect(text.includes('HEARTS')).toBe(false);
      expect(text.includes('DIAMONDS')).toBe(false);
      expect(text.includes('secret-7')).toBe(false);
    }
  });
});
