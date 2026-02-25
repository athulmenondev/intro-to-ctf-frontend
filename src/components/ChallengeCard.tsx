import { useState, useRef } from 'react';
import './ChallengeCard.css';
import { CategoryIcon, CheckIcon } from './Icons';
import { challengeAPI } from '../api';
import type { Challenge, ChallengeCategory } from '../types';

interface ChallengeCardProps {
  challenge: Challenge;
  index: number;
  onSolve: (id: string, pointsAwarded: number) => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const color = categoryColors[challenge.category];
  const diff = difficultyConfig[challenge.difficulty];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (challenge.solved || isSubmitting || !flagInput.trim()) return;

    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(false);

    try {
      const result = await challengeAPI.submitFlag(challenge.id, flagInput.trim());

      if (result.correct && !result.alreadySolved) {
        // Success!
        setShowSuccess(true);
        setShowConfetti(true);
        setSubmitMessage(result.message);
        onSolve(challenge.id, result.pointsAwarded ?? 0);
        setTimeout(() => setShowSuccess(false), 1200);
        setTimeout(() => setShowConfetti(false), 1500);
      } else if (result.alreadySolved) {
        setSubmitMessage(result.message);
      } else {
        // Incorrect flag
        setShaking(true);
        setSubmitError(true);
        setSubmitMessage(
          result.attemptsRemaining !== undefined
            ? `${result.message} (${result.attemptsRemaining} attempts left)`
            : result.message
        );
        setTimeout(() => setShaking(false), 500);
        setFlagInput('');
        inputRef.current?.focus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setSubmitMessage(message);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
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
    setSubmitMessage(null);
    setSubmitError(false);
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
        {challenge.totalSolves > 0 && (
          <div className="card-solves mono">
            {challenge.totalSolves} solve{challenge.totalSolves !== 1 ? 's' : ''}
          </div>
        )}
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

          {/* Submission feedback */}
          {submitMessage && (
            <div className={`submit-feedback ${submitError ? 'submit-feedback--error' : 'submit-feedback--success'}`}>
              {submitMessage}
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
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                disabled={challenge.solved || isSubmitting}
                id={`flag-input-${challenge.id}`}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {!challenge.solved && (
              <button
                type="submit"
                className="flag-submit mono"
                id={`submit-${challenge.id}`}
                disabled={isSubmitting || !flagInput.trim()}
              >
                {isSubmitting ? '...' : 'Submit'}
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
