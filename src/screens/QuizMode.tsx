import { useEffect, useMemo, useRef, useState } from 'react';
import { getSpec, quizPoints, randomQuestion, type Question } from '../core/quiz';
import { keyboardRange, pitchName, toMidi } from '../core/notes';
import { unlockAudio } from '../core/audio';
import { Staff, staffHeight } from '../components/Staff';
import { PianoKeyboard, type KeyMark } from '../components/PianoKeyboard';
import { Hud } from '../components/Hud';
import { useKeyMarks } from '../components/useKeyMarks';
import { useStaffWidth } from '../components/useStaffWidth';
import type { ScreenProps } from '../types';

interface Game {
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  wrong: number;
}

const midisOf = (q: Question) => q.pitches.map(toMidi);

export function QuizMode({ data, update, go, specKey }: ScreenProps & { specKey: string }) {
  const spec = useMemo(() => getSpec(specKey), [specKey]);
  const { settings } = data;
  const range = useMemo(() => keyboardRange(spec.pool.flatMap(midisOf)), [spec]);
  const timed = spec.duration > 0;
  const isChord = spec.pool.some((q) => q.pitches.length > 1);

  const [phase, setPhase] = useState<'ready' | 'play'>('ready');
  const [current, setCurrent] = useState(() => randomQuestion(spec.pool));
  const [questionId, setQuestionId] = useState(0);
  const [game, setGame] = useState<Game>({ score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0 });
  const [timeLeft, setTimeLeft] = useState(spec.duration);
  const [revealed, setRevealed] = useState(false);
  const [collected, setCollected] = useState<number[]>([]);
  const [pop, setPop] = useState<{ id: number; text: string; good: boolean } | null>(null);
  const endAt = useRef(0);
  // 화음을 동시에 누르면 한 렌더 안에 입력이 여러 번 들어오므로 최신 값은 ref 로 관리
  const live = useRef({ current, collected, combo: 0 });
  live.current.current = current;
  const { marks, flash } = useKeyMarks();
  const [staffRef, staffWidth] = useStaffWidth<HTMLDivElement>(staffHeight(spec.staff), 480);

  useEffect(() => {
    if (phase !== 'play' || !timed) return;
    const id = window.setInterval(() => {
      setTimeLeft(Math.max(0, (endAt.current - performance.now()) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [phase, timed]);

  useEffect(() => {
    if (phase === 'play' && timed && timeLeft <= 0) finish();
  }, [timeLeft, phase]);

  const start = () => {
    unlockAudio();
    endAt.current = performance.now() + spec.duration * 1000;
    setTimeLeft(spec.duration);
    setPhase('play');
  };

  const finish = () => {
    const prevBest = data.quizBest[spec.key];
    const isNewBest = game.score > 0 && (prevBest === undefined || game.score > prevBest);
    update((d) => ({
      ...d,
      quizBest: { ...d.quizBest, [spec.key]: Math.max(game.score, d.quizBest[spec.key] ?? 0) },
    }));
    const total = game.correct + game.wrong;
    const passed = spec.target !== undefined && game.score >= spec.target;
    go({
      name: 'result',
      result: {
        title: spec.tab === 'free' ? `자유 연습 — ${spec.desc}` : spec.title,
        headline: `${game.score}점`,
        isNewBest,
        best: prevBest !== undefined ? `${prevBest}점` : undefined,
        stats: [
          { label: isChord ? '맞힌 문제' : '맞힌 음표', value: `${game.correct}개` },
          { label: '정확도', value: total ? `${Math.round((game.correct / total) * 100)}%` : '-' },
          { label: '최대 콤보', value: `${game.maxCombo}` },
        ],
        message:
          spec.target === undefined
            ? undefined
            : passed
              ? '⭐ 목표 달성! 잘했어요.'
              : `목표 ${spec.target}점까지 ${spec.target - game.score}점 남았어요.`,
        retry: { name: 'quiz', key: spec.key },
        back: { name: 'levels', tab: spec.tab },
      },
    });
  };

  const nextQuestion = (q: Question) => {
    const next = randomQuestion(spec.pool, q);
    live.current.current = next;
    live.current.collected = [];
    setCurrent(next);
    setCollected([]);
    setQuestionId((n) => n + 1);
    setRevealed(false);
  };

  const onPress = (midi: number) => {
    if (phase !== 'play') return;
    const q = live.current.current;
    const answer = midisOf(q);
    const had = live.current.collected;

    if (answer.includes(midi)) {
      if (had.includes(midi)) return;
      const now = [...had, midi];
      if (now.length < answer.length) {
        // 화음: 아직 다 모으지 못함
        live.current.collected = now;
        setCollected(now);
        return;
      }
      const points = quizPoints(live.current.combo, answer.length);
      live.current.combo++;
      flash(midi, 'correct', 250);
      answer.forEach((m) => m !== midi && flash(m, 'correct', 250));
      setGame((g) => ({
        ...g,
        score: g.score + points,
        combo: g.combo + 1,
        maxCombo: Math.max(g.maxCombo, g.combo + 1),
        correct: g.correct + 1,
      }));
      setPop({ id: performance.now(), text: `+${points}`, good: true });
      nextQuestion(q);
    } else {
      live.current.combo = 0;
      flash(midi, 'wrong', 400);
      answer.filter((m) => !had.includes(m)).forEach((m) => flash(m, 'hint', 1000));
      setGame((g) => ({ ...g, combo: 0, wrong: g.wrong + 1 }));
      setPop({ id: performance.now(), text: '✕', good: false });
      setRevealed(true);
    }
  };

  const keyMarks: Partial<Record<number, KeyMark>> = { ...marks };
  for (const m of collected) keyMarks[m] ??= 'held';

  const label = revealed
    ? (current.name ? `${current.name}: ` : '') + current.pitches.map((p) => pitchName(p, settings.nameStyle)).join('·')
    : undefined;

  return (
    <div className="game">
      <Hud
        title={spec.tab === 'free' ? '자유 연습' : spec.title}
        onExit={() => go({ name: 'levels', tab: spec.tab })}
        items={[
          { label: '점수', value: game.score, highlight: true },
          { label: '콤보', value: game.combo },
          timed ? { label: '남은 시간', value: `${Math.ceil(timeLeft)}초` } : { label: '맞힘', value: game.correct },
        ]}
        progress={timed ? timeLeft / spec.duration : undefined}
        right={
          !timed && phase === 'play' ? (
            <button className="chip" onClick={finish}>
              끝내기
            </button>
          ) : undefined
        }
      />
      <div className="staff-area" ref={staffRef}>
        <div key={`${questionId}-${game.wrong}`} className={revealed ? 'shake fill' : 'appear fill'}>
          <Staff
            fluid
            kind={spec.staff}
            width={staffWidth}
            notes={[
              {
                id: questionId,
                pitches: current.pitches,
                clef: current.clef,
                beats: 4,
                x: staffWidth / 2 + 10,
                state: revealed ? 'wrong' : 'normal',
                label,
              },
            ]}
          />
        </div>
        {isChord && phase === 'play' && (
          <div className="collect-dots" aria-label="모은 음">
            {current.pitches.map((_, i) => (
              <span key={i} className={i < collected.length ? 'on' : ''} />
            ))}
          </div>
        )}
        {pop && (
          <div key={pop.id} className={`pop ${pop.good ? 'good' : 'bad'}`}>
            {pop.text}
          </div>
        )}
        {phase === 'ready' && (
          <div className="overlay">
            <h3>{spec.tab === 'free' ? '자유 연습' : spec.title}</h3>
            <p>
              {spec.desc}
              <br />
              {isChord ? '화음의 세 음을 모두 누르면 정답! (하나씩 눌러도, 한 번에 눌러도 돼요)' : '나오는 음표를 건반에서 찾아 누르세요.'}
              <br />
              {timed ? `${spec.duration}초 동안 도전` : '시간 제한 없음 — 끝내기 버튼으로 마쳐요'}
              {spec.target !== undefined && ` · 목표 ${spec.target}점`}
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
        marks={keyMarks}
        showLabels={settings.showKeyLabels}
        nameStyle={settings.nameStyle}
      />
    </div>
  );
}
