import { useState, useCallback } from 'react';
import './App.css';
import { HUDHeader } from './components/HUDHeader';
import { ProgressBar } from './components/ProgressBar';
import { ChallengeCard } from './components/ChallengeCard';
import { Leaderboard } from './components/Leaderboard';
import { challenges as initialChallenges, leaderboard } from './data';
import type { Challenge } from './types';

function App() {
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);

  const solvedCount = challenges.filter((c) => c.solved).length;
  const totalPoints = challenges
    .filter((c) => c.solved)
    .reduce((sum, c) => sum + c.points, 0);

  // Calculate user rank based on points vs leaderboard
  const userRank = leaderboard.filter((e) => e.points > totalPoints).length + 1;

  const handleSolve = useCallback((id: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, solved: true } : c))
    );
  }, []);

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

export default App;
