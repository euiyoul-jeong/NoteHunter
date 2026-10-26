import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyMark } from './PianoKeyboard';

type Marks = Partial<Record<number, KeyMark>>;

/** 건반에 잠깐 색을 입혔다가 지우는 피드백 */
export function useKeyMarks() {
  const [marks, setMarks] = useState<Marks>({});
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const flash = useCallback((midi: number, mark: KeyMark, ms = 350) => {
    setMarks((m) => ({ ...m, [midi]: mark }));
    const id = window.setTimeout(() => {
      setMarks((m) => {
        if (m[midi] !== mark) return m;
        const next = { ...m };
        delete next[midi];
        return next;
      });
    }, ms);
    timers.current.push(id);
  }, []);

  const clear = useCallback(() => setMarks({}), []);

  return { marks, flash, clear };
}
