import type { GameResult, ScreenProps } from '../types';

export function Result({ go, result }: ScreenProps & { result: GameResult }) {
  return (
    <main className="page result">
      <h2>{result.title}</h2>
      <div className="result-score">{result.headline}</div>
      {result.isNewBest ? (
        <div className="new-best">🏆 최고 기록!</div>
      ) : (
        result.best && <div className="muted">최고 기록 {result.best}</div>
      )}
      <dl className="result-stats">
        {result.stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      {result.message && <p className="result-message">{result.message}</p>}
      <div className="button-row">
        <button className="btn primary" onClick={() => go(result.retry)}>
          다시 하기
        </button>
        <button className="btn" onClick={() => go(result.back)}>
          목록으로
        </button>
      </div>
    </main>
  );
}
