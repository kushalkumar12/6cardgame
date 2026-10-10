import React from 'react';
import type { ActionLogEntry } from '../types/game';

interface ActionLogProps {
  entries: ActionLogEntry[];
}

export const ActionLog: React.FC<ActionLogProps> = ({ entries }) => {
  return (
    <div className="action-log-panel">
      <div className="action-log-title">Public Event History</div>
      <ul className="action-log-list">
        {entries.slice(-15).map((entry) => (
          <li key={entry.id} className="action-log-item">
            • {entry.text}
          </li>
        ))}
      </ul>
    </div>
  );
};
