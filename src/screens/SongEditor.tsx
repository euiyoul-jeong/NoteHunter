import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSong, encodePack, type CustomSong } from '../core/songs';
import { addPitch, midiText, sourceToTokens, tokensToSource, type Dur, type EditToken } from '../core/editor';
import { layoutSong } from '../core/layout';
import { keyboardRange, toMidi, type Clef } from '../core/notes';
import { audioNow, createBus, playNote, unlockAudio } from '../core/audio';
import { CLEF_WIDTH, Staff, type StaffNote } from '../components/Staff';
import { PianoKeyboard } from '../components/PianoKeyboard';
import type { ScreenProps, SongMode } from '../types';

const DURS: { id: Dur; label: string }[] = [
  { id: 'w', label: '온' },
  { id: 'h', label: '2분' },
  { id: 'q', label: '4분' },
  { id: 'e', label: '8분' },
];
const RANGE: Record<Clef, { low: number; high: number }> = {
  treble: keyboardRange([60, 84]),
  bass: keyboardRange([36, 60]),
};

/** 내 곡 만들기·고치기: 화면 건반으로 음표를 입력해 이 기기에 저장한다. */
export function SongEditor({ data, update, go, mode, songId }: ScreenProps & { mode: SongMode; songId?: string }) {
  const original = data.customSongs.find((c) => c.id === songId);
  const [title, setTitle] = useState(original?.title ?? '');
  const [bpm, setBpm] = useState(original?.bpm ?? 90);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(original?.beatsPerMeasure ?? 4);
  const [voices, setVoices] = useState<Record<Clef, EditToken[]>>(() => ({
    treble: sourceToTokens(original?.treble, 'treble'),
    bass: sourceToTokens(original?.bass, 'bass'),
  }));
  const [hand, setHand] = useState<Clef>(original && !original.treble ? 'bass' : 'treble');
  const [dur, setDur] = useState<Dur>('q');
  const [dotted, setDotted] = useState(false);
  const [chord, setChord] = useState(false);
  const [message, setMessage] = useState('');
  const [playing, setPlaying] = useState(false);
  // 화음 묶기 중 마지막 음표에 쌓을 수 있는가 (쉼표·지우기·손 바꾸기 후엔 새 음표부터)
  const stackable = useRef(false);
  const busRef = useRef<GainNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const back = () => go({ name: 'songs', mode });

  const sources = {
    treble: tokensToSource(voices.treble, beatsPerMeasure),
    bass: tokensToSource(voices.bass, beatsPerMeasure),
  };
  const preview = useMemo(
    () =>
      buildSong('preview', title, bpm, beatsPerMeasure, {
        treble: sources.treble || undefined,
        bass: sources.bass || undefined,
      }),
    [sources.treble, sources.bass, beatsPerMeasure, bpm, title],
  );
  const kind = preview.notes.length === 0 ? hand : preview.staff;
  const layout = useMemo(() => layoutSong(preview.notes, CLEF_WIDTH + 26), [preview]);
  const total = voices.treble.length + voices.bass.length;

  // 새 음표가 보이도록 끝으로 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [layout.width]);

  useEffect(() => () => busRef.current?.disconnect(), []);

  const setTokens = (fn: (t: EditToken[]) => EditToken[]) => setVoices((v) => ({ ...v, [hand]: fn(v[hand]) }));

  const onPress = (midi: number) => {
    const stack = chord && stackable.current;
    setTokens((t) => addPitch(t, midiText(midi), dur, dotted, stack));
    stackable.current = chord;
    setMessage('');
  };

  const addRest = () => {
    setTokens((t) => [...t, { pitches: [], dur, dotted }]);
    stackable.current = false;
  };

  // 마지막 음표에 붙임줄 켜기/끄기 (다음에 같은 음을 이어서 넣으면 소리가 이어진다)
  const toggleTie = () => {
    setTokens((t) => {
      const last = t[t.length - 1];
      if (!last || last.pitches.length === 0) return t;
      return [...t.slice(0, -1), { ...last, tie: !last.tie }];
    });
    stackable.current = false;
  };

  const undo = () => {
    setTokens((t) => t.slice(0, -1));
    stackable.current = false;
  };

  const switchHand = (h: Clef) => {
    setHand(h);
    stackable.current = false;
  };

  const toggleChord = () => {
    setChord((c) => !c);
    stackable.current = false;
  };

  const stop = () => {
    busRef.current?.disconnect();
    busRef.current = null;
    setPlaying(false);
  };

  const listen = () => {
    if (playing) return stop();
    if (preview.notes.length === 0) return;
    unlockAudio();
    const bus = createBus();
    busRef.current = bus;
    const spb = 60 / bpm;
    const t0 = audioNow() + 0.1;
    let end = 0;
    for (const n of preview.notes) {
      for (const p of n.pitches) playNote(toMidi(p), Math.min(n.beats * spb + 0.3, 2), t0 + n.startBeat * spb, bus);
      end = Math.max(end, (n.startBeat + n.beats) * spb);
    }
    setPlaying(true);
    window.setTimeout(() => busRef.current === bus && stop(), (end + 0.5) * 1000);
  };

  const toCustom = (): CustomSong => ({
    id: original?.id ?? `my-${Date.now().toString(36)}`,
    title: title.trim(),
    bpm,
    beatsPerMeasure,
    treble: sources.treble || undefined,
    bass: sources.bass || undefined,
  });

  const save = () => {
    if (!title.trim()) return setMessage('제목을 입력해 주세요.');
    if (total === 0) return setMessage('음표를 하나 이상 입력해 주세요.');
    const song = toCustom();
    update((d) => {
      const list = d.customSongs.filter((c) => c.id !== song.id);
      const at = d.customSongs.findIndex((c) => c.id === song.id);
      list.splice(at >= 0 ? at : list.length, 0, song);
      return { ...d, customSongs: list };
    });
    back();
  };

  const copyCode = async () => {
    if (total === 0) return setMessage('음표를 먼저 입력해 주세요.');
    const code = encodePack([{ ...toCustom(), title: title.trim() || '제목 없음' }]);
    try {
      await navigator.clipboard.writeText(code);
      setMessage('곡 코드를 복사했어요. 다른 기기의 [가져오기]에 붙여넣으면 돼요.');
    } catch {
      window.prompt('아래 곡 코드를 복사하세요', code);
    }
  };

  const notes: StaffNote[] = preview.notes.map((n, i) => ({
    id: i,
    pitches: n.pitches,
    clef: n.clef,
    beats: n.beats,
    x: layout.xs[i],
    state: n.clef === hand ? 'normal' : 'faded',
  }));

  return (
    <div className="game editor">
      <header className="hud editor-head">
        <button className="icon-btn" onClick={back} aria-label="나가기">
          ✕
        </button>
        <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="곡 제목" maxLength={40} />
        <div className="chip-group">
          {[2, 3, 4].map((b) => (
            <button key={b} className={`chip ${b === beatsPerMeasure ? 'active' : ''}`} onClick={() => setBeatsPerMeasure(b)}>
              {b}/4
            </button>
          ))}
          <label className="bpm">
            ♩=
            <input type="number" min={40} max={200} value={bpm} onChange={(e) => setBpm(Math.min(200, Math.max(40, Number(e.target.value) || 90)))} />
          </label>
        </div>
        <button className="btn primary" onClick={save}>
          저장
        </button>
      </header>

      <div className={`staff-area scroll ${kind === 'grand' ? 'tall' : ''}`} ref={scrollRef}>
        <Staff kind={kind} width={Math.max(layout.width, 300)} notes={notes} barLines={layout.barLines} />
        {total === 0 && <div className="editor-empty">아래 건반을 누르면 음표가 들어가요</div>}
      </div>

      <div className="editor-tools">
        <div className="segmented">
          <button className={hand === 'treble' ? 'active' : ''} onClick={() => switchHand('treble')}>
            오른손 {voices.treble.length > 0 && `(${voices.treble.length})`}
          </button>
          <button className={hand === 'bass' ? 'active' : ''} onClick={() => switchHand('bass')}>
            왼손 {voices.bass.length > 0 && `(${voices.bass.length})`}
          </button>
        </div>
        <div className="chip-group">
          {DURS.map((d) => (
            <button key={d.id} className={`chip ${d.id === dur ? 'active' : ''}`} onClick={() => setDur(d.id)}>
              {d.label}
            </button>
          ))}
          <button className={`chip ${dotted ? 'active' : ''}`} onClick={() => setDotted((v) => !v)}>
            점
          </button>
          <button className="chip" onClick={addRest}>
            쉼표
          </button>
          <button className={`chip ${chord ? 'active' : ''}`} onClick={toggleChord} title="켜면 누르는 음이 한 화음으로 쌓여요">
            화음
          </button>
          <button
            className={`chip ${voices[hand][voices[hand].length - 1]?.tie ? 'active' : ''}`}
            onClick={toggleTie}
            title="마지막 음표를 다음 음과 붙임줄로 잇기"
          >
            붙임줄
          </button>
          <button className="chip" onClick={undo} disabled={voices[hand].length === 0}>
            ⌫ 지우기
          </button>
          <button className={`chip ${playing ? 'active' : ''}`} onClick={listen}>
            {playing ? '■ 정지' : '▶ 듣기'}
          </button>
          <button className="chip" onClick={copyCode}>
            코드 복사
          </button>
        </div>
        {message && <span className="editor-message">{message}</span>}
      </div>

      <PianoKeyboard
        low={RANGE[hand].low}
        high={RANGE[hand].high}
        onPress={onPress}
        showLabels={data.settings.showKeyLabels}
        nameStyle={data.settings.nameStyle}
      />
    </div>
  );
}
