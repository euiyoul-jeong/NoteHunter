import type { ReactNode } from 'react';

interface Props {
  title: string;
  onExit: () => void;
  items: { label: string; value: ReactNode; highlight?: boolean }[];
  /** 0~1 진행도(남은 시간 또는 곡 진행) */
  progress?: number;
  right?: ReactNode;
}

export function Hud({ title, onExit, items, progress, right }: Props) {
  return (
    <header className="hud">
      <button className="icon-btn" onClick={onExit} aria-label="나가기">
        ✕
      </button>
      <div className="hud-title">{title}</div>
      <div className="hud-items">
        {items.map((it) => (
          <div key={it.label} className={`hud-item ${it.highlight ? 'hl' : ''}`}>
            <span className="hud-label">{it.label}</span>
            <span className="hud-value">{it.value}</span>
          </div>
        ))}
        {right}
      </div>
      {progress !== undefined && (
        <div className="hud-progress">
          <div style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
    </header>
  );
}
