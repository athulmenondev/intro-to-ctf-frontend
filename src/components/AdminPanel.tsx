import { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';
import { adminAPI, leaderboardAPI, attachmentAPI } from '../api';
import type { AdminChallenge, Participant, Attachment, BackendLogEntry, BackendLogLevel } from '../api';
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
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard' | 'participants' | 'logs'>('challenges');
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
  const [formFiles, setFormFiles] = useState<File[]>([]);

  // Confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteParticipantId, setDeleteParticipantId] = useState<string | null>(null);

  // Reset CTF confirm
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Attachment uploads
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [challengeAttachments, setChallengeAttachments] = useState<Record<string, Attachment[]>>({});

  // Participant Logs
  const [selectedParticipantLogs, setSelectedParticipantLogs] = useState<{ id: string; username: string } | null>(null);
  const [participantSubmissions, setParticipantSubmissions] = useState<import('../api').ParticipantSubmission[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Backend Logs
  const [backendLogs, setBackendLogs] = useState<BackendLogEntry[]>([]);
  const [logStats, setLogStats] = useState<{ total: number; counts: Record<BackendLogLevel, number> } | null>(null);
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [isLoadingBackendLogs, setIsLoadingBackendLogs] = useState(false);
  const [logsAutoRefresh, setLogsAutoRefresh] = useState(false);

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

      // Fetch attachments for all challenges
      const attachMap: Record<string, Attachment[]> = {};
      const attResults = await Promise.allSettled(
        challengeRes.challenges.map(async (c) => {
          try {
            const res = await attachmentAPI.list(c.id);
            return { id: c.id, attachments: res.attachments };
          } catch {
            return { id: c.id, attachments: [] as Attachment[] };
          }
        })
      );
      for (const r of attResults) {
        if (r.status === 'fulfilled') {
          attachMap[r.value.id] = r.value.attachments;
        }
      }
      setChallengeAttachments(attachMap);

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
    setFormFiles([]);
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
    setFormFiles([]);
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
        // Upload any new files for existing challenge
        for (const file of formFiles) {
          await adminAPI.uploadAttachment(formData.id, file);
        }
        setSuccessMessage(`Challenge "${formData.title}" updated!`);
      } else {
        await adminAPI.createChallenge(formData);
        // Upload queued files after creation
        for (const file of formFiles) {
          await adminAPI.uploadAttachment(formData.id, file);
        }
        const fileMsg = formFiles.length > 0 ? ` with ${formFiles.length} file(s)` : '';
        setSuccessMessage(`Challenge "${formData.title}" created${fileMsg}!`);
      }
      setShowForm(false);
      setFormData(emptyForm);
      setFormFiles([]);
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

  const handleDeleteParticipant = async (id: string) => {
    try {
      setError(null);
      await adminAPI.deleteParticipant(id);
      setSuccessMessage('Participant deleted!');
      setDeleteParticipantId(null);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    }
  };

  const handleExportSeed = async () => {
    try {
      await adminAPI.exportSeed();
      setSuccessMessage('challenges.json downloaded! Place it in your backend root and redeploy.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleClearQuestions = async () => {
    if (resetConfirmText !== 'CLEAR') return;
    try {
      const result = await adminAPI.clearAllQuestions();
      setSuccessMessage(
        `All questions cleared! Deleted ${result.deleted.challengesDeleted} challenges.`
      );
      setShowResetConfirm(false);
      setResetConfirmText('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    }
  };

  const handleUploadFile = async (challengeId: string, file: File) => {
    try {
      setError(null);
      await adminAPI.uploadAttachment(challengeId, file);
      setSuccessMessage(`File "${file.name}" uploaded!`);
      setUploadingFor(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleDeleteAttachment = async (challengeId: string, filename: string) => {
    try {
      await adminAPI.deleteAttachment(challengeId, filename);
      setSuccessMessage('Attachment deleted!');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleViewParticipantLogs = async (participantId: string, username: string) => {
    try {
      setIsLoadingLogs(true);
      setSelectedParticipantLogs({ id: participantId, username });
      const res = await adminAPI.getParticipantSubmissions(participantId);
      setParticipantSubmissions(res.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load participant logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const closeParticipantLogs = () => {
    setSelectedParticipantLogs(null);
    setParticipantSubmissions([]);
  };

  const fetchBackendLogs = useCallback(async () => {
    try {
      setIsLoadingBackendLogs(true);
      const levelOpt = logLevelFilter !== 'all' ? logLevelFilter : undefined;
      const res = await adminAPI.getBackendLogs({ level: levelOpt, limit: 300 });
      setBackendLogs(res.logs);
      setLogStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backend logs');
    } finally {
      setIsLoadingBackendLogs(false);
    }
  }, [logLevelFilter]);

  const handleClearBackendLogs = async () => {
    try {
      await adminAPI.clearBackendLogs();
      setSuccessMessage('Backend logs cleared.');
      await fetchBackendLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs');
    }
  };

  // Auto-refresh logs
  useEffect(() => {
    if (activeTab !== 'logs' || !logsAutoRefresh) return;
    const interval = setInterval(fetchBackendLogs, 5000);
    return () => clearInterval(interval);
  }, [activeTab, logsAutoRefresh, fetchBackendLogs]);

  // Refetch logs when filter changes
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchBackendLogs();
    }
  }, [logLevelFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <button
            className={`admin-tab mono ${activeTab === 'logs' ? 'admin-tab--active' : ''}`}
            onClick={() => { setActiveTab('logs'); fetchBackendLogs(); }}
          >
            // LOGS
          </button>
        </div>

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title mono">
                <span className="admin-bracket">//</span> All Challenges ({challenges.length})
              </h2>
              <div className="admin-section-actions">
                <button className="admin-btn admin-btn--ghost mono" onClick={handleExportSeed} title="Download challenges.json for redeployment">
                  ↓ EXPORT SEED
                </button>
                <button className="admin-btn admin-btn--danger-outline mono" onClick={() => setShowResetConfirm(true)} title="Clear all questions from database">
                  ⚠ CLEAR QUESTIONS
                </button>
                <button className="admin-btn admin-btn--primary mono" onClick={handleCreateNew} id="create-challenge-btn">
                  + NEW CHALLENGE
                </button>
              </div>
            </div>

            {/* Reset CTF Confirm */}
            {showResetConfirm && (
              <div className="admin-message admin-message--error" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                <span>⚠ This will delete ALL challenges permanently.</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: '0.72rem' }}>Type CLEAR to confirm:</span>
                  <input
                    className="admin-input mono"
                    style={{ width: 100, padding: '4px 8px', fontSize: '0.75rem' }}
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    placeholder="CLEAR"
                  />
                  <button
                    className="admin-btn admin-btn--danger-sm mono"
                    onClick={handleClearQuestions}
                    disabled={resetConfirmText !== 'CLEAR'}
                  >
                    CONFIRM CLEAR
                  </button>
                  <button className="admin-btn admin-btn--ghost-sm mono" onClick={() => { setShowResetConfirm(false); setResetConfirmText(''); }}>
                    CANCEL
                  </button>
                </div>
              </div>
            )}

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

                {/* File Attachments */}
                <div className="admin-field">
                  <label className="admin-label mono">📎 ATTACHMENTS (optional)</label>
                  <div className="admin-file-zone">
                    {formFiles.length > 0 && (
                      <div className="admin-file-list">
                        {formFiles.map((f, i) => (
                          <span key={i} className="admin-file-chip">
                            <span className="mono" style={{ fontSize: '0.72rem' }}>📄 {f.name}</span>
                            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({(f.size / 1024).toFixed(0)}KB)</span>
                            <button
                              type="button"
                              className="admin-file-remove"
                              onClick={() => setFormFiles(formFiles.filter((_, idx) => idx !== i))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <label className="admin-file-picker mono">
                      + Choose Files (PDF, Images, ZIP, Code — max 5MB each)
                      <input
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.zip,.tar.gz,.py,.c,.js,.html,.md"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          setFormFiles(prev => [...prev, ...newFiles]);
                          e.target.value = ''; // reset so same file can be re-added
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn admin-btn--primary mono" disabled={isSubmitting}>
                    {isSubmitting ? 'SAVING...' : isEditing ? '[ SAVE CHANGES ]' : '[ CREATE CHALLENGE ]'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost mono"
                    onClick={() => { setShowForm(false); setFormFiles([]); setError(null); }}
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
                          className="admin-btn admin-btn--ghost-sm mono"
                          onClick={() => setUploadingFor(uploadingFor === c.id ? null : c.id)}
                          title="Upload attachment"
                        >
                          📎
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

                  {/* Attachments row */}
                  {((challengeAttachments[c.id] && challengeAttachments[c.id].length > 0) || uploadingFor === c.id) && (
                    <div className="admin-attachments-row" style={{ gridColumn: '1 / -1', paddingTop: 6 }}>
                      {challengeAttachments[c.id]?.map((att) => (
                        <span key={att.filename} className="admin-attachment-chip">
                          <span className="mono" style={{ fontSize: '0.68rem' }}>📄 {att.originalName}</span>
                          <button
                            className="admin-attachment-delete"
                            onClick={() => handleDeleteAttachment(c.id, att.filename)}
                            title="Delete attachment"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {uploadingFor === c.id && (
                        <label className="admin-upload-chip mono">
                          + Upload File
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.zip,.py,.c,.js"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadFile(c.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
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
                <span className="admin-col admin-col--p-last">LAST SOLVED</span>
                <span className="admin-col admin-col--p-actions">ACTIONS</span>
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
                  <span className="admin-col admin-col--p-last">{p.lastSolveAt ? formatRelativeDate(p.lastSolveAt) : '-'}</span>
                  <span className="admin-col admin-col--p-actions">
                    {deleteParticipantId === p.id ? (
                      <span className="admin-delete-confirm">
                        <button
                          className="admin-btn admin-btn--danger-sm mono"
                          onClick={() => handleDeleteParticipant(p.id)}
                        >
                          YES
                        </button>
                        <button
                          className="admin-btn admin-btn--ghost-sm mono"
                          onClick={() => setDeleteParticipantId(null)}
                        >
                          NO
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          className="admin-btn admin-btn--ghost-sm mono"
                          onClick={() => handleViewParticipantLogs(p.id, p.username)}
                        >
                          LOGS
                        </button>
                        <button
                          className="admin-btn admin-btn--danger-sm mono"
                          onClick={() => setDeleteParticipantId(p.id)}
                        >
                          DEL
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="admin-empty mono">No participants registered yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Backend Logs Tab */}
        {activeTab === 'logs' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title mono">
                <TerminalIcon size={16} />
                <span style={{ marginLeft: 8 }}>Backend Logs</span>
                {logStats && (
                  <span className="admin-log-total-badge">{logStats.total}</span>
                )}
              </h2>
              <div className="admin-section-actions">
                <select
                  className="admin-input admin-select mono admin-log-filter-select"
                  value={logLevelFilter}
                  onChange={(e) => { setLogLevelFilter(e.target.value); }}
                  style={{ padding: '4px 28px 4px 8px', fontSize: '0.72rem', width: 120 }}
                >
                  <option value="all">ALL LEVELS</option>
                  <option value="info">INFO</option>
                  <option value="warn">WARN</option>
                  <option value="error">ERROR</option>
                  <option value="auth">AUTH</option>
                  <option value="flag">FLAG</option>
                  <option value="admin">ADMIN</option>
                </select>
                <button
                  className={`admin-btn mono ${logsAutoRefresh ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
                  onClick={() => setLogsAutoRefresh(!logsAutoRefresh)}
                  style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                >
                  {logsAutoRefresh ? '⏸ AUTO' : '▶ AUTO'}
                </button>
                <button className="admin-btn admin-btn--ghost mono" onClick={fetchBackendLogs} style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                  ↻ REFRESH
                </button>
                <button className="admin-btn admin-btn--danger-outline mono" onClick={handleClearBackendLogs} style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                  ⚠ CLEAR
                </button>
              </div>
            </div>

            {/* Log Stats Bar */}
            {logStats && (
              <div className="admin-log-stats-bar">
                {(Object.entries(logStats.counts) as [string, number][]).map(([level, count]) => (
                  <button
                    key={level}
                    className={`admin-log-stat-chip admin-log-stat-chip--${level} ${logLevelFilter === level ? 'admin-log-stat-chip--selected' : ''}`}
                    onClick={() => setLogLevelFilter(logLevelFilter === level ? 'all' : level)}
                  >
                    <span className="admin-log-stat-label mono">{level.toUpperCase()}</span>
                    <span className="admin-log-stat-count mono">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Log Entries */}
            <div className="admin-backend-logs-container">
              {isLoadingBackendLogs && backendLogs.length === 0 ? (
                <div className="admin-logs-loading mono">Loading logs...</div>
              ) : backendLogs.length > 0 ? (
                <div className="admin-backend-logs-list">
                  {backendLogs.map((log) => (
                    <div key={log.id} className={`admin-backend-log-row admin-backend-log-row--${log.level}`}>
                      <span className="admin-backend-log-time mono">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={`admin-backend-log-level mono admin-backend-log-level--${log.level}`}>
                        {log.level.toUpperCase().padEnd(5)}
                      </span>
                      <span className="admin-backend-log-msg mono">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty mono">No logs recorded yet. Interact with the CTF to generate logs.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Participant Logs Modal */}
      {selectedParticipantLogs && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title mono">
                <span className="admin-bracket">//</span> LOGS: {selectedParticipantLogs.username}
              </h3>
              <button className="admin-modal-close" onClick={closeParticipantLogs}>×</button>
            </div>
            <div className="admin-modal-body">
              {isLoadingLogs ? (
                <div className="admin-logs-loading mono">Loading logs...</div>
              ) : participantSubmissions.length > 0 ? (
                <div className="admin-logs-table">
                  <div className="admin-logs-header mono">
                    <span>TIME</span>
                    <span>CHALLENGE</span>
                    <span>FLAG</span>
                    <span>STATUS</span>
                  </div>
                  <div className="admin-logs-content">
                    {participantSubmissions.map((sub) => (
                      <div key={sub.id} className="admin-logs-row">
                        <span className="admin-log-time">{formatRelativeDate(sub.submittedAt)}</span>
                        <span className="admin-log-chal">{sub.challengeTitle} ({sub.points}pts)</span>
                        <span className="admin-log-flag mono">{sub.submittedFlag}</span>
                        <span className={`admin-log-status ${sub.isCorrect ? 'admin-log-status--correct' : 'admin-log-status--wrong'}`}>
                          {sub.isCorrect ? 'CORRECT' : 'WRONG'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="admin-empty mono">No submissions found.</div>
              )}
            </div>
          </div>
        </div>
      )}

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
