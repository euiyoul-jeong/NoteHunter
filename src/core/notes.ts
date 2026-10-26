// 음높이 모델: 음이름(step) + 옥타브 + 임시표. MIDI 번호, 오선 위치, 표시 이름으로 변환한다.

export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = -1 | 0 | 1;
export type NameStyle = 'solfege' | 'letter';
/** 음자리표 */
export type Clef = 'treble' | 'bass';
/** 악보 형태: 한 보표(높은음/낮은음) 또는 큰보표 */
export type StaffKind = Clef | 'grand';

export interface Pitch {
  step: Step;
  octave: number;
  accidental: Accidental;
}

export const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const SOLFEGE = ['도', '레', '미', '파', '솔', '라', '시'];
const ACC_SYMBOL: Record<Accidental, string> = { [-1]: '♭', 0: '', 1: '♯' };

/** 가온 다(C4) */
export const MIDDLE_C = 60;

export function pitch(step: Step, octave: number, accidental: Accidental = 0): Pitch {
  return { step, octave, accidental };
}

export function toMidi(p: Pitch): number {
  return (p.octave + 1) * 12 + STEP_SEMITONES[STEPS.indexOf(p.step)] + p.accidental;
}

/** 흰 건반 기준 순번 (C0 = 0, 한 음이름마다 1) */
export function diatonic(p: Pitch): number {
  return p.octave * 7 + STEPS.indexOf(p.step);
}

export function fromDiatonic(d: number, accidental: Accidental = 0): Pitch {
  return pitch(STEPS[((d % 7) + 7) % 7], Math.floor(d / 7), accidental);
}

/** 오선 맨 아래 줄의 음: 높은음자리표 E4, 낮은음자리표 G2 */
const BOTTOM_LINE: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };

/** 오선에서의 위치. 맨 아래 줄 = 0, 한 칸/줄마다 1씩 증가 (맨 윗줄 = 8). */
export function staffStep(p: Pitch, clef: Clef = 'treble'): number {
  return diatonic(p) - BOTTOM_LINE[clef];
}

/** 덧줄이 필요한 위치들(오선 step 단위, 짝수 = 줄). */
export function ledgerSteps(step: number): number[] {
  const lines: number[] = [];
  for (let s = -2; s >= step; s -= 2) lines.push(s);
  for (let s = 10; s <= step; s += 2) lines.push(s);
  return lines;
}

/** 큰보표에서 그릴 보표: 가온 다 이상은 높은음, 아래는 낮은음 */
export function clefFor(p: Pitch): Clef {
  return toMidi(p) >= MIDDLE_C ? 'treble' : 'bass';
}

export function pitchName(p: Pitch, style: NameStyle): string {
  const i = STEPS.indexOf(p.step);
  const base = style === 'solfege' ? SOLFEGE[i] : p.step;
  return base + ACC_SYMBOL[p.accidental];
}

/** MIDI 번호의 기본 표기(흑건은 ♯). 건반 라벨용. */
export function midiToPitch(midi: number): Pitch {
  const octave = Math.floor(midi / 12) - 1;
  const semi = midi % 12;
  const natural = STEP_SEMITONES.indexOf(semi);
  if (natural >= 0) return pitch(STEPS[natural], octave);
  return pitch(STEPS[STEP_SEMITONES.indexOf(semi - 1)], octave, 1);
}

export function isBlackKey(midi: number): boolean {
  return !STEP_SEMITONES.includes(midi % 12);
}

/**
 * 주어진 음들을 모두 덮는 건반 범위(양 끝은 흰 건반).
 * 양쪽에 흰 건반 하나씩 여유를 두고, 흰 건반이 minWhite 개 이상이 되도록 넓힌다.
 */
export function keyboardRange(midis: number[], minWhite = 15): { low: number; high: number } {
  let low = Math.min(...midis);
  let high = Math.max(...midis);
  const down = (m: number) => {
    do m--;
    while (isBlackKey(m));
    return m;
  };
  const up = (m: number) => {
    do m++;
    while (isBlackKey(m));
    return m;
  };
  if (isBlackKey(low)) low--;
  if (isBlackKey(high)) high++;
  low = down(low);
  high = up(high);
  const whites = () => {
    let n = 0;
    for (let m = low; m <= high; m++) if (!isBlackKey(m)) n++;
    return n;
  };
  for (let grow = 0; whites() < minWhite; grow++) {
    if (grow % 2 === 0) high = up(high);
    else low = down(low);
  }
  return { low, high };
}

/** "C4", "F#4", "Bb3" 형식 파싱 */
export function parsePitch(text: string): Pitch {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(text);
  if (!m) throw new Error(`잘못된 음 표기: ${text}`);
  const acc: Accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return pitch(m[1] as Step, Number(m[3]), acc);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
