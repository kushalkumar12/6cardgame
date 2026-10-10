import { describe, it, expect } from 'vitest';
import { GameEngine } from '../gameEngine';
import { AIBot } from '../aiBot';
import { calculateHandScore } from '../scoring';

describe('Full Match Playthrough Simulation (Human vs AI)', () => {
  it('plays an entire match turn-by-turn until Human (Kushal) achieves victory', () => {
    const engine = new GameEngine({ playerNames: ['Kushal', 'System AI'] });
    const aiBot = new AIBot('player-2');

    const logs: string[] = [];
    logs.push('=== START OF SIX CARDS MATCH ===');
    logs.push('Mode: 1 (Play with System AI)');
    logs.push('Player 1: Kushal (Human)');
    logs.push('Player 2: System AI (Bot)');

    // 1. Initial Memorization Phase
    // Kushal memorizes positions 0 and 1
    const p1Memorized = engine.memorizeCards([0, 1]);
    logs.push(`[Setup] Kushal memorized cards at Position 1 (${p1Memorized[0].rank} of ${p1Memorized[0].suit}, ${p1Memorized[0].pointValue} pts) and Position 2 (${p1Memorized[1].rank} of ${p1Memorized[1].suit}, ${p1Memorized[1].pointValue} pts).`);
    engine.completeMemorizationForPlayer();
    engine.confirmPassDevice();

    // AI memorizes positions 0 and 1
    const aiIndices = aiBot.chooseInitialMemorization();
    const aiMemorized = engine.memorizeCards(aiIndices);
    aiBot.recordMemorizedCards(aiIndices, [aiMemorized[0], aiMemorized[1]]);
    logs.push(`[Setup] System AI memorized 2 cards.`);
    engine.completeMemorizationForPlayer();
    engine.confirmPassDevice();

    // Track human's known cards
    const humanKnownCards = new Map<number, typeof p1Memorized[0]>();
    humanKnownCards.set(0, p1Memorized[0]);
    humanKnownCards.set(1, p1Memorized[1]);

    let turnCount = 0;
    const maxTurns = 50;

    while (!engine.getState().gameOver && turnCount < maxTurns) {
      turnCount++;
      const state = engine.getState();
      const activeIdx = state.currentPlayerIndex;
      const isHumanTurn = activeIdx === 0;
      const round = state.roundNumber;

      logs.push(`\n--- Turn ${turnCount} | Round ${round} | ${isHumanTurn ? 'Kushal (Human)' : 'System AI (Bot)'} ---`);

      if (isHumanTurn) {
        // Kushal's Strategy:
        // 1. If round > 1 and human has low estimated score, check if we can declare victory!
        const currentHandScore = calculateHandScore(state.players[0].cards);
        const knownCount = humanKnownCards.size;

        const aiScore = calculateHandScore(state.players[1].cards);
        if (round >= 3 && currentHandScore <= aiScore) {
          logs.push(`[Turn ${turnCount}] Kushal declares victory! Current Hand: ${currentHandScore} pts vs AI: ${aiScore} pts.`);
          engine.declareVictory();
          break;
        }

        // 2. Check if top discard can be matched for elimination:
        const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
        let eliminated = false;

        if (topDiscard) {
          // Find matching known cards
          const matchIdx: number[] = [];
          for (const [idx, card] of humanKnownCards.entries()) {
            if (idx < state.players[0].cards.length && card.pointValue === topDiscard.pointValue) {
              matchIdx.push(idx);
            }
          }
          if (matchIdx.length > 0) {
            logs.push(`[Turn ${turnCount}] Kushal matches ${matchIdx.length} card(s) against Discard (${topDiscard.pointValue} pts) for elimination.`);
            engine.startElimination();
            const res = engine.attemptElimination(matchIdx);
            if (res.success) {
              logs.push(`[Turn ${turnCount}] Elimination SUCCESS! Removed ${res.eliminatedCount} card(s) permanently.`);
              matchIdx.forEach((i) => humanKnownCards.delete(i));
              eliminated = true;
            } else {
              engine.acknowledgePenalty();
            }
            engine.confirmPassDevice();
          }
        }

        if (eliminated) continue;

        // 3. Check if top discard is low (King=0, Ace=1, 2) to replace an unknown/high card:
        if (topDiscard && topDiscard.pointValue <= 3) {
          // Find worst known card or first unknown card
          let replaceIdx = -1;
          for (let i = 0; i < state.players[0].cards.length; i++) {
            const known = humanKnownCards.get(i);
            if (!known || known.pointValue > topDiscard.pointValue) {
              replaceIdx = i;
              break;
            }
          }

          if (replaceIdx !== -1) {
            logs.push(`[Turn ${turnCount}] Kushal uses "Replace the Card" taking ${topDiscard.rank} (${topDiscard.pointValue} pts) from Discard to replace Position ${replaceIdx + 1}.`);
            const { takenCard } = engine.replaceCardFromDiscard(replaceIdx);
            humanKnownCards.set(replaceIdx, takenCard);
            engine.confirmPassDevice();
            continue;
          }
        }

        // 4. Otherwise, draw a card from Draw Pile:
        const drawn = engine.drawCard();
        logs.push(`[Turn ${turnCount}] Kushal drew ${drawn.rank} of ${drawn.suit} (${drawn.pointValue} pts).`);

        if (drawn.rank === '7') {
          // Peek own unknown card
          const unknownIdx = state.players[0].cards.findIndex((_, i) => !humanKnownCards.has(i));
          if (unknownIdx !== -1) {
            engine.startAbility7();
            const peeked = engine.executeAbility7(unknownIdx);
            humanKnownCards.set(unknownIdx, peeked);
            logs.push(`[Turn ${turnCount}] Kushal used 7 ability to peek Position ${unknownIdx + 1}: ${peeked.rank} (${peeked.pointValue} pts).`);
            engine.finishAbility7();
            engine.confirmPassDevice();
            continue;
          }
        }

        // If drawn card is low point value, replace worst card:
        if (drawn.pointValue <= 4) {
          let replaceIdx = -1;
          for (let i = 0; i < state.players[0].cards.length; i++) {
            const known = humanKnownCards.get(i);
            if (!known || known.pointValue > drawn.pointValue) {
              replaceIdx = i;
              break;
            }
          }
          if (replaceIdx !== -1) {
            logs.push(`[Turn ${turnCount}] Kushal replaces Position ${replaceIdx + 1} with drawn ${drawn.rank} (${drawn.pointValue} pts).`);
            engine.replaceCard(replaceIdx);
            humanKnownCards.set(replaceIdx, drawn);
            engine.confirmPassDevice();
            continue;
          }
        }

        // Discard drawn card
        logs.push(`[Turn ${turnCount}] Kushal discarded the drawn ${drawn.rank}.`);
        engine.discardDrawnCard();
        engine.confirmPassDevice();
      } else {
        // System AI Turn
        const decision = aiBot.decideTurnStartAction(engine);
        if (decision === 'DECLARE_VICTORY') {
          logs.push(`[Turn ${turnCount}] System AI declared victory.`);
          engine.declareVictory();
          break;
        } else if (decision === 'ELIMINATE') {
          const matching = aiBot.getKnownMatchingIndices(engine);
          if (matching.length > 0) {
            engine.startElimination();
            const res = engine.attemptElimination(matching);
            if (res.success) {
              aiBot.onCardEliminated(matching);
              logs.push(`[Turn ${turnCount}] System AI successfully eliminated ${res.eliminatedCount} card(s).`);
            } else {
              engine.acknowledgePenalty();
            }
            engine.confirmPassDevice();
          } else {
            engine.drawCard();
          }
        } else if (decision === 'REPLACE_FROM_DISCARD') {
          const replaceIdx = aiBot.getBestDiscardReplacementIndex(engine);
          if (replaceIdx !== -1 && state.discardPile.length > 0) {
            const top = state.discardPile[state.discardPile.length - 1];
            engine.replaceCardFromDiscard(replaceIdx);
            aiBot.onCardReplacedFromDiscard(replaceIdx, top);
            logs.push(`[Turn ${turnCount}] System AI replaced card at Position ${replaceIdx + 1} with ${top.rank} from Discard.`);
            engine.confirmPassDevice();
          } else {
            engine.drawCard();
          }
        } else {
          // Draw card
          const drawn = engine.drawCard();
          logs.push(`[Turn ${turnCount}] System AI drew a card.`);
          const cardAction = aiBot.decideCardDrawnAction(drawn, engine);

          if (cardAction.action === 'REPLACE' && cardAction.replaceIndex !== undefined) {
            engine.replaceCard(cardAction.replaceIndex);
            logs.push(`[Turn ${turnCount}] System AI replaced Position ${cardAction.replaceIndex + 1} with drawn card.`);
            engine.confirmPassDevice();
          } else if (cardAction.action === 'USE_7' && cardAction.targetCardIndex !== undefined) {
            engine.startAbility7();
            engine.executeAbility7(cardAction.targetCardIndex);
            engine.finishAbility7();
            logs.push(`[Turn ${turnCount}] System AI used 7 ability.`);
            engine.confirmPassDevice();
          } else {
            engine.discardDrawnCard();
            logs.push(`[Turn ${turnCount}] System AI discarded drawn card.`);
            engine.confirmPassDevice();
          }
        }
      }
    }

    // If match reached round 5 and not declared yet, Kushal declares victory to conclude test
    if (!engine.getState().gameOver) {
      logs.push(`[Final] Kushal concludes match by declaring victory.`);
      engine.declareVictory();
    }

    const finalState = engine.getState();
    const p1Score = calculateHandScore(finalState.players[0].cards);
    const p2Score = calculateHandScore(finalState.players[1].cards);

    logs.push('\n=== MATCH RESULT & FINAL SCORES ===');
    logs.push(`Kushal Final Score: ${p1Score} pts`);
    logs.push(`System AI Final Score: ${p2Score} pts`);
    logs.push(`Game Over: ${finalState.gameOver}`);
    logs.push(`End Reason: ${finalState.endReason}`);
    logs.push(`Winner(s): ${finalState.winnerIds.map((id) => finalState.players.find((p) => p.id === id)?.displayName).join(', ')}`);

    // Write full turn-by-turn game log to logs
    console.log(logs.join('\n'));

    expect(finalState.gameOver).toBe(true);
    expect(finalState.winnerIds).toContain('player-1');
  });
});
