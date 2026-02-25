import './ProgressBar.css';

interface ProgressBarProps {
  solved: number;
  total: number;
}

export function ProgressBar({ solved, total }: ProgressBarProps) {
  const percentage = total > 0 ? (solved / total) * 100 : 0;
  const isComplete = solved === total;

  return (
    <div className="progress-container" id="progress-bar">
      <div className="progress-label">
        <span className="progress-title mono">
          <span className="progress-bracket">[</span>
          CHALLENGES COMPLETED
          <span className="progress-bracket">]</span>
        </span>
        <span className={`progress-count mono ${isComplete ? 'progress-count--complete' : ''}`}>
          {solved}/{total}
        </span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${isComplete ? 'progress-fill--complete' : ''}`}
          style={{ width: `${percentage}%` }}
        >
          {percentage > 0 && <div className="progress-glow" />}
        </div>
        {/* Segment markers */}
        {Array.from({ length: total - 1 }, (_, i) => (
          <div
            key={i}
            className="progress-segment"
            style={{ left: `${((i + 1) / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
