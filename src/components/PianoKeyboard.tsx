import { useMemo, useState } from 'react';
import { MIDDLE_C, isBlackKey, midiToPitch, pitchName, type NameStyle } from '../core/notes';
import { playNote, unlockAudio } from '../core/audio';

/** correct/wrong 은 잠깐, held 는 화음 모으는 동안 유지, hint 는 정답 안내, play 는 듣기 자동 연주 */
export type KeyMark = 'correct' | 'wrong' | 'hint' | 'held' | 'play';

interface Props {
  /** 건반 범위(양 끝은 흰 건반) */
  low: number;
  high: number;
  onPress?: (midi: number) => void;
  marks?: Partial<Record<number, KeyMark>>;
  showLabels: boolean;
  nameStyle: NameStyle;
  disabled?: boolean;
}

export function PianoKeyboard({ low, high, onPress, marks = {}, showLabels, nameStyle, disabled = false }: Props) {
  // 멀티터치: 포인터별로 눌린 건반을 기억
  const [pressed, setPressed] = useState<Record<number, number>>({});
  const { midis, whites } = useMemo(() => {
    const all = Array.from({ length: high - low + 1 }, (_, i) => low + i);
    return { midis: all, whites: all.filter((m) => !isBlackKey(m)) };
  }, [low, high]);
  const whiteW = 100 / whites.length;
  const blackW = whiteW * 0.62;

  const down = (e: React.PointerEvent, midi: number) => {
    e.preventDefault();
    if (disabled) return;
    unlockAudio();
    playNote(midi);
    setPressed((p) => ({ ...p, [e.pointerId]: midi }));
    onPress?.(midi);
  };
  const up = (e: React.PointerEvent) => {
    setPressed((p) => {
      if (!(e.pointerId in p)) return p;
      const next = { ...p };
      delete next[e.pointerId];
      return next;
    });
  };
  const isDown = (midi: number) => Object.values(pressed).includes(midi);

  const keyProps = (midi: number) => ({
    'data-midi': midi,
    onPointerDown: (e: React.PointerEvent) => down(e, midi),
    onPointerUp: up,
    onPointerCancel: up,
    onPointerLeave: up,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const markClass = (midi: number) => [isDown(midi) && 'down', marks[midi] && `mark-${marks[midi]}`].filter(Boolean).join(' ');
  // 건반이 많으면 라벨을 줄인다
  const dense = whites.length > 18;

  return (
    <div className={`keyboard ${disabled ? 'disabled' : ''} ${dense ? 'dense' : ''}`}>
      {whites.map((midi, i) => (
        <div
          key={midi}
          className={`key white ${markClass(midi)}`}
          style={{ left: `${i * whiteW}%`, width: `${whiteW}%` }}
          {...keyProps(midi)}
        >
          {showLabels && <span className="key-label">{pitchName(midiToPitch(midi), nameStyle)}</span>}
          {midi === MIDDLE_C && <span className="middle-c" title="가온 다(C4)" />}
        </div>
      ))}
      {midis.filter(isBlackKey).map((midi) => {
        const leftWhite = whites.indexOf(midi - 1);
        return (
          <div
            key={midi}
            className={`key black ${markClass(midi)}`}
            style={{ left: `${(leftWhite + 1) * whiteW - blackW / 2}%`, width: `${blackW}%` }}
            {...keyProps(midi)}
          >
            {showLabels && !dense && <span className="key-label">{pitchName(midiToPitch(midi), nameStyle)}</span>}
          </div>
        );
      })}
    </div>
  );
}
