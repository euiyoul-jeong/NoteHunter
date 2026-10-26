import { useState } from 'react';
import { SONGS, songSteps } from '../core/songs';
import type { StaffKind } from '../core/notes';
import type { ScreenProps, SongMode } from '../types';

const TEMPOS = [0.6, 0.8, 1, 1.2];
const FILTERS: { id: StaffKind | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'treble', label: '높은음자리표' },
  { id: 'bass', label: '낮은음자리표' },
  { id: 'grand', label: '양손' },
];
const BADGE: Record<StaffKind, string> = { treble: '높은음', bass: '낮은음', grand: '양손' };

export function SongSelect({ data, go, mode }: ScreenProps & { mode: SongMode }) {
  const [tempo, setTempo] = useState(0.8);
  const [filter, setFilter] = useState<StaffKind | 'all'>('all');
  const rhythm = mode === 'rhythm';

  return (
    <main className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => go({ name: 'home' })} aria-label="뒤로">
          ←
        </button>
        <h2>{rhythm ? '리듬 게임' : '곡 따라 치기'} — 곡 선택</h2>
      </header>

      <div className="tempo-row">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${f.id === filter ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {rhythm && (
        <div className="tempo-row">
          <span>빠르기</span>
          {TEMPOS.map((t) => (
            <button key={t} className={`chip ${t === tempo ? 'active' : ''}`} onClick={() => setTempo(t)}>
              {Math.round(t * 100)}%
            </button>
          ))}
        </div>
      )}

      <ul className="card-list">
        {SONGS.filter((s) => filter === 'all' || s.staff === filter).map((song) => {
          const best = data.songBest[song.id]?.[mode];
          return (
            <li key={song.id}>
              <button
                className="list-card"
                onClick={() =>
                  go(rhythm ? { name: 'rhythm', songId: song.id, tempo } : { name: 'practice', songId: song.id })
                }
              >
                <span className={`badge staff-${song.staff}`}>{BADGE[song.staff]}</span>
                <span className="list-main">
                  <span className="list-title">{song.title}</span>
                  <span className="list-desc">
                    {song.beatsPerMeasure}/4박자 · {songSteps(song).length}단계
                    {rhythm && ` · ♩=${Math.round(song.bpm * tempo)}`}
                  </span>
                </span>
                <span className="list-side">
                  {best !== undefined ? <b>최고 {rhythm ? best : `${best}%`}</b> : <span className="muted">기록 없음</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
