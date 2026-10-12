import React from 'react';
import type { EndReason, Player } from '../types/game';
import { calculateHandScore } from '../engine/scoring';
import { CardView } from './CardView';

interface GameOverModalProps {
  players: Player[];
  winnerIds: string[];
  endReason: EndReason | null;
  declaringPlayerId?: string | null;
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
    reasonTitle = `Automatic Defeat: 6 Mistakes by ${loser?.displayName || 'Player'}`;
  } else if (endReason === 'DECLARED_VICTORY') {
    reasonTitle = `Victory Declared by ${declaringPlayer?.displayName || winners[0]?.displayName || 'Player'}`;
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
      <div
        className="profile-modal-card"
        style={{
          height: 'min(86vh, 620px)',
          minHeight: '480px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="profile-modal-header" style={{ justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.png"
              alt="Six Cards Logo"
              style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }}
            />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: '#ffffff' }}>
              🏆 {reasonTitle}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="profile-modal-body">
          {/* Winner Banner */}
          <div
            style={{
              margin: '0 0 12px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
              borderRadius: 14,
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              textAlign: 'center',
            }}
          >
            {endReason === 'ZERO_CARD_AUTOMATIC_VICTORY' ? (
              <p style={{ margin: 0, fontSize: '1rem', color: '#fef08a', fontWeight: 800 }}>
                🎉 {winners[0]?.displayName} eliminated all cards and won immediately!
              </p>
            ) : endReason === 'SIX_WRONG_ATTEMPTS' ? (
              <p style={{ margin: 0, fontSize: '1rem', color: '#fef08a', fontWeight: 800 }}>
                ⚠️ {players.find((p) => p.incorrectEliminationCount >= 6)?.displayName} made 6 incorrect elimination attempts! {winners[0]?.displayName} wins the match!
              </p>
            ) : isTie ? (
              <p style={{ margin: 0, fontSize: '1rem', color: '#fef08a', fontWeight: 800 }}>
                🤝 Tied with {scoreBoard[0]?.score} points: {winners.map((w) => w.displayName).join(', ')}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '1rem', color: '#fef08a', fontWeight: 800 }}>
                👑 Winner: {winners[0]?.displayName} with {scoreBoard[0]?.score} points!
              </p>
            )}
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px', textAlign: 'center' }}>
            All cards revealed! Final scores (lowest points win):
          </p>

          {/* Player Result Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scoreBoard.map(({ player, score, isWinner }, idx) => (
              <div
                key={player.id}
                style={{
                  background: isWinner ? 'rgba(37, 99, 235, 0.18)' : 'rgba(15, 23, 42, 0.65)',
                  border: isWinner ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  boxShadow: isWinner ? '0 4px 14px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                {/* Top Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isWinner ? '#fbbf24' : '#94a3b8' }}>
                      {isWinner ? '👑 #1' : `#${idx + 1}`}
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>
                      {player.displayName}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isWinner ? '#38bdf8' : '#cbd5e1' }}>
                      {endReason === 'ZERO_CARD_AUTOMATIC_VICTORY' && isWinner ? 0 : score} pts
                    </span>
                    {isWinner && (
                      <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                        WINNER
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards Mini Strip */}
                {player.cards.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: '#4ade80', fontStyle: 'italic', padding: '4px 0' }}>
                    ✓ All cards eliminated (0 cards remaining)
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      overflowX: 'auto',
                      padding: '4px 2px 6px',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {player.cards.map((c) => (
                      <div key={c.id} style={{ flexShrink: 0, transform: 'scale(0.85)', transformOrigin: 'top left', width: 44, height: 64 }}>
                        <CardView card={c} isFaceUp size="small" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="profile-modal-footer" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="primary-gold-btn"
            style={{ width: '100%', maxWidth: '280px', padding: '12px 24px', fontSize: '0.9rem' }}
            onClick={onPlayAgain}
            id="play-again-btn"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};
