import { allSongs, songSteps } from '../core/songs';
import type { StaffKind } from '../core/notes';
import type { ScreenProps, SongMode } from '../types';

const TEMPOS = [0.6, 0.8, 1, 1.2];
type Filter = StaffKind | 'all' | 'mine';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'treble', label: '높은음자리표' },
  { id: 'bass', label: '낮은음자리표' },
  { id: 'grand', label: '양손' },
  { id: 'mine', label: '내 곡' },
];
const BADGE: Record<StaffKind, string> = { treble: '높은음', bass: '낮은음', grand: '양손' };

export function SongSelect({ data, update, go, mode, filter = 'all' }: ScreenProps & { mode: SongMode; filter?: Filter }) {
  const tempo = data.settings.rhythmTempo;
  const setTempo = (rhythmTempo: number) => update((d) => ({ ...d, settings: { ...d.settings, rhythmTempo } }));
  const rhythm = mode === 'rhythm';
  const mineIds = new Set(data.customSongs.map((c) => c.id));
  const songs = allSongs(data.customSongs).filter((s) =>
    filter === 'all' ? true : filter === 'mine' ? mineIds.has(s.id) : s.staff === filter,
  );

  const remove = (id: string, title: string) => {
    if (!window.confirm(`'${title}'을(를) 내 곡에서 지울까요?`)) return;
    update((d) => {
      const songBest = { ...d.songBest };
      delete songBest[id];
      return { ...d, customSongs: d.customSongs.filter((c) => c.id !== id), songBest };
    });
  };

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
          <button key={f.id} className={`chip ${f.id === filter ? 'active' : ''}`} onClick={() => go({ name: 'songs', mode, filter: f.id })}>
            {f.label}
            {f.id === 'mine' && data.customSongs.length > 0 && ` ${data.customSongs.length}`}
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

      {filter === 'mine' && (
        <div className="mine-bar">
          <span className="muted">건반으로 직접 만들거나, 곡 코드를 붙여넣어 이 기기에 곡을 추가해요.</span>
          <div className="button-row">
            <button className="btn primary" onClick={() => go({ name: 'songEdit', mode })}>
              + 새 곡 만들기
            </button>
            <button className="btn" onClick={() => go({ name: 'songImport', mode })}>
              가져오기
            </button>
          </div>
        </div>
      )}

      {songs.length === 0 && <p className="hint-text">아직 가져온 곡이 없어요.</p>}

      <ul className="card-list">
        {songs.map((song) => {
          const best = data.songBest[song.id]?.[mode];
          const mine = mineIds.has(song.id);
          return (
            <li key={song.id} className="song-row">
              <button
                className="list-card"
                onClick={() =>
                  go(rhythm ? { name: 'rhythm', songId: song.id, tempo } : { name: 'practice', songId: song.id })
                }
              >
                <span className={`badge staff-${song.staff}`}>{mine ? '내 곡' : BADGE[song.staff]}</span>
                <span className="list-main">
                  <span className="list-title">{song.title}</span>
                  <span className="list-desc">
                    {mine && `${BADGE[song.staff]} · `}
                    {song.beatsPerMeasure}/4박자 · {songSteps(song).length}단계
                    {rhythm && ` · ♩=${Math.round(song.bpm * tempo)}`}
                  </span>
                </span>
                <span className="list-side">
                  {best !== undefined ? <b>최고 {rhythm ? best : `${best}%`}</b> : <span className="muted">기록 없음</span>}
                </span>
              </button>
              {mine && (
                <button className="icon-btn edit" onClick={() => go({ name: 'songEdit', mode, songId: song.id })} aria-label={`${song.title} 고치기`}>
                  ✎
                </button>
              )}
              {mine && (
                <button className="icon-btn delete" onClick={() => remove(song.id, song.title)} aria-label={`${song.title} 지우기`}>
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
