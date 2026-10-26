import { useEffect, useMemo, useRef, useState } from 'react';
import { getSong, songMidis, songSteps, tieTargets } from '../core/songs';
import { layoutSong } from '../core/layout';
import { keyboardRange, pitchName, toMidi } from '../core/notes';
import { audioNow, createBus, playNote, unlockAudio } from '../core/audio';
import { CLEF_WIDTH, Staff, staffHeight, type NoteState, type StaffNote } from '../components/Staff';
import { PianoKeyboard, type KeyMark } from '../components/PianoKeyboard';
import { Hud } from '../components/Hud';
import { useKeyMarks } from '../components/useKeyMarks';
import type { ScreenProps } from '../types';

/** 같은 단계에서 이만큼 틀리면 정답 건반과 음이름을 알려준다 */
const HINT_AFTER = 2;

export function PracticeMode({ data, update, go, songId }: ScreenProps & { songId: string }) {
  const song = getSong(songId, data.customSongs);
  const { settings } = data;
  const layout = useMemo(() => layoutSong(song.notes, CLEF_WIDTH + 26), [song]);
  const steps = useMemo(() => songSteps(song), [song]);
  const ties = useMemo(() => tieTargets(song.notes), [song]);
  const range = useMemo(() => keyboardRange(songMidis(song)), [song]);
  const viewHeight = staffHeight(song.staff);

  const [pos, setPos] = useState(0);
  const [tries, setTries] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [showNames, setShowNames] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busRef = useRef<GainNode | null>(null);
  const listenTimers = useRef<number[]>([]);
  // 듣기 중 지금 소리 나는 음표 index — 건반 자동 눌림·악보 강조에 쓴다
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(() => new Set());
  // 양손·화음을 동시에 누르면 한 렌더 안에 입력이 여러 번 들어오므로 진행 상태는 ref 로
  const live = useRef({ pos: 0, collected: [] as number[] });
  const { marks, flash } = useKeyMarks();

  const step = steps[pos];
  const done = step === undefined;

  // 음표가 화면 왼쪽 1/3 지점에 오도록 스크롤
  const scrollToNote = (noteIndex: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    const scale = (svg ? svg.getBoundingClientRect().height : el.clientHeight) / viewHeight;
    el.scrollTo({ left: layout.xs[noteIndex] * scale - el.clientWidth / 3, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!done) scrollToNote(step.noteIndexes[0]);
  }, [pos, done, layout, viewHeight]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(finish, 700);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => stopListening, []);

  function stopListening() {
    busRef.current?.disconnect();
    busRef.current = null;
    listenTimers.current.forEach(clearTimeout);
    listenTimers.current = [];
    setPlayingNotes(new Set());
    setListening(false);
  }

  function listen() {
    if (listening) return stopListening();
    unlockAudio();
    const bus = createBus();
    busRef.current = bus;
    const spb = 60 / song.bpm;
    const lead = 0.1;
    const t0 = audioNow() + lead;
    const timers: number[] = [];
    const at = (sec: number, fn: () => void) => timers.push(window.setTimeout(fn, sec * 1000));
    let end = 0;
    song.notes.forEach((n, i) => {
      if (n.pitches.length === 0 || n.tied) return;
      for (const p of n.pitches) playNote(toMidi(p), Math.min(n.holdBeats * spb + 0.3, 3), t0 + n.startBeat * spb, bus);
      // 소리와 같은 시각에 건반을 누르고, 다음 음 직전에 뗀다
      const on = lead + n.startBeat * spb;
      const off = on + Math.max(n.holdBeats * spb - 0.06, 0.08);
      at(on, () => {
        setPlayingNotes((s) => new Set(s).add(i));
        scrollToNote(i);
      });
      at(off, () =>
        setPlayingNotes((s) => {
          const next = new Set(s);
          next.delete(i);
          return next;
        }),
      );
      end = Math.max(end, (n.startBeat + n.beats) * spb);
    });
    at(end + 0.5, stopListening);
    listenTimers.current = timers;
    setListening(true);
  }

  function finish() {
    const accuracy = Math.round(((steps.length - missed.size) / steps.length) * 100);
    const prevBest = data.songBest[song.id]?.practice;
    update((d) => ({
      ...d,
      songBest: {
        ...d.songBest,
        [song.id]: { ...d.songBest[song.id], practice: Math.max(accuracy, d.songBest[song.id]?.practice ?? 0) },
      },
    }));
    go({
      name: 'result',
      result: {
        title: `${song.title} — 따라 치기`,
        headline: `정확도 ${accuracy}%`,
        isNewBest: prevBest === undefined || accuracy > prevBest,
        best: prevBest !== undefined ? `${prevBest}%` : undefined,
        stats: [
          { label: '단계', value: `${steps.length}개` },
          { label: '한 번에 맞힘', value: `${steps.length - missed.size}개` },
          { label: '틀린 단계', value: `${missed.size}개` },
        ],
        message: accuracy === 100 ? '완벽해요! 리듬 게임에도 도전해 보세요.' : '틀린 부분을 다시 연습해 봐요.',
        retry: { name: 'practice', songId: song.id },
        back: { name: 'songs', mode: 'practice' },
      },
    });
  }

  const onPress = (midi: number) => {
    const cur = steps[live.current.pos];
    if (!cur) return;
    if (listening) stopListening();
    const had = live.current.collected;
    if (cur.midis.includes(midi)) {
      if (had.includes(midi)) return;
      const now = [...had, midi];
      if (now.length < cur.midis.length) {
        live.current.collected = now;
        setCollected(now);
        return;
      }
      cur.midis.forEach((m) => flash(m, 'correct', 250));
      live.current = { pos: live.current.pos + 1, collected: [] };
      setPos(live.current.pos);
      setCollected([]);
      setTries(0);
    } else {
      flash(midi, 'wrong', 400);
      setTries((t) => t + 1);
      setMissed((s) => new Set(s).add(live.current.pos));
    }
  };

  const hint = tries >= HINT_AFTER;
  const currentNotes = new Set(step?.noteIndexes ?? []);
  const stepOf = useMemo(() => {
    const map = new Map<number, number>();
    steps.forEach((s, i) => s.noteIndexes.forEach((n) => map.set(n, i)));
    return map;
  }, [steps]);

  const staffNotes: StaffNote[] = song.notes.map((n, i) => {
    let state: NoteState = 'normal';
    const si = stepOf.get(i);
    if (n.pitches.length === 0) state = 'faded';
    else if (currentNotes.has(i)) state = tries > 0 ? 'wrong' : 'current';
    else if (si !== undefined && (done || si < pos)) state = missed.has(si) ? 'miss' : 'done';
    if (playingNotes.has(i)) state = 'playing';
    const label =
      n.pitches.length > 0 && (showNames || (hint && currentNotes.has(i)))
        ? n.pitches.map((p) => pitchName(p, settings.nameStyle)).join('·')
        : undefined;
    const tj = ties.get(i);
    return { id: i, pitches: n.pitches, clef: n.clef, beats: n.beats, x: layout.xs[i], state, label, tieTo: tj === undefined ? undefined : layout.xs[tj] };
  });

  const keyMarks: Partial<Record<number, KeyMark>> = { ...marks };
  for (const i of playingNotes) for (const p of song.notes[i].pitches) keyMarks[toMidi(p)] = 'play';
  for (const m of collected) keyMarks[m] ??= 'held';
  if (hint && step) for (const m of step.midis) if (!collected.includes(m)) keyMarks[m] ??= 'hint';

  return (
    <div className="game">
      <Hud
        title={song.title}
        onExit={() => go({ name: 'songs', mode: 'practice' })}
        items={[
          { label: '진행', value: `${pos}/${steps.length}`, highlight: true },
          { label: '틀린 단계', value: missed.size },
        ]}
        progress={pos / steps.length}
        right={
          <>
            <button className={`chip ${showNames ? 'active' : ''}`} onClick={() => setShowNames((v) => !v)}>
              음이름
            </button>
            <button className={`chip ${listening ? 'active' : ''}`} onClick={listen}>
              {listening ? '■ 정지' : '▶ 듣기'}
            </button>
          </>
        }
      />
      <div className={`staff-area scroll ${song.staff === 'grand' ? 'tall' : ''}`} ref={scrollRef}>
        <Staff kind={song.staff} width={layout.width} notes={staffNotes} barLines={layout.barLines} />
      </div>
      <PianoKeyboard
        low={range.low}
        high={range.high}
        onPress={onPress}
        marks={keyMarks}
        showLabels={settings.showKeyLabels}
        nameStyle={settings.nameStyle}
      />
    </div>
  );
}
