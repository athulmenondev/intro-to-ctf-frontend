import './Leaderboard.css';
import { TrophyIcon } from './Icons';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  userPoints: number;
}

const rankColors = ['#ffb800', '#c0c0c0', '#cd7f32', '#00b4ff', '#a855f7'];

export function Leaderboard({ entries, userPoints }: LeaderboardProps) {
  return (
    <aside className="leaderboard" id="leaderboard">
      <div className="leaderboard-header">
        <div className="leaderboard-icon">
          <TrophyIcon size={16} />
        </div>
        <h2 className="leaderboard-title mono">Leaderboard</h2>
      </div>

      <div className="leaderboard-list">
        {entries.map((entry, index) => (
          <div
            key={entry.rank}
            className={`lb-entry ${index === 0 ? 'lb-entry--first' : ''}`}
            style={{
              animationDelay: `${(index + 1) * 100}ms`,
            }}
          >
            <div
              className="lb-rank mono"
              style={{ color: rankColors[index] || 'var(--text-muted)' }}
            >
              {entry.rank}
            </div>
            <div className="lb-avatar">{entry.avatar}</div>
            <div className="lb-info">
              <span className="lb-name mono">{entry.name}</span>
              <span className="lb-solved">{entry.solved} solved</span>
            </div>
            <div className="lb-points mono">{entry.points}</div>
          </div>
        ))}
      </div>

      {/* User position indicator */}
      <div className="lb-user-section">
        <div className="lb-divider-line" />
        <div className="lb-user-position">
          <span className="lb-user-label mono">YOUR SCORE</span>
          <span className="lb-user-points mono">{userPoints} pts</span>
        </div>
      </div>
    </aside>
  );
}
