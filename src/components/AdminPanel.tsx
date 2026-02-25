import { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';
import { adminAPI, leaderboardAPI } from '../api';
import type { AdminChallenge, Participant } from '../api';
import type { LeaderboardEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { TrophyIcon, TerminalIcon } from './Icons';

/** Formats an ISO date string into a human-friendly relative label */
function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORIES = ['OSINT', 'Crypto', 'Web', 'Forensics', 'Reverse'] as const;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

interface AdminStats {
  totalUsers: number;
  totalChallenges: number;
  totalSubmissions: number;
  totalSolves: number;
}

const emptyForm = {
  id: '',
  title: '',
  category: 'Web' as string,
  difficulty: 'Easy' as string,
  description: '',
  hint: '',
  flag: '',
  points: 100,
};

export function AdminPanel() {
  const { user, logout } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard' | 'participants'>('challenges');
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [challengeRes, statsRes, leaderboardRes, participantRes] = await Promise.all([
        adminAPI.getChallenges(),
        adminAPI.getStats(),
        leaderboardAPI.get(25),
        adminAPI.getParticipants(),
      ]);
      setChallenges(challengeRes.challenges);
      setStats(statsRes);
      setLeaderboard(leaderboardRes.leaderboard);
      setParticipants(participantRes.participants);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateNew = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (challenge: AdminChallenge) => {
    setFormData({
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      description: challenge.description,
      hint: challenge.hint,
      flag: challenge.flag,
      points: challenge.points,
    });
    setIsEditing(true);
    setShowForm(true);
    setError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        const { id, ...updateData } = formData;
        await adminAPI.updateChallenge(id, updateData);
        setSuccessMessage(`Challenge "${formData.title}" updated!`);
      } else {
        await adminAPI.createChallenge(formData);
        setSuccessMessage(`Challenge "${formData.title}" created!`);
      }
      setShowForm(false);
      setFormData(emptyForm);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await adminAPI.deleteChallenge(id);
      setSuccessMessage('Challenge deleted!');
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="app" id="admin-panel">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text mono">&gt; Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" id="admin-panel">
      {/* Admin Header */}
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">
            <TerminalIcon size={22} />
          </div>
          <div className="admin-brand-text">
            <h1 className="admin-title mono">
              <span className="admin-bracket">&gt;</span> CTF Arena
              <span className="admin-badge">ADMIN</span>
            </h1>
            <p className="admin-subtitle">Challenge Management Console</p>
          </div>
        </div>
        <div className="admin-user-section">
          <span className="admin-username mono">{user?.username}</span>
          <button className="admin-logout mono" onClick={logout} id="admin-logout">
            [ LOGOUT ]
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* Stats Cards */}
        {stats && (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-value mono">{stats.totalUsers}</span>
              <span className="admin-stat-label">Players</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value mono">{stats.totalChallenges}</span>
              <span className="admin-stat-label">Challenges</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value mono">{stats.totalSubmissions}</span>
              <span className="admin-stat-label">Submissions</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value mono">{stats.totalSolves}</span>
              <span className="admin-stat-label">Solves</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="admin-message admin-message--error">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="admin-message-close">×</button>
          </div>
        )}
        {successMessage && (
          <div className="admin-message admin-message--success">
            <span>✓ {successMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab mono ${activeTab === 'challenges' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            // CHALLENGES
          </button>
          <button
            className={`admin-tab mono ${activeTab === 'leaderboard' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            // LEADERBOARD
          </button>
          <button
            className={`admin-tab mono ${activeTab === 'participants' ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            // PARTICIPANTS
          </button>
        </div>

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title mono">
                <span className="admin-bracket">//</span> All Challenges ({challenges.length})
              </h2>
              <button className="admin-btn admin-btn--primary mono" onClick={handleCreateNew} id="create-challenge-btn">
                + NEW CHALLENGE
              </button>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
              <form className="admin-form" onSubmit={handleSubmitForm} id="challenge-form">
                <h3 className="admin-form-title mono">
                  {isEditing ? '// EDIT CHALLENGE' : '// NEW CHALLENGE'}
                </h3>

                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-id">ID (slug)</label>
                    <input
                      id="challenge-id"
                      type="text"
                      className="admin-input mono"
                      placeholder="e.g. web-02"
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      disabled={isEditing}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-title">TITLE</label>
                    <input
                      id="challenge-title"
                      type="text"
                      className="admin-input mono"
                      placeholder="Challenge Title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-category">CATEGORY</label>
                    <select
                      id="challenge-category"
                      className="admin-input admin-select mono"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-difficulty">DIFFICULTY</label>
                    <select
                      id="challenge-difficulty"
                      className="admin-input admin-select mono"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-points">POINTS</label>
                    <input
                      id="challenge-points"
                      type="number"
                      className="admin-input mono"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                      min={1}
                      max={10000}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label mono" htmlFor="challenge-flag">FLAG</label>
                    <input
                      id="challenge-flag"
                      type="text"
                      className="admin-input mono admin-input--flag"
                      placeholder="CTF{...}"
                      value={formData.flag}
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label className="admin-label mono" htmlFor="challenge-description">DESCRIPTION</label>
                  <textarea
                    id="challenge-description"
                    className="admin-input admin-textarea mono"
                    placeholder="Describe the challenge..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-label mono" htmlFor="challenge-hint">HINT</label>
                  <textarea
                    id="challenge-hint"
                    className="admin-input admin-textarea mono"
                    placeholder="Give a helpful hint..."
                    value={formData.hint}
                    onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn--primary mono" disabled={isSubmitting}>
                    {isSubmitting ? 'SAVING...' : isEditing ? '[ SAVE CHANGES ]' : '[ CREATE CHALLENGE ]'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost mono"
                    onClick={() => { setShowForm(false); setError(null); }}
                  >
                    [ CANCEL ]
                  </button>
                </div>
              </form>
            )}

            {/* Challenge List */}
            <div className="admin-table">
              <div className="admin-table-header">
                <span className="admin-col admin-col--id">ID</span>
                <span className="admin-col admin-col--title">TITLE</span>
                <span className="admin-col admin-col--cat">CAT</span>
                <span className="admin-col admin-col--diff">DIFF</span>
                <span className="admin-col admin-col--pts">PTS</span>
                <span className="admin-col admin-col--solves">SOLVES</span>
                <span className="admin-col admin-col--flag">FLAG</span>
                <span className="admin-col admin-col--actions">ACTIONS</span>
              </div>
              {challenges.map((c) => (
                <div key={c.id} className="admin-table-row">
                  <span className="admin-col admin-col--id mono">{c.id}</span>
                  <span className="admin-col admin-col--title">{c.title}</span>
                  <span className="admin-col admin-col--cat">
                    <span className={`admin-cat-badge admin-cat-badge--${c.category.toLowerCase()}`}>
                      {c.category}
                    </span>
                  </span>
                  <span className="admin-col admin-col--diff">
                    <span className={`admin-diff-badge admin-diff-badge--${c.difficulty.toLowerCase()}`}>
                      {c.difficulty}
                    </span>
                  </span>
                  <span className="admin-col admin-col--pts mono">{c.points}</span>
                  <span className="admin-col admin-col--solves mono">{c.totalSolves}</span>
                  <span className="admin-col admin-col--flag mono admin-flag-text">{c.flag}</span>
                  <span className="admin-col admin-col--actions">
                    {deleteConfirmId === c.id ? (
                      <span className="admin-delete-confirm">
                        <span className="admin-delete-text mono">Delete?</span>
                        <button
                          className="admin-btn admin-btn--danger-sm mono"
                          onClick={() => handleDelete(c.id)}
                        >
                          YES
                        </button>
                        <button
                          className="admin-btn admin-btn--ghost-sm mono"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          NO
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          className="admin-btn admin-btn--ghost-sm mono"
                          onClick={() => handleEdit(c)}
                        >
                          EDIT
                        </button>
                        <button
                          className="admin-btn admin-btn--danger-sm mono"
                          onClick={() => setDeleteConfirmId(c.id)}
                        >
                          DEL
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
              {challenges.length === 0 && (
                <div className="admin-empty mono">No challenges yet. Create your first one!</div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title mono">
                <TrophyIcon size={16} />
                <span style={{ marginLeft: 8 }}>Player Rankings</span>
              </h2>
              <button className="admin-btn admin-btn--ghost mono" onClick={fetchData}>
                ↻ REFRESH
              </button>
            </div>

            <div className="admin-table">
              <div className="admin-table-header">
                <span className="admin-col admin-col--rank">#</span>
                <span className="admin-col admin-col--player">PLAYER</span>
                <span className="admin-col admin-col--score">POINTS</span>
                <span className="admin-col admin-col--player-solves">SOLVED</span>
              </div>
              {leaderboard.map((entry) => (
                <div key={entry.rank} className={`admin-table-row ${entry.rank <= 3 ? 'admin-table-row--top' : ''}`}>
                  <span className="admin-col admin-col--rank mono">
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <span className="admin-col admin-col--player mono">{entry.username}</span>
                  <span className="admin-col admin-col--score mono">{entry.points}</span>
                  <span className="admin-col admin-col--player-solves mono">{entry.solvedCount}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="admin-empty mono">No players yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title mono">
                <span className="admin-bracket">//</span> Registered Participants ({participants.length})
              </h2>
              <button className="admin-btn admin-btn--ghost mono" onClick={fetchData}>
                ↻ REFRESH
              </button>
            </div>

            <div className="admin-table admin-table--participants">
              <div className="admin-table-header admin-table-header--participants">
                <span className="admin-col admin-col--p-rank">#</span>
                <span className="admin-col admin-col--p-user">USERNAME</span>
                <span className="admin-col admin-col--p-email">EMAIL</span>
                <span className="admin-col admin-col--p-pts">PTS</span>
                <span className="admin-col admin-col--p-solves">SOLVES</span>
                <span className="admin-col admin-col--p-subs">SUBS</span>
                <span className="admin-col admin-col--p-acc">ACC%</span>
                <span className="admin-col admin-col--p-joined">JOINED</span>
              </div>
              {participants.map((p) => (
                <div key={p.id} className={`admin-table-row admin-table-row--participants ${p.rank <= 3 ? 'admin-table-row--top' : ''}`}>
                  <span className="admin-col admin-col--p-rank mono">
                    {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                  </span>
                  <span className="admin-col admin-col--p-user mono">{p.username}</span>
                  <span className="admin-col admin-col--p-email">{p.email}</span>
                  <span className="admin-col admin-col--p-pts mono">
                    <span className="admin-pts-value">{p.points}</span>
                  </span>
                  <span className="admin-col admin-col--p-solves mono">{p.solveCount}</span>
                  <span className="admin-col admin-col--p-subs mono">{p.submissionCount}</span>
                  <span className="admin-col admin-col--p-acc mono">
                    <span className={`admin-accuracy ${p.accuracy >= 50 ? 'admin-accuracy--good' : p.accuracy > 0 ? 'admin-accuracy--mid' : ''}`}>
                      {p.accuracy}%
                    </span>
                  </span>
                  <span className="admin-col admin-col--p-joined">{formatRelativeDate(p.joinedAt)}</span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="admin-empty mono">No participants registered yet.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer" id="admin-footer">
        <div className="footer-content">
          <span className="footer-text mono">
            <span className="footer-bracket">&gt;</span> CTF Arena Admin v1.0
          </span>
        </div>
      </footer>
    </div>
  );
}
