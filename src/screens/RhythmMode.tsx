import { useEffect, useMemo, useRef, useState } from 'react';
import { getSong, songMidis } from '../core/songs';
import { keyboardRange, toMidi } from '../core/notes';
import { audioNow, createBus, playClick, unlockAudio } from '../core/audio';
import { JUDGE_POINTS, hasPendingNear, isMissed, judgeOffset, pickTarget, type Judgement, type Target } from '../core/judge';
import { CLEF_WIDTH, Staff, staffHeight, type NoteState, type StaffNote } from '../components/Staff';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { Hud } from '../components/Hud';
import { useKeyMarks } from '../components/useKeyMarks';
import { useStaffWidth } from '../components/useStaffWidth';
import type { ScreenProps } from '../types';

const PX_PER_BEAT = 80;
/** 시작 버튼 후 첫 카운트인 박까지의 여유(초) */
const LEAD = 0.5;
const HIT_X = CLEF_WIDTH + 64;

/** 판정 대상: 음표 하나의 구성음 하나 (화음·양손은 같은 시각에 여러 개) */
interface NoteTarget extends Target {
  note: number;
  result: Judgement | null;
}

interface Game {
  targets: NoteTarget[];
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  wrongPress: number;
}

const LABELS: Record<Judgement, string> = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS' };

function rank(acc: number): string {
  if (acc >= 95) return 'S';
  if (acc >= 85) return 'A';
  if (acc >= 70) return 'B';
  return 'C';
}

