import { useState } from 'react';
import { decodePack, type CustomSong } from '../core/songs';
import type { ScreenProps, SongMode } from '../types';

/** 곡 코드를 붙여넣어 내 곡으로 저장 (이 기기의 localStorage 에만 저장된다) */
export function SongImport({ update, go, mode }: ScreenProps & { mode: SongMode }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const back = () => go({ name: 'songs', mode, filter: 'mine' });

  const importSongs = () => {
    try {
      const songs = decodePack(text);
      let added = 0;
      let replaced = 0;
      update((d) => {
        const list = [...d.customSongs];
        songs.forEach((s, i) => {
          const at = list.findIndex((c) => c.title === s.title);
          if (at >= 0) {
            // 같은 제목이면 내용만 교체 (id 를 유지해서 기록이 남는다)
            list[at] = { ...s, id: list[at].id };
            replaced++;
          } else {
            list.push({ ...s, id: `my-${Date.now().toString(36)}-${i}` } as CustomSong);
            added++;
          }
        });
        return { ...d, customSongs: list };
      });
      const parts = [added && `${added}곡 추가`, replaced && `${replaced}곡 교체`].filter(Boolean).join(', ');
      setResult({ ok: true, message: `${parts || `${songs.length}곡 저장`} — ${songs.map((s) => s.title).join(', ')}` });
      setText('');
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={back} aria-label="뒤로">
          ←
        </button>
        <h2>내 곡 가져오기</h2>
      </header>
      <p className="tab-desc">받은 곡 코드를 아래에 그대로 붙여넣고 [가져오기]를 누르세요. 곡은 이 기기에만 저장돼요.</p>
      <textarea
        className="code-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"noteHunterSongs":1,"songs":[ ... ]}'
        spellCheck={false}
        rows={10}
      />
      {result && <p className={`import-result ${result.ok ? 'ok' : 'bad'}`}>{result.ok ? '✅ ' : '⚠️ '}{result.message}</p>}
      <div className="button-row">
        <button className="btn primary" onClick={importSongs} disabled={!text.trim()}>
          가져오기
        </button>
        <button className="btn" onClick={back}>
          내 곡 목록
        </button>
      </div>
    </main>
  );
}
