import { MODES, STAFF_LABEL, freeKey, freeSpec, levelSpecs, type FreeConfig, type QuizTab } from '../core/quiz';
import type { StaffKind } from '../core/notes';
import type { ScreenProps } from '../types';

export function LevelSelect({ data, update, go, tab }: ScreenProps & { tab: QuizTab }) {
  const mode = MODES.find((m) => m.id === tab);

  return (
    <main className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => go({ name: 'home' })} aria-label="뒤로">
          ←
        </button>
        <h2>음표 퀴즈</h2>
      </header>

      <nav className="tabs" role="tablist">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={tab === m.id} className={tab === m.id ? 'active' : ''} onClick={() => go({ name: 'levels', tab: m.id })}>
            {m.label}
          </button>
        ))}
        <button role="tab" aria-selected={tab === 'free'} className={tab === 'free' ? 'active' : ''} onClick={() => go({ name: 'levels', tab: 'free' })}>
          자유 연습
        </button>
      </nav>

      {mode ? (
        <>
          <p className="tab-desc">{mode.desc}</p>
          <ul className="card-list">
            {levelSpecs(mode.id).map((spec, i) => {
              const best = data.quizBest[spec.key];
              const cleared = best !== undefined && spec.target !== undefined && best >= spec.target;
              return (
                <li key={spec.key}>
                  <button className="list-card" onClick={() => go({ name: 'quiz', key: spec.key })}>
                    <span className="badge">Lv.{i + 1}</span>
                    <span className="list-main">
                      <span className="list-title">{spec.title.replace(/^Lv\.\d+ /, '')}</span>
                      <span className="list-desc">{spec.desc}</span>
                    </span>
                    <span className="list-side">
                      {best !== undefined ? (
                        <b>
                          {cleared && '⭐ '}최고 {best}
                        </b>
                      ) : (
                        <span className="muted">기록 없음</span>
                      )}
                      <span className="muted">목표 {spec.target}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="hint-text">어느 레벨이든 바로 시작할 수 있어요. 목표 점수를 넘기면 ⭐를 받아요.</p>
        </>
      ) : (
        <FreeSetup
          config={data.settings.lastFree}
          best={data.quizBest[freeKey(data.settings.lastFree)]}
          onChange={(lastFree) => update((d) => ({ ...d, settings: { ...d.settings, lastFree } }))}
          onStart={() => go({ name: 'quiz', key: freeKey(data.settings.lastFree) })}
        />
      )}
    </main>
  );
}

interface FreeProps {
  config: FreeConfig;
  best?: number;
  onChange: (c: FreeConfig) => void;
  onStart: () => void;
}

function FreeSetup({ config: c, best, onChange, onStart }: FreeProps) {
  const set = (patch: Partial<FreeConfig>) => onChange({ ...c, ...patch });
  const spec = freeSpec(c);

  const row = <T,>(label: string, value: T, options: [T, string][], onPick: (v: T) => void) => (
    <div className="setting-row">
      <span>{label}</span>
      <div className="chip-group">
        {options.map(([v, text]) => (
          <button key={text} className={`chip ${v === value ? 'active' : ''}`} onClick={() => onPick(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <p className="tab-desc">원하는 조합을 골라 연습하세요.</p>
      <section className="settings">
        {row<StaffKind>(
          '악보',
          c.staff,
          (['treble', 'bass', 'grand'] as StaffKind[]).map((s) => [s, STAFF_LABEL[s]]),
          (staff) => set({ staff }),
        )}
        {row<FreeConfig['content']>(
          '문제',
          c.content,
          [
            ['single', '단음'],
            ['triad', '3화음'],
          ],
          (content) => set({ content }),
        )}
        {c.content === 'triad' &&
          row(
            '자리바꿈',
            c.inversions,
            [
              [false, '기본형만'],
              [true, '포함'],
            ],
            (inversions) => set({ inversions }),
          )}
        {row(
          '♯·♭',
          c.accidentals,
          [
            [false, '없음'],
            [true, '포함'],
          ],
          (accidentals) => set({ accidentals }),
        )}
        {row<FreeConfig['range']>(
          '음역',
          c.range,
          [
            ['narrow', '좁게'],
            ['wide', '넓게'],
          ],
          (range) => set({ range }),
        )}
        {row(
          '시간',
          c.duration,
          [
            [30, '30초'],
            [60, '60초'],
            [0, '무제한'],
          ],
          (duration) => set({ duration }),
        )}
      </section>
      <div className="free-start">
        <span className="muted">
          문제 {spec.pool.length}종{best !== undefined && ` · 최고 ${best}점`}
        </span>
        <button className="btn primary big" onClick={onStart}>
          시작
        </button>
      </div>
    </>
  );
}
