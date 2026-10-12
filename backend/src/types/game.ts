import type { Card } from './card';

export interface Player {
  id: string;
  displayName: string;
  /** Ordered list of card instances currently in the player's hand */
  cards: Card[];
  hasTakenFirstTurn: boolean;
  /** For initial memorization tracking */
  memorizedCardIndices: number[];
  /** Track failed elimination attempts (reaches 6 = instant loss) */
  incorrectEliminationCount: number;
}

export type GamePhase =
  | 'SETUP'
  | 'INITIAL_MEMORIZATION'
  | 'PASS_DEVICE'
  | 'TURN_START'
  | 'CARD_DRAWN'
  | 'SELECT_REPLACEMENT'
  | 'SPECIAL_ABILITY_7'
  | 'SPECIAL_ABILITY_8'
  | 'SPECIAL_ABILITY_JACK'
  | 'SELECT_ELIMINATION'
  | 'PENALTY_NOTICE'
  | 'GAME_OVER';

export type EndReason =
  | 'DECLARED_VICTORY'
  | 'DRAW_PILE_EMPTY'
  | 'ZERO_CARD_AUTOMATIC_VICTORY'
  | 'SIX_WRONG_ATTEMPTS';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  text: string;
  playerId?: string;
  type: 'DEAL' | 'TURN' | 'DRAW' | 'REPLACE' | 'DISCARD' | 'ABILITY' | 'ELIMINATION' | 'PENALTY' | 'END';
}

export interface PendingPenalty {
  playerId: string;
  penaltyCard: Card;
  attemptedPositions: number[];
  targetPointValue: number;
}

export interface JackHighlightState {
  ownPlayerId: string;
  ownCardIndex: number;
  opponentPlayerId: string;
  opponentCardIndex: number;
  activeUntil: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  roundNumber: number;
  firstRoundCompleted: boolean;
  drawPile: Card[];
  discardPile: Card[];
  eliminatedCards: Card[];
  currentPhase: GamePhase;
  
  /** Card currently drawn on turn */
  pendingDrawnCard: Card | null;

  /** Memorization player tracking during initial setup phase */
  initialMemorizationPlayerIndex: number;

  /** Temporary revealed card for 7/8 ability or memorization */
  peekedCard: {
    card: Card;
    targetPlayerId: string;
    cardIndex: number;
  } | null;

  /** Jack exchange state */
  jackSelection: {
    ownCardIndex: number | null;
    opponentPlayerId: string | null;
    opponentCardIndex: number | null;
  } | null;

  /** Temporary visual indication of Jack card exchange positions (5 to 6 seconds) */
  jackHighlight: JackHighlightState | null;

  /** Penalty state to show to player */
  pendingPenalty: PendingPenalty | null;

  /** Selected positions for multi-card elimination */
  selectedEliminationIndices: number[];

  /** Victory and game over states */
  gameOver: boolean;
  endReason: EndReason | null;
  winnerIds: string[];
  declaringPlayerId: string | null;

  /** Public action log */
  actionHistory: ActionLogEntry[];
}

export interface GameConfig {
  playerNames: string[];
  firstPlayerIndex?: number;
  mode?: 'system' | 'multiplayer' | 'pass_and_play';
}
