import type { Card } from '../types/card';
import type {
  ActionLogEntry,
  EndReason,
  GameConfig,
  GameState,
  Player,
} from '../types/game';
import { createDecks, getRequiredDeckCount, shuffleCards } from './deck';
import { calculateHandScore } from './scoring';

/**
 * Creates an action log entry with a unique ID and timestamp.
 */
function createLogEntry(
  text: string,
  type: ActionLogEntry['type'],
  playerId?: string
): ActionLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    text,
    type,
    playerId,
  };
}

export class GameEngine {
  private state: GameState;
  private rng: () => number;

  constructor(config?: GameConfig, rng: () => number = Math.random) {
    this.rng = rng;
    if (config) {
      this.state = this.initializeGame(config);
    } else {
      this.state = this.createDefaultEmptyState();
    }
  }

  private createDefaultEmptyState(): GameState {
    return {
      players: [],
      currentPlayerIndex: 0,
      roundNumber: 1,
      firstRoundCompleted: false,
      drawPile: [],
      discardPile: [],
      eliminatedCards: [],
      currentPhase: 'SETUP',
      pendingDrawnCard: null,
      initialMemorizationPlayerIndex: 0,
      peekedCard: null,
      jackSelection: null,
      jackHighlight: null,
      pendingPenalty: null,
      selectedEliminationIndices: [],
      gameOver: false,
      endReason: null,
      winnerIds: [],
      declaringPlayerId: null,
      actionHistory: [],
    };
  }

  /**
   * Resets the engine back to its default clean setup state.
   */
  public reset(): GameState {
    this.state = this.createDefaultEmptyState();
    return this.state;
  }

  /**
   * Initializes a new game with the given configuration.
   */
  public initializeGame(config: GameConfig): GameState {
    const { playerNames, firstPlayerIndex } = config;
    const playerCount = playerNames.length;

    if (playerCount < 2 || playerCount > 6) {
      throw new Error(`Invalid player count: ${playerCount}. Must be between 2 and 6.`);
    }

    const deckCount = getRequiredDeckCount(playerCount);
    const allCards = createDecks(deckCount);
    const shuffledCards = shuffleCards(allCards, this.rng);

    const players: Player[] = [];
    let cardIndex = 0;

    for (let i = 0; i < playerCount; i++) {
      const name = playerNames[i]?.trim() || `Player ${i + 1}`;
      const hand = shuffledCards.slice(cardIndex, cardIndex + 6);
      cardIndex += 6;

      players.push({
        id: `player-${i + 1}`,
        displayName: name,
        cards: hand,
        hasTakenFirstTurn: false,
        memorizedCardIndices: [],
        incorrectEliminationCount: 0,
      });
    }

    const drawPile = shuffledCards.slice(cardIndex);
    const discardPile: Card[] = [];
    const eliminatedCards: Card[] = [];

    const startPlayerIdx = firstPlayerIndex !== undefined && firstPlayerIndex >= 0 && firstPlayerIndex < playerCount
      ? firstPlayerIndex
      : 0;

    const initialState: GameState = {
      players,
      currentPlayerIndex: startPlayerIdx,
      roundNumber: 1,
      firstRoundCompleted: false,
      drawPile,
      discardPile,
      eliminatedCards,
      currentPhase: 'INITIAL_MEMORIZATION',
      pendingDrawnCard: null,
      initialMemorizationPlayerIndex: 0,
      peekedCard: null,
      jackSelection: null,
      jackHighlight: null,
      pendingPenalty: null,
      selectedEliminationIndices: [],
      gameOver: false,
      endReason: null,
      winnerIds: [],
      declaringPlayerId: null,
      actionHistory: [
        createLogEntry(
          `Game started with ${playerCount} players (${deckCount} deck${deckCount > 1 ? 's' : ''}, ${allCards.length} cards).`,
          'DEAL'
        ),
        createLogEntry(
          `Dealt 6 cards to each player. Initial memorization begins.`,
          'DEAL'
        ),
      ],
    };

    this.state = initialState;
    return this.getState();
  }

