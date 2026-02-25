import { useState, useRef } from 'react';
import './ChallengeCard.css';
import { CategoryIcon, CheckIcon } from './Icons';
import type { Challenge, ChallengeCategory } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  index: number;
  onSolve: (id: string) => void;
}

const categoryColors: Record<ChallengeCategory, string> = {
  OSINT: '#00b4ff',
  Crypto: '#a855f7',
  Web: '#00ff9d',
  Forensics: '#ffb800',
  Reverse: '#ff3b5c',
};

const difficultyConfig = {
  Easy: { label: 'EASY', className: 'badge--easy' },
  Medium: { label: 'MEDIUM', className: 'badge--medium' },
  Hard: { label: 'HARD', className: 'badge--hard' },
};

export function ChallengeCard({ challenge, index, onSolve }: ChallengeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [flagInput, setFlagInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = categoryColors[challenge.category];
  const diff = difficultyConfig[challenge.difficulty];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (challenge.solved) return;

    if (flagInput.trim() === challenge.flag) {
      // Success!
      setShowSuccess(true);
      setShowConfetti(true);
      onSolve(challenge.id);
      setTimeout(() => setShowSuccess(false), 1200);
      setTimeout(() => setShowConfetti(false), 1500);
    } else {
      // Failure — shake animation
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setFlagInput('');
      inputRef.current?.focus();
    }
  };

  const handleCardClick = () => {
    if (!expanded) {
      setExpanded(true);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(false);
  };

  return (
    <article
      className={`challenge-card ${challenge.solved ? 'challenge-card--solved' : 'challenge-card--unsolved'} ${expanded ? 'challenge-card--expanded' : ''} ${showSuccess ? 'challenge-card--success' : ''}`}
      style={{
        '--card-color': color,
        animationDelay: `${index * 100}ms`,
      } as React.CSSProperties}
      onClick={handleCardClick}
      id={`challenge-${challenge.id}`}
    >
      {/* Confetti effect */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="confetti-particle"
              style={{
                '--x': `${(Math.random() - 0.5) * 200}px`,
                '--y': `${-Math.random() * 150 - 50}px`,
                '--r': `${Math.random() * 360}deg`,
                '--delay': `${Math.random() * 200}ms`,
                '--color': ['#00ff9d', '#00b4ff', '#a855f7', '#ffb800', '#ff3b5c'][i % 5],
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Scanline overlay for glitch effect */}
      {showSuccess && <div className="glitch-scanline" />}

      {/* Card Header */}
      <div className="card-header">
        <div className="card-icon" style={{ color }}>
          <CategoryIcon category={challenge.category} size={26} />
        </div>
        <div className="card-meta">
          <span className={`difficulty-badge mono ${diff.className}`}>
            {diff.label}
          </span>
          <span className={`status-indicator ${challenge.solved ? 'status--solved' : 'status--unsolved'}`}>
            {challenge.solved ? (
              <>
                <CheckIcon size={12} />
                <span>SOLVED</span>
              </>
            ) : (
              <span>UNSOLVED</span>
            )}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <h3 className="card-title mono">{challenge.title}</h3>
        <div className="card-category mono" style={{ color }}>
          {challenge.category}
        </div>
        <div className="card-points mono">
          <span className="points-value">{challenge.points}</span>
          <span className="points-label">PTS</span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="card-expanded" onClick={(e) => e.stopPropagation()}>
          <p className="card-description">{challenge.description}</p>

          {!challenge.solved && (
            <div className="card-hint">
              <span className="hint-label mono">&gt; HINT:</span>
              <span className="hint-text">{challenge.hint}</span>
            </div>
          )}

          {/* Flag Input */}
          <form
            className={`flag-form ${shaking ? 'flag-form--shake' : ''}`}
            onSubmit={handleSubmit}
          >
            <div className="flag-input-wrapper">
              <span className="flag-prompt mono">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                className="flag-input mono"
                placeholder={challenge.solved ? 'Challenge completed!' : 'CTF{enter_flag_here}'}
                value={challenge.solved ? challenge.flag : flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                disabled={challenge.solved}
                id={`flag-input-${challenge.id}`}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {!challenge.solved && (
              <button type="submit" className="flag-submit mono" id={`submit-${challenge.id}`}>
                Submit
              </button>
            )}
          </form>

          <button className="card-close mono" onClick={handleClose}>
            [ CLOSE ]
          </button>
        </div>
      )}
    </article>
  );
}
