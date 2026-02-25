import './HUDHeader.css';
import { ShieldIcon, FlagIcon, TerminalIcon } from './Icons';
import type { UserStats } from '../types';

interface HUDHeaderProps {
  stats: UserStats;
  username?: string;
  onLogout?: () => void;
}

export function HUDHeader({ stats, username, onLogout }: HUDHeaderProps) {
  return (
    <header className="hud-header" id="hud-header">
      {/* Left: Branding */}
      <div className="hud-brand">
        <div className="hud-logo">
          <TerminalIcon size={22} />
        </div>
        <div className="hud-brand-text">
          <h1 className="hud-title mono">
            <span className="hud-title-bracket">&gt;</span> CTF Arena
            <span className="hud-cursor">_</span>
          </h1>
          <p className="hud-subtitle">Beginner Challenge Portal</p>
        </div>
      </div>

      {/* Right: Stats + User */}
      <div className="hud-stats">
        {username && (
          <>
            <div className="hud-user" id="user-info">
              <span className="hud-user-name mono">{username}</span>
              {onLogout && (
                <button
                  className="hud-logout mono"
                  onClick={onLogout}
                  id="logout-btn"
                  title="Logout"
                >
                  [×]
                </button>
              )}
            </div>
            <div className="hud-stat-divider" />
          </>
        )}
        <div className="hud-stat" id="user-rank">
          <div className="hud-stat-icon hud-stat-icon--rank">
            <ShieldIcon size={16} />
          </div>
          <div className="hud-stat-content">
            <span className="hud-stat-label">RANK</span>
            <span className="hud-stat-value mono">#{stats.rank}</span>
          </div>
        </div>
        <div className="hud-stat-divider" />
        <div className="hud-stat" id="user-points">
          <div className="hud-stat-icon hud-stat-icon--points">
            <FlagIcon size={16} />
          </div>
          <div className="hud-stat-content">
            <span className="hud-stat-label">POINTS</span>
            <span className="hud-stat-value mono">{stats.points}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
