import type { SongNote } from './songs';

export interface SongLayout {
  /** 음표 index 별 x 좌표 */
  xs: number[];
  barLines: number[];
  width: number;
}

/**
 * 곡 전체를 가로로 펼친 악보 좌표. 같은 박에 시작하는 음표(양손·화음)는 같은 x에 세로로 맞추고,
 * 다음 음까지의 길이가 길수록 간격을 넓힌다.
 */
export function layoutSong(notes: SongNote[], startX: number): SongLayout {
  const beats = [...new Set(notes.map((n) => n.startBeat))].sort((a, b) => a - b);
  const xAt = new Map<number, number>();
  const barLines: number[] = [];
  let x = startX;
  let measure = notes[0]?.measure ?? 0;
  beats.forEach((beat, i) => {
    const here = notes.filter((n) => n.startBeat === beat);
    const m = Math.max(...here.map((n) => n.measure));
    if (m !== measure) {
      barLines.push(x - 12);
      x += 10;
      measure = m;
    }
    const accidentalRoom = here.some((n) => n.pitches.some((p) => p.accidental !== 0)) ? 10 : 0;
    xAt.set(beat, x + accidentalRoom);
    const next = beats[i + 1] ?? beat + Math.max(...here.map((n) => n.beats));
    x += 34 + accidentalRoom + Math.min(next - beat, 4) * 14;
  });
  barLines.push(x - 12);
  return { xs: notes.map((n) => xAt.get(n.startBeat)!), barLines, width: x + 4 };
}
