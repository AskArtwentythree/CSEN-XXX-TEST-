interface ProgressBarProps {
  percent: number;
  color?: string;
  label: string;
}

export function ProgressBar({ percent, color, label }: ProgressBarProps) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="progress-fill" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}
