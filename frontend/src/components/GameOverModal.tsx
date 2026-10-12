import React from 'react';
import type { EndReason, Player } from '../types/game';
import { calculateHandScore } from '../engine/scoring';
import { CardView } from './CardView';

interface GameOverModalProps {
  players: Player[];
  winnerIds: string[];
  endReason: EndReason | null;
  declaringPlayerId: string | null;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  players,
  winnerIds,
  endReason,
  declaringPlayerId,
  onPlayAgain,
}) => {
  const declaringPlayer = players.find((p) => p.id === declaringPlayerId);
  const winners = players.filter((p) => winnerIds.includes(p.id));
  const isTie = winners.length > 1;

  let reasonTitle = 'Game Over';
  if (endReason === 'ZERO_CARD_AUTOMATIC_VICTORY') {
    reasonTitle = 'Automatic Victory! (0 Cards Left)';
  } else if (endReason === 'SIX_WRONG_ATTEMPTS') {
    const loser = players.find((p) => p.incorrectEliminationCount >= 6);
    reasonTitle = `Automatic Defeat: 6 Wrong Attempts by ${loser?.displayName || 'Player'}`;
  } else if (endReason === 'DECLARED_VICTORY') {
    reasonTitle = `Victory Declared by ${declaringPlayer?.displayName || 'Player'}`;
  } else if (endReason === 'DRAW_PILE_EMPTY') {
    reasonTitle = 'Draw Pile Empty! Final Scoring';
  }

  // Calculate scores
  const scoreBoard = players
    .map((p) => ({
      player: p,
      score: calculateHandScore(p.cards),
      isWinner: winnerIds.includes(p.id),
    }))
    .sort((a, b) => {
      if (endReason === 'ZERO_CARD_AUTOMATIC_VICTORY' || endReason === 'SIX_WRONG_ATTEMPTS') {
        if (a.isWinner) return -1;
        if (b.isWinner) return 1;
      }
      return a.score - b.score;
    });

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '850px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Six Cards Logo"
            style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }}
          />
          <h2 style={{ fontSize: '2.1rem', margin: 0 }}>🏆 {reasonTitle}</h2>
        </div>

        <div style={{ margin: '14px 0', padding: '16px', background: 'rgba(212,175,55,0.15)', borderRadius: '12px', border: '1px solid var(--gold-primary)' }}>
          {endReason === 'ZERO_CARD_AUTOMATIC_VICTORY' ? (
            <p style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gold-light)', fontWeight: 800 }}>
              🎉 {winners[0]?.displayName} eliminated all their cards and won the game immediately!
            </p>
          ) : endReason === 'SIX_WRONG_ATTEMPTS' ? (
            <p style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gold-light)', fontWeight: 800 }}>
              ⚠️ {players.find((p) => p.incorrectEliminationCount >= 6)?.displayName} reached 6 incorrect elimination attempts! {winners[0]?.displayName} wins the match!
            </p>
          ) : isTie ? (
            <p style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gold-light)', fontWeight: 800 }}>
              🤝 It&apos;s a Draw! Tied with {scoreBoard[0]?.score} points: {winners.map((w) => w.displayName).join(', ')}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gold-light)', fontWeight: 800 }}>
              👑 Winner: {winners[0]?.displayName} with {scoreBoard[0]?.score} points!
            </p>
          )}
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          All hidden hands are now revealed. Final scores are based on the sum of remaining card point values (Lowest wins):
        </p>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '16px 0' }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Remaining Cards</th>
                <th>Total Points</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {scoreBoard.map(({ player, score, isWinner }) => (
                <tr key={player.id} className={isWinner ? 'winner-row' : ''}>
                  <td>
                    <strong>{player.displayName}</strong>
                  </td>
                  <td>
                    {player.cards.length === 0 ? (
                      <span style={{ color: '#a7f3d0', fontStyle: 'italic' }}>0 cards remaining</span>
                    ) : (
                      <div className="results-cards-cell">
                        {player.cards.map((c) => (
                          <CardView key={c.id} card={c} isFaceUp size="small" />
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {endReason === 'ZERO_CARD_AUTOMATIC_VICTORY' && isWinner ? 0 : score} pts
                  </td>
                  <td>
                    {isWinner ? (
                      <span style={{ color: 'var(--gold-light)', fontWeight: 800 }}>
                        {isTie ? 'TIED WINNER' : 'WINNER 🏆'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button className="primary-gold-btn" style={{ width: 'auto', padding: '14px 36px' }} onClick={onPlayAgain} id="play-again-btn">
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};
