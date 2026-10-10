import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../gameEngine';
import { createDecks, getRequiredDeckCount } from '../deck';
import { calculateHandScore, cardsMatchByPoint, getRankPointValue } from '../scoring';
import type { Card } from '../../types/card';

describe('GameEngine Unit Tests', () => {
  describe('A. Setup and decks', () => {
    it('calculates correct deck count for 2-6 players', () => {
      expect(getRequiredDeckCount(2)).toBe(1);
      expect(getRequiredDeckCount(3)).toBe(2);
      expect(getRequiredDeckCount(4)).toBe(2);
      expect(getRequiredDeckCount(5)).toBe(3);
      expect(getRequiredDeckCount(6)).toBe(3);
      expect(() => getRequiredDeckCount(1)).toThrow();
      expect(() => getRequiredDeckCount(7)).toThrow();
    });

    it('generates standard 52-card decks without jokers with unique IDs', () => {
      const singleDeck = createDecks(1);
      expect(singleDeck.length).toBe(52);
      const uniqueIds = new Set(singleDeck.map((c) => c.id));
      expect(uniqueIds.size).toBe(52);

      const twoDecks = createDecks(2);
      expect(twoDecks.length).toBe(104);
      const uniqueIds2 = new Set(twoDecks.map((c) => c.id));
      expect(uniqueIds2.size).toBe(104);

      // Verify no jokers exist in decks
      expect(singleDeck.some((c) => (c.rank as string) === 'JOKER')).toBe(false);
    });

    it('deals exactly 6 cards to each player and leaves draw pile = total - dealt', () => {
      for (const playerCount of [2, 3, 4, 5, 6]) {
        const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
        const engine = new GameEngine({ playerNames: names });
        const state = engine.getState();

        expect(state.players.length).toBe(playerCount);
        const allDealtCardIds = new Set<string>();

        for (const p of state.players) {
          expect(p.cards.length).toBe(6);
          for (const card of p.cards) {
            expect(allDealtCardIds.has(card.id)).toBe(false);
            allDealtCardIds.add(card.id);
          }
        }

        const totalCards = getRequiredDeckCount(playerCount) * 52;
        expect(state.drawPile.length).toBe(totalCards - playerCount * 6);
        expect(state.discardPile.length).toBe(0);
        expect(state.eliminatedCards.length).toBe(0);
      }
    });

    it('allows every player to memorize exactly two cards during initial memorization', () => {
      const engine = new GameEngine({ playerNames: ['Alice', 'Bob'] });
      expect(engine.getState().currentPhase).toBe('INITIAL_MEMORIZATION');
      expect(engine.getState().initialMemorizationPlayerIndex).toBe(0);

      // Player 1 memorizes cards at index 0 and 3
      const aliceCards = engine.memorizeCards([0, 3]);
      expect(aliceCards.length).toBe(2);
      expect(() => engine.memorizeCards([0])).toThrow();
      expect(() => engine.memorizeCards([0, 0])).toThrow(); // duplicate index

      engine.completeMemorizationForPlayer();
      expect(engine.getState().currentPhase).toBe('PASS_DEVICE');
      engine.confirmPassDevice();

      expect(engine.getState().currentPhase).toBe('INITIAL_MEMORIZATION');
      expect(engine.getState().initialMemorizationPlayerIndex).toBe(1);

      // Player 2 memorizes cards at index 1 and 4
      const bobCards = engine.memorizeCards([1, 4]);
      expect(bobCards.length).toBe(2);
      engine.completeMemorizationForPlayer();

      // Passing device to Player 1 to start Round 1
      expect(engine.getState().currentPhase).toBe('PASS_DEVICE');
      expect(engine.getState().currentPlayerIndex).toBe(0);
      engine.confirmPassDevice();
      expect(engine.getState().currentPhase).toBe('TURN_START');
      expect(engine.getState().roundNumber).toBe(1);
      expect(engine.getState().firstRoundCompleted).toBe(false);
    });
  });

  describe('B. Values and matching', () => {
    it('assigns exact point values to all ranks', () => {
      expect(getRankPointValue('A')).toBe(1);
      expect(getRankPointValue('2')).toBe(2);
      expect(getRankPointValue('3')).toBe(3);
      expect(getRankPointValue('4')).toBe(4);
      expect(getRankPointValue('5')).toBe(5);
      expect(getRankPointValue('6')).toBe(6);
      expect(getRankPointValue('7')).toBe(7);
      expect(getRankPointValue('8')).toBe(8);
      expect(getRankPointValue('9')).toBe(9);
      expect(getRankPointValue('10')).toBe(10);
      expect(getRankPointValue('J')).toBe(40);
      expect(getRankPointValue('Q')).toBe(10);
      expect(getRankPointValue('K')).toBe(0);
    });

    it('matches cards by numeric point value only, regardless of suit and rank', () => {
      const qHearts: Card = { id: '1', rank: 'Q', suit: 'HEARTS', pointValue: 10 };
      const tenSpades: Card = { id: '2', rank: '10', suit: 'SPADES', pointValue: 10 };
      const kingDiamonds: Card = { id: '3', rank: 'K', suit: 'DIAMONDS', pointValue: 0 };
      const kingClubs: Card = { id: '4', rank: 'K', suit: 'CLUBS', pointValue: 0 };
      const fiveHearts: Card = { id: '5', rank: '5', suit: 'HEARTS', pointValue: 5 };
      const fiveSpades: Card = { id: '6', rank: '5', suit: 'SPADES', pointValue: 5 };

      // Queen (10) matches 10 (10)
      expect(cardsMatchByPoint(qHearts, tenSpades)).toBe(true);
      // King (0) matches King (0)
      expect(cardsMatchByPoint(kingDiamonds, kingClubs)).toBe(true);
      // 5 matches 5
      expect(cardsMatchByPoint(fiveHearts, fiveSpades)).toBe(true);
      // Queen does not match King
      expect(cardsMatchByPoint(qHearts, kingDiamonds)).toBe(false);
    });
  });

  describe('C. Turn order and round progression', () => {
    let engine: GameEngine;

    beforeEach(() => {
      engine = new GameEngine({ playerNames: ['P1', 'P2', 'P3'] });
      // Finish memorization for all 3
      for (let i = 0; i < 3; i++) {
        engine.memorizeCards([0, 1]);
        engine.completeMemorizationForPlayer();
        engine.confirmPassDevice();
      }
    });

    it('advances turns in clockwise round-robin order', () => {
      expect(engine.getState().currentPlayerIndex).toBe(0);
      expect(engine.getState().roundNumber).toBe(1);

      // P1 draws and discards
      engine.drawCard();
      engine.discardDrawnCard();
      expect(engine.getState().currentPhase).toBe('PASS_DEVICE');
      engine.confirmPassDevice();

      expect(engine.getState().currentPlayerIndex).toBe(1);
      expect(engine.getState().roundNumber).toBe(1);
      expect(engine.getState().firstRoundCompleted).toBe(false);

      // P2 draws and discards
      engine.drawCard();
      engine.discardDrawnCard();
      engine.confirmPassDevice();

      expect(engine.getState().currentPlayerIndex).toBe(2);
      expect(engine.getState().firstRoundCompleted).toBe(false);

      // P3 draws and discards -> round 1 finishes!
      engine.drawCard();
      engine.discardDrawnCard();
      engine.confirmPassDevice();

      expect(engine.getState().currentPlayerIndex).toBe(0);
      expect(engine.getState().roundNumber).toBe(2);
      expect(engine.getState().firstRoundCompleted).toBe(true);
    });

    it('prevents victory declaration before first round finishes', () => {
      expect(engine.getState().firstRoundCompleted).toBe(false);
      expect(() => engine.declareVictory()).toThrow('Cannot declare victory during the first round.');
    });

    it('allows victory declaration on own turn after round one completes', () => {
      // Complete round 1
      for (let i = 0; i < 3; i++) {
        engine.drawCard();
        engine.discardDrawnCard();
        engine.confirmPassDevice();
      }
      expect(engine.getState().firstRoundCompleted).toBe(true);
      expect(engine.getState().currentPlayerIndex).toBe(0);

      engine.declareVictory();
      expect(engine.getState().gameOver).toBe(true);
      expect(engine.getState().endReason).toBe('DECLARED_VICTORY');
      expect(engine.getState().declaringPlayerId).toBe('player-1');
    });
  });

  describe('D. Replacement and discard', () => {
    let engine: GameEngine;

    beforeEach(() => {
      engine = new GameEngine({ playerNames: ['Alice', 'Bob'] });
      // Alice & Bob memorization
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
    });

    it('replaces a card putting drawn card into hand and replaced card into discard pile', () => {
      const drawnCard = engine.drawCard();
      const aliceInitialCard0 = engine.getCurrentPlayer().cards[0];

      const replaced = engine.replaceCard(0);
      expect(replaced.id).toBe(aliceInitialCard0.id);

      // Hand position 0 now has drawnCard
      const state = engine.getState();
      expect(state.players[0].cards[0].id).toBe(drawnCard.id);
      expect(state.discardPile[state.discardPile.length - 1].id).toBe(aliceInitialCard0.id);
    });

    it('discards drawn card directly without modifying player hand', () => {
      const drawnCard = engine.drawCard();
      const aliceHandBefore = [...engine.getCurrentPlayer().cards];

      engine.discardDrawnCard();
      const state = engine.getState();
      expect(state.discardPile[state.discardPile.length - 1].id).toBe(drawnCard.id);
      expect(state.players[0].cards.map((c) => c.id)).toEqual(aliceHandBefore.map((c) => c.id));
    });
  });

  describe('E. Special abilities (7, 8, Jack)', () => {
    let engine: GameEngine;

    beforeEach(() => {
      engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
    });

    it('allows 7 to reveal own card privately and then discards 7 without changing hand size', () => {
      // Force drawn card to be a 7
      const sevenCard: Card = { id: 'test-7', rank: '7', suit: 'HEARTS', pointValue: 7 };
      const state = engine.getState();
      state.drawPile.unshift(sevenCard);
      engine.loadState(state);

      engine.drawCard();
      engine.startAbility7();
      const peeked = engine.executeAbility7(2);
      expect(peeked.id).toBe(engine.getCurrentPlayer().cards[2].id);

      engine.finishAbility7();
      const afterState = engine.getState();
      expect(afterState.discardPile[afterState.discardPile.length - 1].id).toBe('test-7');
      expect(afterState.players[0].cards.length).toBe(6);
    });

    it('allows 8 to reveal an opponent card privately and then discards 8 without changing hand size', () => {
      const eightCard: Card = { id: 'test-8', rank: '8', suit: 'DIAMONDS', pointValue: 8 };
      const state = engine.getState();
      state.drawPile.unshift(eightCard);
      engine.loadState(state);

      engine.drawCard();
      engine.startAbility8();

      // P1 peeks P2's card at index 3
      const peeked = engine.executeAbility8('player-2', 3);
      expect(peeked.id).toBe(state.players[1].cards[3].id);

      engine.finishAbility8();
      const afterState = engine.getState();
      expect(afterState.discardPile[afterState.discardPile.length - 1].id).toBe('test-8');
      expect(afterState.players[1].cards.length).toBe(6);
    });

    it('allows Jack to exchange 1 own card with 1 opponent card blind and discards Jack', () => {
      const jackCard: Card = { id: 'test-J', rank: 'J', suit: 'CLUBS', pointValue: 40 };
      const state = engine.getState();
      state.drawPile.unshift(jackCard);
      engine.loadState(state);

      const p1OriginalCard2 = state.players[0].cards[2];
      const p2OriginalCard4 = state.players[1].cards[4];

      engine.drawCard();
      engine.startAbilityJack();
      engine.setJackSelection(2, 'player-2', 4);
      engine.executeJackExchange();

      const afterState = engine.getState();
      expect(afterState.players[0].cards[2].id).toBe(p2OriginalCard4.id);
      expect(afterState.players[1].cards[4].id).toBe(p1OriginalCard2.id);
      expect(afterState.discardPile[afterState.discardPile.length - 1].id).toBe('test-J');
      expect(afterState.players[0].cards.length).toBe(6);
      expect(afterState.players[1].cards.length).toBe(6);
    });
  });

  describe('F. Elimination & Penalty', () => {
    let engine: GameEngine;

    beforeEach(() => {
      engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
    });

    it('successfully eliminates single matching card and permanently removes it', () => {
      const state = engine.getState();
      // Setup top discard as 5 of Spades (5 pts)
      state.discardPile.push({ id: 'd-5', rank: '5', suit: 'SPADES', pointValue: 5 });
      // Set P1 card 0 as 5 of Hearts (5 pts)
      state.players[0].cards[0] = { id: 'p1-5', rank: '5', suit: 'HEARTS', pointValue: 5 };
      engine.loadState(state);

      engine.startElimination();
      const result = engine.attemptElimination([0]);
      expect(result.success).toBe(true);
      expect(result.eliminatedCount).toBe(1);

      const afterState = engine.getState();
      expect(afterState.players[0].cards.length).toBe(5);
      expect(afterState.eliminatedCards.some((c) => c.id === 'p1-5')).toBe(true);
      expect(afterState.discardPile.some((c) => c.id === 'p1-5')).toBe(false);
      expect(afterState.drawPile.some((c) => c.id === 'p1-5')).toBe(false);
    });

    it('successfully eliminates multiple matching cards in one attempt (all-or-nothing test)', () => {
      const state = engine.getState();
      // Discard is Queen of Spades (10 pts)
      state.discardPile.push({ id: 'd-Q', rank: 'Q', suit: 'SPADES', pointValue: 10 });
      // P1 has 10 of Clubs (10 pts) at index 0 and Queen of Diamonds (10 pts) at index 2
      state.players[0].cards[0] = { id: 'p1-10', rank: '10', suit: 'CLUBS', pointValue: 10 };
      state.players[0].cards[2] = { id: 'p1-Q', rank: 'Q', suit: 'DIAMONDS', pointValue: 10 };
      engine.loadState(state);

      engine.startElimination();
      const result = engine.attemptElimination([0, 2]);
      expect(result.success).toBe(true);
      expect(result.eliminatedCount).toBe(2);

      const afterState = engine.getState();
      expect(afterState.players[0].cards.length).toBe(4);
      expect(afterState.eliminatedCards.some((c) => c.id === 'p1-10')).toBe(true);
      expect(afterState.eliminatedCards.some((c) => c.id === 'p1-Q')).toBe(true);
    });

    it('applies penalty card when multi-card elimination fails all-or-nothing', () => {
      const state = engine.getState();
      // Discard is 5 of Spades (5 pts)
      state.discardPile.push({ id: 'd-5', rank: '5', suit: 'SPADES', pointValue: 5 });
      // P1 has 5 at index 0 and King (0 pts) at index 1
      state.players[0].cards[0] = { id: 'p1-5', rank: '5', suit: 'HEARTS', pointValue: 5 };
      state.players[0].cards[1] = { id: 'p1-K', rank: 'K', suit: 'CLUBS', pointValue: 0 };
      engine.loadState(state);

      engine.startElimination();
      const result = engine.attemptElimination([0, 1]);
      expect(result.success).toBe(false);
      expect(result.eliminatedCount).toBe(0);

      const afterState = engine.getState();
      // Neither card was eliminated!
      expect(afterState.eliminatedCards.length).toBe(0);
      // Hand increased by 1 penalty card (6 + 1 = 7)
      expect(afterState.players[0].cards.length).toBe(7);
      expect(afterState.currentPhase).toBe('PENALTY_NOTICE');

      engine.acknowledgePenalty();
      expect(engine.getState().currentPhase).toBe('PASS_DEVICE');
    });

    it('triggers immediate automatic victory when player eliminates their last card', () => {
      const state = engine.getState();
      state.discardPile.push({ id: 'd-K', rank: 'K', suit: 'SPADES', pointValue: 0 });
      // Give P1 only 1 card (King)
      state.players[0].cards = [{ id: 'p1-last', rank: 'K', suit: 'HEARTS', pointValue: 0 }];
      engine.loadState(state);

      engine.startElimination();
      const result = engine.attemptElimination([0]);
      expect(result.success).toBe(true);

      const afterState = engine.getState();
      expect(afterState.gameOver).toBe(true);
      expect(afterState.endReason).toBe('ZERO_CARD_AUTOMATIC_VICTORY');
      expect(afterState.winnerIds).toEqual(['player-1']);
    });
  });

  describe('G. End conditions and scores', () => {
    it('determines winner with lowest total score when victory is declared', () => {
      const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      // Complete memorization
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();

      // Complete round 1
      engine.drawCard();
      engine.discardDrawnCard();
      engine.confirmPassDevice();
      engine.drawCard();
      engine.discardDrawnCard();
      engine.confirmPassDevice();

      // In Round 2, set known hands:
      // P1 has cards with total = 20
      // P2 has cards with total = 5
      const state = engine.getState();
      state.players[0].cards = [
        { id: '1', rank: '10', suit: 'HEARTS', pointValue: 10 },
        { id: '2', rank: '10', suit: 'SPADES', pointValue: 10 },
      ];
      state.players[1].cards = [
        { id: '3', rank: '2', suit: 'HEARTS', pointValue: 2 },
        { id: '4', rank: '3', suit: 'SPADES', pointValue: 3 },
      ];
      engine.loadState(state);

      // P1 declares victory, but P2 has the lower score!
      engine.declareVictory();
      const endState = engine.getState();
      expect(endState.gameOver).toBe(true);
      expect(endState.declaringPlayerId).toBe('player-1');
      // P2 wins because 5 < 20!
      expect(endState.winnerIds).toEqual(['player-2']);
    });

    it('declares a draw when two players have identical lowest totals', () => {
      const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();

      const state = engine.getState();
      state.firstRoundCompleted = true;
      state.players[0].cards = [{ id: '1', rank: '5', suit: 'HEARTS', pointValue: 5 }];
      state.players[1].cards = [{ id: '2', rank: '5', suit: 'SPADES', pointValue: 5 }];
      engine.loadState(state);

      engine.declareVictory();
      const endState = engine.getState();
      expect(endState.winnerIds.length).toBe(2);
      expect(endState.winnerIds).toContain('player-1');
      expect(endState.winnerIds).toContain('player-2');
    });

    it('ends immediately without reshuffling when draw pile becomes empty', () => {
      const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();

      const state = engine.getState();
      state.drawPile = []; // Draw pile empty!
      state.discardPile = [{ id: 'disc-1', rank: '7', suit: 'HEARTS', pointValue: 7 }];
      engine.loadState(state);

      expect(() => engine.drawCard()).toThrow('Draw pile is empty');
      const endState = engine.getState();
      expect(endState.gameOver).toBe(true);
      expect(endState.endReason).toBe('DRAW_PILE_EMPTY');
    });

    it('ends immediately when penalty card is required but draw pile is empty', () => {
      const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();

      const state = engine.getState();
      state.drawPile = []; // Empty draw pile
      state.discardPile = [{ id: 'disc-5', rank: '5', suit: 'HEARTS', pointValue: 5 }];
      state.players[0].cards[0] = { id: 'p1-K', rank: 'K', suit: 'CLUBS', pointValue: 0 };
      engine.loadState(state);

      engine.startElimination();
      const res = engine.attemptElimination([0]);
      expect(res.success).toBe(false);

      const endState = engine.getState();
      expect(endState.gameOver).toBe(true);
      expect(endState.endReason).toBe('DRAW_PILE_EMPTY');
    });
  });

  describe('H. Edge cases & action safeguards', () => {
    it('prevents actions after game over', () => {
      const engine = new GameEngine({ playerNames: ['P1', 'P2'] });
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();
      engine.memorizeCards([0, 1]);
      engine.completeMemorizationForPlayer();
      engine.confirmPassDevice();

      const state = engine.getState();
      state.firstRoundCompleted = true;
      engine.loadState(state);

      engine.declareVictory();
      expect(engine.getState().gameOver).toBe(true);

      expect(() => engine.drawCard()).toThrow('Game is already over');
      expect(() => engine.startElimination()).toThrow('Game is already over');
      expect(() => engine.declareVictory()).toThrow('Game is already over');
    });

    it('correctly calculates scores with variety of high, low, and zero cards', () => {
      const hand: Card[] = [
        { id: '1', rank: 'K', suit: 'HEARTS', pointValue: 0 },
        { id: '2', rank: 'A', suit: 'DIAMONDS', pointValue: 1 },
        { id: '3', rank: '10', suit: 'CLUBS', pointValue: 10 },
        { id: '4', rank: 'Q', suit: 'SPADES', pointValue: 10 },
        { id: '5', rank: 'J', suit: 'HEARTS', pointValue: 40 },
        { id: '6', rank: '7', suit: 'DIAMONDS', pointValue: 7 },
      ];
      // 0 + 1 + 10 + 10 + 40 + 7 = 68
      expect(calculateHandScore(hand)).toBe(68);
    });
  });
});