  /**
   * Returns a deep clone of the current game state to prevent accidental external mutations.
   */
  public getState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Directly sets the engine state (useful for test fixtures or restoring persistence).
   */
  public loadState(state: GameState): void {
    this.state = JSON.parse(JSON.stringify(state));
  }

  /**
   * Get active player.
   */
  public getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  /**
   * Initial memorization: Player selects exactly 2 of their own cards to reveal.
   */
  public memorizeCards(selectedIndices: number[]): Card[] {
    if (this.state.currentPhase !== 'INITIAL_MEMORIZATION') {
      throw new Error(`Cannot memorize cards during phase: ${this.state.currentPhase}`);
    }

    const playerIndex = this.state.initialMemorizationPlayerIndex;
    const player = this.state.players[playerIndex];

    if (!selectedIndices || selectedIndices.length !== 2) {
      throw new Error('Must select exactly two card positions to memorize.');
    }

    if (
      selectedIndices[0] < 0 ||
      selectedIndices[0] >= player.cards.length ||
      selectedIndices[1] < 0 ||
      selectedIndices[1] >= player.cards.length ||
      selectedIndices[0] === selectedIndices[1]
    ) {
      throw new Error('Invalid card indices for memorization.');
    }

    player.memorizedCardIndices = [...selectedIndices];

    return [player.cards[selectedIndices[0]], player.cards[selectedIndices[1]]];
  }

