import { defaultSaveData, type Settings as SettingsData } from '../core/storage';
import { playNote, unlockAudio } from '../core/audio';
import type { ScreenProps } from '../types';

export function Settings({ data, update, go }: ScreenProps) {
  const s = data.settings;
  const set = (patch: Partial<SettingsData>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const resetRecords = () => {
    if (window.confirm('최고 기록을 모두 지울까요?')) {
      update((d) => ({ ...defaultSaveData(), settings: d.settings, customSongs: d.customSongs }));
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => go({ name: 'home' })} aria-label="뒤로">
          ←
        </button>
        <h2>설정</h2>
      </header>

      <section className="settings">
        <div className="setting-row">
          <span>음이름 표기</span>
          <div className="segmented">
            <button className={s.nameStyle === 'solfege' ? 'active' : ''} onClick={() => set({ nameStyle: 'solfege' })}>
              도 레 미
            </button>
            <button className={s.nameStyle === 'letter' ? 'active' : ''} onClick={() => set({ nameStyle: 'letter' })}>
              C D E
            </button>
          </div>
        </div>

        <label className="setting-row">
          <span>
            건반에 음이름 표시
            <small>익숙해지면 끄고 도전해 보세요</small>
          </span>
          <input type="checkbox" checked={s.showKeyLabels} onChange={(e) => set({ showKeyLabels: e.target.checked })} />
        </label>

        <label className="setting-row">
          <span>리듬 게임 메트로놈</span>
          <input type="checkbox" checked={s.metronome} onChange={(e) => set({ metronome: e.target.checked })} />
        </label>

        <label className="setting-row">
          <span>음량</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => set({ volume: Number(e.target.value) })}
            onPointerUp={() => {
              unlockAudio();
              playNote(72, 0.6);
            }}
          />
        </label>

        <div className="setting-row">
          <span>기록 초기화</span>
          <button className="btn danger" onClick={resetRecords}>
            초기화
          </button>
        </div>
      </section>
    </main>
  );
}
