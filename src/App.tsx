import { useState, useCallback, useEffect } from 'react';
import './App.css';
import { HUDHeader } from './components/HUDHeader';
import { ProgressBar } from './components/ProgressBar';
import { ChallengeCard } from './components/ChallengeCard';
import { Leaderboard } from './components/Leaderboard';
import { AuthPage } from './components/AuthPage';
import { AdminPanel } from './components/AdminPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { challengeAPI, leaderboardAPI } from './api';
import type { Challenge, LeaderboardEntry } from './types';

function Dashboard() {
  const { user, logout } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch challenges and leaderboard from the API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [challengeRes, leaderboardRes] = await Promise.all([
          challengeAPI.getAll(),
          leaderboardAPI.get(10),
        ]);
        setChallenges(challengeRes.challenges);
        setLeaderboard(leaderboardRes.leaderboard);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const solvedCount = challenges.filter((c) => c.solved).length;
  const totalPoints = challenges
    .filter((c) => c.solved)
    .reduce((sum, c) => sum + c.points, 0);

  // Calculate user rank based on leaderboard
  const userRank = leaderboard.filter((e) => e.points > totalPoints).length + 1;

  const handleSolve = useCallback(
    (id: string, pointsAwarded: number) => {
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, solved: true, totalSolves: c.totalSolves + 1 } : c
        )
      );

      // Refresh leaderboard after successful solve
      leaderboardAPI.get(10).then((res) => setLeaderboard(res.leaderboard)).catch(console.error);

      // Suppress unused variable warning — points are visually reflected via state update
      void pointsAwarded;
    },
    []
  );

  if (isLoading) {
    return (
      <div className="app" id="ctf-dashboard">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text mono">&gt; Initializing CTF Arena...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" id="ctf-dashboard">
        <div className="loading-screen">
          <p className="loading-text mono error-text">⚠ {error}</p>
          <button className="retry-btn mono" onClick={() => window.location.reload()}>
            [ RETRY ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" id="ctf-dashboard">
      {/* HUD Header */}
      <HUDHeader
        stats={{
          rank: userRank,
          points: totalPoints,
          solvedCount,
          totalChallenges: challenges.length,
        }}
        username={user?.username}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="dashboard">
        {/* Progress Section */}
        <section className="dashboard-progress" id="progress-section">
          <ProgressBar solved={solvedCount} total={challenges.length} />
        </section>

        {/* Layout: Grid + Sidebar */}
        <div className="dashboard-layout">
          {/* Challenge Grid */}
          <section className="challenge-grid" id="challenge-grid">
            <div className="section-header">
              <h2 className="section-title mono">
                <span className="section-bracket">//</span> Active Challenges
              </h2>
              <span className="section-count mono">
                {solvedCount}/{challenges.length} complete
              </span>
            </div>
            <div className="grid">
              {challenges.map((challenge, index) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={index}
                  onSolve={handleSolve}
                />
              ))}
            </div>
          </section>

          {/* Leaderboard Sidebar */}
          <Leaderboard entries={leaderboard} userPoints={totalPoints} />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer" id="footer">
        <div className="footer-content">
          <span className="footer-text mono">
            <span className="footer-bracket">&gt;</span> CTF Arena v1.0
          </span>
          <span className="footer-separator">·</span>
          <span className="footer-text">
            Built for beginners, by the community
          </span>
        </div>
        <div className="footer-decoration" />
      </footer>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app" id="ctf-dashboard">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text mono">&gt; Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;
  if (isAdmin) return <AdminPanel />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