  /**
   * Player finishes memorizing their two cards and passes to next player.
   */
  public completeMemorizationForPlayer(): void {
    if (this.state.currentPhase !== 'INITIAL_MEMORIZATION') {
      throw new Error(`Cannot complete memorization during phase: ${this.state.currentPhase}`);
    }

    const playerIndex = this.state.initialMemorizationPlayerIndex;
    const player = this.state.players[playerIndex];

    if (player.memorizedCardIndices.length !== 2) {
      throw new Error('Player must memorize two cards before proceeding.');
    }

    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} memorized two initial cards.`, 'DEAL', player.id)
    );

    const nextIndex = playerIndex + 1;
    if (nextIndex < this.state.players.length) {
      this.state.initialMemorizationPlayerIndex = nextIndex;
      this.state.currentPhase = 'PASS_DEVICE';
    } else {
      // All players have memorized their cards; start the game!
      this.state.currentPhase = 'PASS_DEVICE';
      this.state.initialMemorizationPlayerIndex = -1;
      this.state.currentPlayerIndex = 0;
      this.state.actionHistory.push(
        createLogEntry(`Initial memorization completed. Round 1 begins!`, 'TURN')
      );
    }
  }

  /**
   * Handoff / Pass-the-device screen confirmation by the next player.
   */
  public confirmPassDevice(): void {
    if (this.state.currentPhase !== 'PASS_DEVICE') {
      throw new Error('Not currently in pass-the-device phase.');
    }

    if (this.state.initialMemorizationPlayerIndex >= 0) {
      // Still in setup memorization for next player
      this.state.currentPhase = 'INITIAL_MEMORIZATION';
    } else {
      // Normal gameplay turn
      this.state.currentPhase = 'TURN_START';
    }
  }

  /**
   * Declare victory: Only allowed on player's own turn after first round is complete.
   */
  public declareVictory(): void {
    if (this.state.gameOver) {
      throw new Error('Game is already over.');
    }

    if (this.state.currentPhase !== 'TURN_START') {
      throw new Error(`Cannot declare victory during phase: ${this.state.currentPhase}`);
    }

    if (!this.state.firstRoundCompleted) {
      throw new Error('Cannot declare victory during the first round.');
    }

    const player = this.getCurrentPlayer();
    this.state.declaringPlayerId = player.id;
    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} declared victory!`, 'END', player.id)
    );

    this.endGame('DECLARED_VICTORY');
  }

  /**
   * Draw top card from draw pile on player's turn.
   */
  public drawCard(): Card {
    if (this.state.gameOver) {
      throw new Error('Game is already over.');
    }

    if (this.state.currentPhase !== 'TURN_START') {
      throw new Error(`Cannot draw a card during phase: ${this.state.currentPhase}`);
    }

    if (this.state.drawPile.length === 0) {
      // Empty draw pile ends the game immediately
      this.state.actionHistory.push(
        createLogEntry('Draw pile is empty! Game ends immediately.', 'END')
      );
      this.endGame('DRAW_PILE_EMPTY');
      throw new Error('Draw pile is empty. Game ended.');
    }

    const drawnCard = this.state.drawPile.shift()!;
    this.state.pendingDrawnCard = drawnCard;
    this.state.currentPhase = 'CARD_DRAWN';

    const player = this.getCurrentPlayer();
    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} drew a card.`, 'DRAW', player.id)
    );

    return drawnCard;
  }

  /**
   * Replace one of player's cards with the drawn card.
   */
  public replaceCard(positionIndex: number): Card {
    if (this.state.gameOver) {
      throw new Error('Game is already over.');
    }

    if (this.state.currentPhase !== 'CARD_DRAWN' && this.state.currentPhase !== 'SELECT_REPLACEMENT') {
      throw new Error(`Cannot replace card during phase: ${this.state.currentPhase}`);
    }

    if (!this.state.pendingDrawnCard) {
      throw new Error('No drawn card to replace with.');
    }

    const player = this.getCurrentPlayer();
    if (positionIndex < 0 || positionIndex >= player.cards.length) {
      throw new Error(`Invalid card position: ${positionIndex}`);
    }

    const replacedCard = player.cards[positionIndex];
    player.cards[positionIndex] = this.state.pendingDrawnCard;
    this.state.discardPile.push(replacedCard);
    this.state.pendingDrawnCard = null;

    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} replaced a card.`, 'REPLACE', player.id)
    );

    this.advanceTurn();
    return replacedCard;
  }

  /**
   * Replace one of player's cards directly with the top card of the discard pile.
   */
  public replaceCardFromDiscard(positionIndex: number): { takenCard: Card; replacedCard: Card } {
    if (this.state.gameOver) {
      throw new Error('Game is already over.');
    }

    if (this.state.currentPhase !== 'TURN_START') {
      throw new Error(`Cannot replace card from discard during phase: ${this.state.currentPhase}`);
    }

    if (this.state.discardPile.length === 0) {
      throw new Error('Discard pile is empty.');
    }

    const player = this.getCurrentPlayer();
    if (positionIndex < 0 || positionIndex >= player.cards.length) {
      throw new Error(`Invalid card position: ${positionIndex}`);
    }

    const takenCard = this.state.discardPile.pop()!;
    const replacedCard = player.cards[positionIndex];
    player.cards[positionIndex] = takenCard;
    this.state.discardPile.push(replacedCard);

    this.state.actionHistory.push(
      createLogEntry(
        `${player.displayName} replaced card at position ${positionIndex + 1} with ${takenCard.rank} from discard pile.`,
        'REPLACE',
        player.id
      )
    );

    this.advanceTurn();
    return { takenCard, replacedCard };
  }

  /**
   * Discard the drawn card without replacing.
   */
  public discardDrawnCard(): void {
    if (this.state.gameOver) {
      throw new Error('Game is already over.');
    }

    if (this.state.currentPhase !== 'CARD_DRAWN') {
      throw new Error(`Cannot discard drawn card during phase: ${this.state.currentPhase}`);
    }

    if (!this.state.pendingDrawnCard) {
      throw new Error('No drawn card to discard.');
    }

    const player = this.getCurrentPlayer();
    this.state.discardPile.push(this.state.pendingDrawnCard);
    this.state.pendingDrawnCard = null;

    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} discarded the drawn card.`, 'DISCARD', player.id)
    );

    this.advanceTurn();
  }

  /**
   * Select special ability for drawn 7: reveal one of active player's own cards.
   */
  public startAbility7(): void {
    if (this.state.gameOver) throw new Error('Game is already over.');
    if (this.state.currentPhase !== 'CARD_DRAWN') throw new Error('Cannot use ability now.');
    if (!this.state.pendingDrawnCard || this.state.pendingDrawnCard.rank !== '7') {
      throw new Error('Drawn card is not a 7.');
    }
    this.state.currentPhase = 'SPECIAL_ABILITY_7';
  }

  /**
   * Execute ability 7 on active player's card at positionIndex.
   */
  public executeAbility7(positionIndex: number): Card {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_7') {
      throw new Error('Not in Special Ability 7 phase.');
    }

    const player = this.getCurrentPlayer();
    if (positionIndex < 0 || positionIndex >= player.cards.length) {
      throw new Error(`Invalid card position: ${positionIndex}`);
    }

    const targetCard = player.cards[positionIndex];
    this.state.peekedCard = {
      card: targetCard,
      targetPlayerId: player.id,
      cardIndex: positionIndex,
    };

    return targetCard;
  }

  /**
   * Finish ability 7: Active player has viewed their own card; discard 7 and advance turn.
   */
  public finishAbility7(): void {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_7' || !this.state.peekedCard) {
      throw new Error('Cannot finish ability 7 without peeking.');
    }

    const player = this.getCurrentPlayer();
    this.state.discardPile.push(this.state.pendingDrawnCard!);
    this.state.pendingDrawnCard = null;
    this.state.peekedCard = null;

    this.state.actionHistory.push(
      createLogEntry(`${player.displayName} used the 7 ability to view a card.`, 'ABILITY', player.id)
    );

    this.advanceTurn();
  }

  /**
   * Select special ability for drawn 8: reveal an opponent's card.
   */
  public startAbility8(): void {
    if (this.state.gameOver) throw new Error('Game is already over.');
    if (this.state.currentPhase !== 'CARD_DRAWN') throw new Error('Cannot use ability now.');
    if (!this.state.pendingDrawnCard || this.state.pendingDrawnCard.rank !== '8') {
      throw new Error('Drawn card is not an 8.');
    }
    this.state.currentPhase = 'SPECIAL_ABILITY_8';
  }

  /**
   * Execute ability 8 on target opponent's card.
   */
  public executeAbility8(opponentPlayerId: string, cardIndex: number): Card {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_8') {
      throw new Error('Not in Special Ability 8 phase.');
    }

    const activePlayer = this.getCurrentPlayer();
    if (opponentPlayerId === activePlayer.id) {
      throw new Error('Must select an opponent, not oneself.');
    }

    const opponent = this.state.players.find((p) => p.id === opponentPlayerId);
    if (!opponent) {
      throw new Error('Opponent not found.');
    }

    if (cardIndex < 0 || cardIndex >= opponent.cards.length) {
      throw new Error(`Invalid card index: ${cardIndex}`);
    }

    const targetCard = opponent.cards[cardIndex];
    this.state.peekedCard = {
      card: targetCard,
      targetPlayerId: opponent.id,
      cardIndex,
    };

    return targetCard;
  }

  /**
   * Finish ability 8: Active player has viewed opponent's card; discard 8 and advance turn.
   */
  public finishAbility8(): void {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_8' || !this.state.peekedCard) {
      throw new Error('Cannot finish ability 8 without peeking.');
    }

    const player = this.getCurrentPlayer();
    const opponent = this.state.players.find((p) => p.id === this.state.peekedCard?.targetPlayerId);

    this.state.discardPile.push(this.state.pendingDrawnCard!);
    this.state.pendingDrawnCard = null;
    this.state.peekedCard = null;

    this.state.actionHistory.push(
      createLogEntry(
        `${player.displayName} used the 8 ability to view a card of ${opponent?.displayName || 'an opponent'}.`,
        'ABILITY',
        player.id
      )
    );

    this.advanceTurn();
  }

  /**
   * Select special ability for drawn Jack: exchange 1 own card with 1 opponent card blind.
   */
  public startAbilityJack(): void {
    if (this.state.gameOver) throw new Error('Game is already over.');
    if (this.state.currentPhase !== 'CARD_DRAWN') throw new Error('Cannot use ability now.');
    if (!this.state.pendingDrawnCard || this.state.pendingDrawnCard.rank !== 'J') {
      throw new Error('Drawn card is not a Jack.');
    }
    this.state.currentPhase = 'SPECIAL_ABILITY_JACK';
    this.state.jackSelection = {
      ownCardIndex: null,
      opponentPlayerId: null,
      opponentCardIndex: null,
    };
  }

  /**
   * Set Jack exchange selection.
   */
  public setJackSelection(
    ownCardIndex: number,
    opponentPlayerId: string,
    opponentCardIndex: number
  ): void {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_JACK') {
      throw new Error('Not in Special Ability Jack phase.');
    }

    const activePlayer = this.getCurrentPlayer();
    if (opponentPlayerId === activePlayer.id) {
      throw new Error('Must select an opponent, not oneself.');
    }

    const opponent = this.state.players.find((p) => p.id === opponentPlayerId);
    if (!opponent) throw new Error('Opponent not found.');

    if (ownCardIndex < 0 || ownCardIndex >= activePlayer.cards.length) {
      throw new Error(`Invalid own card index: ${ownCardIndex}`);
    }

    if (opponentCardIndex < 0 || opponentCardIndex >= opponent.cards.length) {
      throw new Error(`Invalid opponent card index: ${opponentCardIndex}`);
    }

    this.state.jackSelection = {
      ownCardIndex,
      opponentPlayerId,
      opponentCardIndex,
    };
  }

  /**
   * Execute Jack exchange without revealing either card.
   */
  public executeJackExchange(): void {
    if (this.state.currentPhase !== 'SPECIAL_ABILITY_JACK') {
      throw new Error('Not in Special Ability Jack phase.');
    }

    const sel = this.state.jackSelection;
    if (
      !sel ||
      sel.ownCardIndex === null ||
      sel.opponentPlayerId === null ||
      sel.opponentCardIndex === null
    ) {
      throw new Error('Jack exchange selection is incomplete.');
    }

    const activePlayer = this.getCurrentPlayer();
    const opponent = this.state.players.find((p) => p.id === sel.opponentPlayerId);
    if (!opponent) throw new Error('Opponent not found.');

    // Swap the cards
    const myCard = activePlayer.cards[sel.ownCardIndex];
    const oppCard = opponent.cards[sel.opponentCardIndex];

    activePlayer.cards[sel.ownCardIndex] = oppCard;
    opponent.cards[sel.opponentCardIndex] = myCard;

    // Discard the Jack
    this.state.discardPile.push(this.state.pendingDrawnCard!);
    this.state.pendingDrawnCard = null;
    this.state.jackSelection = null;

    // Temporary visual indication of Jack card exchange positions (5 to 6 seconds)
    this.state.jackHighlight = {
      ownPlayerId: activePlayer.id,
      ownCardIndex: sel.ownCardIndex,
      opponentPlayerId: opponent.id,
      opponentCardIndex: sel.opponentCardIndex,
      activeUntil: Date.now() + 5500,
    };

    this.state.actionHistory.push(
      createLogEntry(
        `${activePlayer.displayName} used the Jack ability to exchange a card with ${opponent.displayName}.`,
        'ABILITY',
        activePlayer.id
      )
    );

    this.advanceTurn();
  }

  /**
   * Clears the Jack visual highlight.
   */
  public clearJackHighlight(): void {
    this.state.jackHighlight = null;
  }

  /**
   * Enter matching elimination selection phase on player's turn.
   */
  public startElimination(): void {
    if (this.state.gameOver) throw new Error('Game is already over.');
    if (this.state.currentPhase === 'SELECT_ELIMINATION') {
      return;
    }
    if (this.state.currentPhase !== 'TURN_START') {
      throw new Error(`Cannot start elimination during phase: ${this.state.currentPhase}`);
    }
    if (this.state.discardPile.length === 0) {
      throw new Error('Discard pile is empty. No card to match.');
    }
    this.state.currentPhase = 'SELECT_ELIMINATION';
    this.state.selectedEliminationIndices = [];
  }

  /**
   * Cancel elimination selection and return to TURN_START.
   */
  public cancelElimination(): void {
    if (this.state.currentPhase !== 'SELECT_ELIMINATION') {
      return;
    }
    this.state.currentPhase = 'TURN_START';
    this.state.selectedEliminationIndices = [];
  }

  /**
   * Attempt matching elimination with the selected card indices against top of discard pile.
   * All-or-nothing:
   * - If all match the top discard's rank or point value: all eliminated permanently.
   * - If ANY card does not match: none eliminated, 1 penalty card drawn, mistake counter +1.
   * - 6 incorrect attempts trigger automatic loss.
   */
  public attemptElimination(selectedIndices: number[]): {
    success: boolean;
    eliminatedCount: number;
    penaltyCard?: Card;
  } {
    if (this.state.gameOver) throw new Error('Game is already over.');
    if (this.state.currentPhase !== 'SELECT_ELIMINATION' && this.state.currentPhase !== 'TURN_START') {
      throw new Error(`Cannot attempt elimination during phase: ${this.state.currentPhase}`);
    }
    if (this.state.discardPile.length === 0) {
      throw new Error('Discard pile is empty.');
    }
    if (!selectedIndices || selectedIndices.length === 0) {
      throw new Error('Must select at least one card to eliminate.');
    }

    const player = this.getCurrentPlayer();
    const topDiscard = this.state.discardPile[this.state.discardPile.length - 1];
    const targetPointValue = topDiscard.pointValue;
    const targetRank = topDiscard.rank;

    // Validate indices
    const uniqueIndices = Array.from(new Set(selectedIndices)).sort((a, b) => a - b);
    for (const idx of uniqueIndices) {
      if (idx < 0 || idx >= player.cards.length) {
        throw new Error(`Invalid card index: ${idx}`);
      }
    }

    const selectedCards = uniqueIndices.map((idx) => player.cards[idx]);
    const allMatch = selectedCards.every(
      (card) => card.rank === targetRank || card.pointValue === targetPointValue
    );

    if (allMatch) {
      // SUCCESS!
      // Move all selected cards to permanently eliminated zone
      for (const card of selectedCards) {
        this.state.eliminatedCards.push(card);
      }

      // Remove from player's hand in descending index order
      const descIndices = [...uniqueIndices].sort((a, b) => b - a);
      for (const idx of descIndices) {
        player.cards.splice(idx, 1);
      }

      this.state.actionHistory.push(
        createLogEntry(
          `${player.displayName} successfully eliminated ${uniqueIndices.length} matching card(s)!`,
          'ELIMINATION',
          player.id
        )
      );

      // Check automatic zero-card victory
      if (player.cards.length === 0) {
        this.state.actionHistory.push(
          createLogEntry(
            `${player.displayName} has eliminated all cards! Automatic Victory!`,
            'END',
            player.id
          )
        );
        this.endGame('ZERO_CARD_AUTOMATIC_VICTORY', [player.id]);
        return { success: true, eliminatedCount: uniqueIndices.length };
      }

      this.advanceTurn();
      return { success: true, eliminatedCount: uniqueIndices.length };
    } else {
      // INCORRECT ELIMINATION PENALTY!
      player.incorrectEliminationCount += 1;

      // Check if draw pile is empty
      if (this.state.drawPile.length === 0) {
        this.state.actionHistory.push(
          createLogEntry(
            `${player.displayName} made an incorrect elimination attempt, but draw pile is empty! Game ends immediately.`,
            'END'
          )
        );
        this.endGame('DRAW_PILE_EMPTY');
        return { success: false, eliminatedCount: 0 };
      }

      // Draw 1 penalty card
      const penaltyCard = this.state.drawPile.shift()!;
      player.cards.push(penaltyCard);

      this.state.pendingPenalty = {
        playerId: player.id,
        penaltyCard,
        attemptedPositions: uniqueIndices,
        targetPointValue,
      };

      this.state.actionHistory.push(
        createLogEntry(
          `${player.displayName} made an incorrect elimination attempt (${player.incorrectEliminationCount}/6) and received 1 penalty card.`,
          'PENALTY',
          player.id
        )
      );

      // Check 6 incorrect attempts automatic loss
      if (player.incorrectEliminationCount >= 6) {
        const opponents = this.state.players.filter((p) => p.id !== player.id);
        const opponentIds = opponents.map((o) => o.id);
        const opponentNames = opponents.map((o) => o.displayName).join(', ');

        this.state.actionHistory.push(
          createLogEntry(
            `${player.displayName} reached 6 incorrect elimination attempts! Automatic defeat! ${opponentNames} wins!`,
            'END',
            player.id
          )
        );
        this.endGame('SIX_WRONG_ATTEMPTS', opponentIds);
        return { success: false, eliminatedCount: 0, penaltyCard };
      }

      this.state.currentPhase = 'PENALTY_NOTICE';
      return { success: false, eliminatedCount: 0, penaltyCard };
    }
  }

  /**
   * Player acknowledges incorrect elimination penalty notification.
   */
  public acknowledgePenalty(): void {
    if (this.state.currentPhase !== 'PENALTY_NOTICE') {
      throw new Error('Not currently in penalty notice phase.');
    }

    this.state.pendingPenalty = null;
    this.advanceTurn();
  }

  /**
   * Advance to the next player clockwise.
   */
  private advanceTurn(): void {
    if (this.state.gameOver) return;

    const currentPlayer = this.getCurrentPlayer();
    currentPlayer.hasTakenFirstTurn = true;

    // Check if a full round just completed (all players have taken at least one turn)
    if (!this.state.firstRoundCompleted && this.state.players.every((p) => p.hasTakenFirstTurn)) {
      this.state.firstRoundCompleted = true;
    }

    const nextPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    // Check if a full round just completed
    if (nextPlayerIndex === 0) {
      this.state.roundNumber += 1;
      this.state.actionHistory.push(
        createLogEntry(`Round ${this.state.roundNumber} begins.`, 'TURN')
      );
    }

    this.state.currentPlayerIndex = nextPlayerIndex;
    this.state.currentPhase = 'PASS_DEVICE';
    this.state.pendingDrawnCard = null;
    this.state.peekedCard = null;
    this.state.jackSelection = null;
    this.state.selectedEliminationIndices = [];
  }

  /**
   * Ends the game and calculates final results.
   */
  private endGame(reason: EndReason, specificWinnerIds?: string[]): void {
    this.state.gameOver = true;
    this.state.endReason = reason;
    this.state.currentPhase = 'GAME_OVER';

    if (
      (reason === 'ZERO_CARD_AUTOMATIC_VICTORY' || reason === 'SIX_WRONG_ATTEMPTS') &&
      specificWinnerIds
    ) {
      this.state.winnerIds = specificWinnerIds;
      return;
    }

    // Calculate final scores for all players
    const scores = this.state.players.map((p) => ({
      id: p.id,
      score: calculateHandScore(p.cards),
    }));

    const minScore = Math.min(...scores.map((s) => s.score));
    const tiedWinners = scores.filter((s) => s.score === minScore).map((s) => s.id);
    this.state.winnerIds = tiedWinners;

    const winnerNames = this.state.players
      .filter((p) => tiedWinners.includes(p.id))
      .map((p) => p.displayName)
      .join(', ');

    if (tiedWinners.length > 1) {
      this.state.actionHistory.push(
        createLogEntry(`Game Over! It's a draw between ${winnerNames} with ${minScore} points!`, 'END')
      );
    } else {
      this.state.actionHistory.push(
        createLogEntry(`Game Over! ${winnerNames} wins with ${minScore} points!`, 'END')
      );
    }
  }
}
