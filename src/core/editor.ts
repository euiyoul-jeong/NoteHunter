import { midiToPitch, type Clef, type Pitch } from './notes';
import { parseSong } from './songs';

// 곡 만들기 편집기의 음표 모델: 성부(오른손/왼손)마다 음표·쉼표 목록을 들고,
// 저장할 때 곡 표기 문자열(songs.ts 의 parseSong 형식)로 바꾼다.

export type Dur = 'w' | 'h' | 'q' | 'e';

export interface EditToken {
  /** 'C4', 'F#3' … 빈 배열이면 쉼표, 여러 개면 화음 */
  pitches: string[];
  dur: Dur;
  dotted: boolean;
}

const BEATS: Record<Dur, number> = { w: 4, h: 2, q: 1, e: 0.5 };

export function tokenBeats(t: EditToken): number {
  return BEATS[t.dur] * (t.dotted ? 1.5 : 1);
}

export function pitchText(p: Pitch): string {
  return p.step + (p.accidental === 1 ? '#' : p.accidental === -1 ? 'b' : '') + p.octave;
}

/** 건반 번호 → 음 표기 (검은 건반은 ♯ 표기) */
export function midiText(midi: number): string {
  return pitchText(midiToPitch(midi));
}

/** 음표 목록 → 곡 표기. 박 수가 한 마디를 채울 때마다 마디줄을 넣는다. */
export function tokensToSource(tokens: EditToken[], beatsPerMeasure: number): string {
  const parts: string[] = [];
  let beats = 0;
  tokens.forEach((t, i) => {
    const pitch = t.pitches.length ? t.pitches.join('+') : 'R';
    parts.push(pitch + t.dur + (t.dotted ? '.' : ''));
    beats += tokenBeats(t);
    const full = Math.abs(beats / beatsPerMeasure - Math.round(beats / beatsPerMeasure)) < 1e-9;
    if (full && i < tokens.length - 1) parts.push('|');
  });
  return parts.join(' ');
}

const FROM_BEATS: Record<number, [Dur, boolean]> = {
  4: ['w', false],
  3: ['h', true],
  2: ['h', false],
  1.5: ['q', true],
  1: ['q', false],
  0.75: ['e', true],
  0.5: ['e', false],
};

/** 곡 표기 → 음표 목록 (저장된 내 곡을 다시 편집할 때) */
export function sourceToTokens(source: string | undefined, clef: Clef): EditToken[] {
  if (!source?.trim()) return [];
  return parseSong(source, clef).map((n) => {
    const [dur, dotted] = FROM_BEATS[n.beats] ?? ['q', false];
    return { pitches: n.pitches.map(pitchText), dur, dotted };
  });
}

/** 음 하나 추가. 화음 묶기 중이면 마지막 음표에 쌓는다. */
export function addPitch(tokens: EditToken[], text: string, dur: Dur, dotted: boolean, stackOnLast: boolean): EditToken[] {
  const last = tokens[tokens.length - 1];
  if (stackOnLast && last && last.pitches.length > 0) {
    if (last.pitches.includes(text)) return tokens;
    return [...tokens.slice(0, -1), { ...last, pitches: [...last.pitches, text] }];
  }
  return [...tokens, { pitches: [text], dur, dotted }];
}