export function RhythmMode({ data, update, go, songId, tempo }: ScreenProps & { songId: string; tempo: number }) {
  const song = getSong(songId, data.customSongs);
  const { settings } = data;
  const spb = 60 / (song.bpm * tempo);
  const countIn = song.beatsPerMeasure;
  const pxPerSec = PX_PER_BEAT / spb;
  const range = useMemo(() => keyboardRange(songMidis(song)), [song]);

  const times = useMemo(() => song.notes.map((n) => LEAD + (countIn + n.startBeat) * spb), [song, countIn, spb]);
  const songBeats = Math.max(...song.notes.map((n) => n.startBeat + n.beats));
  const endTime = LEAD + (countIn + songBeats) * spb;
  const measureStarts = useMemo(() => {
    const starts = new Set<number>();
    song.notes.forEach((n) => {
      if (n.measure > 0 && !song.notes.some((o) => o.measure === n.measure && o.startBeat < n.startBeat)) starts.add(n.startBeat);
    });
    return [...starts];
  }, [song]);

  const [phase, setPhase] = useState<'ready' | 'play'>('ready');
  const [now, setNow] = useState(0);
  const [feedback, setFeedback] = useState<{ id: number; text: string; kind: string } | null>(null);
  const game = useRef<Game>({
    targets: song.notes.flatMap((n, i) =>
      n.pitches.map((p) => ({ time: times[i], midi: toMidi(p), judged: false, note: i, result: null })),
    ),
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    wrongPress: 0,
  });
  const t0 = useRef(0);
  const bus = useRef<GainNode | null>(null);
  const raf = useRef(0);
  const finished = useRef(false);
  const { marks, flash } = useKeyMarks();
  const viewHeight = staffHeight(song.staff);
  const [staffRef, staffWidth] = useStaffWidth<HTMLDivElement>(viewHeight, 720);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      bus.current?.disconnect();
    },
    [],
  );

  const showFeedback = (text: string, kind: string) => setFeedback({ id: performance.now(), text, kind });

  const record = (target: NoteTarget, j: Judgement) => {
    const g = game.current;
    target.judged = true;
    target.result = j;
    g[j]++;
    if (j === 'miss') {
      g.combo = 0;
    } else {
      g.combo++;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      g.score += JUDGE_POINTS[j] + Math.min(g.combo, 30) * 2;
    }
    showFeedback(LABELS[j], j);
  };

  const start = () => {
    unlockAudio();
    bus.current = createBus();
    t0.current = audioNow() + 0.15;

    // 카운트인 + (설정 시) 곡 내내 메트로놈. 못갖춘마디면 강박 위치를 그만큼 민다.
    const firstMeasureBeats = Math.max(
      ...song.notes.filter((n) => n.measure === 0).map((n) => n.startBeat + n.beats),
    );
    const pickup = firstMeasureBeats < countIn ? firstMeasureBeats : 0;
    const totalBeats = countIn + Math.ceil(songBeats);
    for (let b = 0; b < totalBeats; b++) {
      const inSong = b >= countIn;
      if (inSong && !settings.metronome) break;
      const rel = inSong ? b - countIn - pickup : b;
      const accent = ((rel % countIn) + countIn) % countIn === 0;
      playClick(t0.current + LEAD + b * spb, accent, bus.current);
    }

    setPhase('play');
    const loop = () => {
      const t = audioNow() - t0.current;
      for (const target of game.current.targets) {
        if (!target.judged && isMissed(target.time, t)) record(target, 'miss');
      }
      setNow(t);
      if (t > endTime + 1) finish();
      else raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const g = game.current;
    const total = g.perfect + g.good + g.miss;
    const accuracy = Math.round(((g.perfect + g.good * 0.5) / total) * 100);
    const prevBest = data.songBest[song.id]?.rhythm;
    update((d) => ({
      ...d,
      songBest: {
        ...d.songBest,
        [song.id]: { ...d.songBest[song.id], rhythm: Math.max(g.score, d.songBest[song.id]?.rhythm ?? 0) },
      },
    }));
    go({
      name: 'result',
      result: {
        title: `${song.title} — 리듬 게임 (${Math.round(tempo * 100)}%)`,
        headline: `${rank(accuracy)} · ${g.score}점`,
        isNewBest: prevBest === undefined || g.score > prevBest,
        best: prevBest !== undefined ? `${prevBest}점` : undefined,
        stats: [
          { label: 'PERFECT', value: `${g.perfect}` },
          { label: 'GOOD', value: `${g.good}` },
          { label: 'MISS', value: `${g.miss}` },
          { label: '최대 콤보', value: `${g.maxCombo}` },
          { label: '정확도', value: `${accuracy}%` },
        ],
        message: g.miss === 0 ? '풀 콤보! 🎉' : accuracy < 70 ? '빠르기를 낮추거나 따라 치기로 먼저 연습해 보세요.' : undefined,
        retry: { name: 'rhythm', songId: song.id, tempo },
        back: { name: 'songs', mode: 'rhythm' },
      },
    });
  };

  const onPress = (midi: number) => {
    if (phase !== 'play' || finished.current) return;
    const t = audioNow() - t0.current;
    const g = game.current;
    const i = pickTarget(g.targets, t, midi);
    if (i >= 0) {
      record(g.targets[i], judgeOffset(g.targets[i].time - t)!);
      flash(midi, 'correct', 200);
    } else if (hasPendingNear(g.targets, t)) {
      g.wrongPress++;
      g.combo = 0;
      flash(midi, 'wrong', 350);
      showFeedback('✕', 'miss');
    }
  };

  const g = game.current;
  const t = phase === 'play' ? now : 0;
  const xAt = (time: number) => HIT_X + (time - t) * pxPerSec;
  const visible = (x: number) => x > CLEF_WIDTH - 4 && x < staffWidth + 30;

  // 음표 색: 구성음이 모두 판정되면 가장 나쁜 판정으로 표시
  const noteState = (i: number): NoteState => {
    const ts = g.targets.filter((x) => x.note === i);
    if (ts.length === 0) return 'faded';
    if (ts.some((x) => !x.judged)) return 'normal';
    if (ts.some((x) => x.result === 'miss')) return 'miss';
    return ts.some((x) => x.result === 'good') ? 'good' : 'perfect';
  };

  const staffNotes: StaffNote[] = [];
  song.notes.forEach((n, i) => {
    const x = xAt(times[i]);
    if (!visible(x)) return;
    staffNotes.push({ id: i, pitches: n.pitches, clef: n.clef, beats: n.beats, x, state: noteState(i) });
  });
  const barLines = measureStarts.map((b) => xAt(LEAD + (countIn + b) * spb) - PX_PER_BEAT * 0.3).filter(visible);

  const beatNow = (t - LEAD) / spb;
  const countdown = phase === 'play' && beatNow < countIn ? countIn - Math.max(0, Math.floor(beatNow)) : null;

  return (
    <div className="game">
      <Hud
        title={`${song.title} (${Math.round(tempo * 100)}%)`}
        onExit={() => go({ name: 'songs', mode: 'rhythm' })}
        items={[
          { label: '점수', value: g.score, highlight: true },
          { label: '콤보', value: g.combo },
        ]}
        progress={Math.max(0, t - LEAD - countIn * spb) / (songBeats * spb)}
      />
      <div className="staff-area" ref={staffRef}>
        <Staff fluid kind={song.staff} width={staffWidth} notes={staffNotes} barLines={barLines} hitLineX={HIT_X} />
        {feedback && (
          <div key={feedback.id} className={`judge judge-${feedback.kind}`} style={{ left: `${(HIT_X / staffWidth) * 100}%` }}>
            {feedback.text}
            {g.combo > 1 && feedback.kind !== 'miss' && <small>{g.combo} 콤보</small>}
          </div>
        )}
        {countdown !== null && <div className="countdown">{countdown}</div>}
        {phase === 'ready' && (
          <div className="overlay">
            <h3>{song.title}</h3>
            <p>
              음표가 왼쪽 판정선에 닿을 때 맞는 건반을 누르세요.
              {song.staff === 'grand' && (
                <>
                  <br />
                  양손 곡은 위·아래 보표의 음을 함께 눌러요.
                </>
              )}
              <br />
              시작하면 {countIn}박 카운트 후 곡이 시작돼요.
            </p>
            <button className="btn primary big" onClick={start}>
              시작
            </button>
          </div>
        )}
      </div>
      <PianoKeyboard
        low={range.low}
        high={range.high}
        onPress={onPress}
        marks={marks}
        showLabels={settings.showKeyLabels}
        nameStyle={settings.nameStyle}
      />
    </div>
  );
}
