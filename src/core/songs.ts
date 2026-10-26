import { parsePitch, toMidi, type Clef, type Pitch, type StaffKind } from './notes';

// 곡 표기법: 공백으로 구분한 토큰, '|' 는 마디줄.
//   음표 = 음높이 + 길이 (w 온음표, h 2분, q 4분, e 8분) + 선택적 '.'(점음표)  예) C4q, F#4h, D4q.
//   화음 = 음높이를 '+' 로 연결                                                예) C3+E3+G3h
//   쉼표 = R + 길이                                                           예) Rq
// 양손 곡은 높은음자리표(오른손)와 낮은음자리표(왼손) 성부를 따로 적는다.

export interface SongNote {
  /** 빈 배열이면 쉼표 */
  pitches: Pitch[];
  beats: number;
  /** 곡 시작부터의 박 위치 */
  startBeat: number;
  measure: number;
  clef: Clef;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  beatsPerMeasure: number;
  staff: StaffKind;
  /** 모든 성부의 음표, 박 위치 순 */
  notes: SongNote[];
}

/** 같은 박에 시작하는 음들의 묶음 — 따라 치기의 한 단계 */
export interface SongStep {
  startBeat: number;
  noteIndexes: number[];
  midis: number[];
}

const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5 };
const PITCH = '[A-G][#b]?-?\\d';
const TOKEN = new RegExp(`^(R|${PITCH}(?:\\+${PITCH})*)([whqe])(\\.?)$`);

export function parseSong(source: string, clef: Clef = 'treble'): SongNote[] {
  const notes: SongNote[] = [];
  let beat = 0;
  let measure = 0;
  for (const token of source.trim().split(/\s+/)) {
    if (token === '|') {
      measure++;
      continue;
    }
    const m = TOKEN.exec(token);
    if (!m) throw new Error(`잘못된 토큰: ${token}`);
    const beats = DURATIONS[m[2]] * (m[3] ? 1.5 : 1);
    const pitches = m[1] === 'R' ? [] : m[1].split('+').map(parsePitch).sort((a, b) => toMidi(a) - toMidi(b));
    notes.push({ pitches, beats, startBeat: beat, measure, clef });
    beat += beats;
  }
  return notes;
}

const song = (
  id: string,
  title: string,
  bpm: number,
  beatsPerMeasure: number,
  voices: { treble?: string; bass?: string },
): Song => {
  const notes = [
    ...(voices.treble ? parseSong(voices.treble, 'treble') : []),
    ...(voices.bass ? parseSong(voices.bass, 'bass') : []),
  ].sort((a, b) => a.startBeat - b.startBeat || (a.clef === 'treble' ? -1 : 1));
  const staff: StaffKind = voices.treble && voices.bass ? 'grand' : voices.bass ? 'bass' : 'treble';
  return { id, title, bpm, beatsPerMeasure, staff, notes };
};

export function songSteps(s: Song): SongStep[] {
  const steps = new Map<number, SongStep>();
  s.notes.forEach((n, i) => {
    if (n.pitches.length === 0) return;
    const step = steps.get(n.startBeat) ?? { startBeat: n.startBeat, noteIndexes: [], midis: [] };
    step.noteIndexes.push(i);
    for (const p of n.pitches) if (!step.midis.includes(toMidi(p))) step.midis.push(toMidi(p));
    steps.set(n.startBeat, step);
  });
  return [...steps.values()].sort((a, b) => a.startBeat - b.startBeat);
}

export function songMidis(s: Song): number[] {
  return s.notes.flatMap((n) => n.pitches.map(toMidi));
}

// 멜로디 원본 (C장조)
const AIRPLANE = `
  E4q D4q C4q D4q | E4q E4q E4h | D4q D4q D4h | E4q G4q G4h |
  E4q D4q C4q D4q | E4q E4q E4h | D4q D4q E4q D4q | C4w`;
const TWINKLE = `
  C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h |
  G4q G4q F4q F4q | E4q E4q D4h | G4q G4q F4q F4q | E4q E4q D4h |
  C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h`;
const JOY = `
  E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h |
  E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | D4q. C4e C4h`;

// 왼손 반주 화음: 자리바꿈으로 손 위치를 거의 움직이지 않게 배치
const C = 'C3+E3+G3';
const F = 'C3+F3+A3';
const G = 'B2+D3+G3';

// 저작권 문제 없는 민요·공유 저작물 멜로디
export const SONGS: Song[] = [
  // 높은음자리표
  song('airplane', '비행기', 100, 4, { treble: AIRPLANE }),
  song('butterfly', '나비야', 100, 4, {
    treble: `
    G4q E4q E4h | F4q D4q D4h | C4q D4q E4q F4q | G4q G4q G4h |
    G4q E4q E4q E4q | F4q D4q D4q D4q | C4q E4q G4q G4q | E4q E4q E4h`,
  }),
  song('twinkle', '반짝반짝 작은별', 96, 4, { treble: TWINKLE }),
  song('joy', '환희의 송가', 100, 4, { treble: JOY }),
  song('birthday', '생일 축하합니다', 90, 3, {
    treble: `
    G4e G4e | A4q G4q C5q | B4h G4e G4e | A4q G4q D5q | C5h G4e G4e |
    G5q E5q C5q | B4q A4q F5e F5e | E5q C5q D5q | C5h.`,
  }),
  // 낮은음자리표
  song('london', '런던 다리', 100, 4, {
    bass: `
    G3q. A3e G3q F3q | E3q F3q G3h | D3q E3q F3h | E3q F3q G3h |
    G3q. A3e G3q F3q | E3q F3q G3h | D3h G3h | E3q C3h.`,
  }),
  song('jacques', '자크 형제', 100, 4, {
    bass: `
    C3q D3q E3q C3q | C3q D3q E3q C3q | E3q F3q G3h | E3q F3q G3h |
    G3e A3e G3e F3e E3q C3q | G3e A3e G3e F3e E3q C3q | C3q G2q C3h | C3q G2q C3h`,
  }),
  // 양손 (큰보표)
  song('airplane-2h', '비행기 (양손)', 90, 4, {
    treble: AIRPLANE,
    bass: 'C3w | C3w | G2w | C3w | C3w | C3w | G2w | C3w',
  }),
  song('twinkle-2h', '반짝반짝 작은별 (양손)', 84, 4, {
    treble: TWINKLE,
    bass: `
    ${C}w | ${F}h ${C}h | ${F}h ${C}h | ${G}h ${C}h |
    ${C}h ${F}h | ${C}h ${G}h | ${C}h ${F}h | ${C}h ${G}h |
    ${C}w | ${F}h ${C}h | ${F}h ${C}h | ${G}h ${C}h`,
  }),
  song('joy-2h', '환희의 송가 (양손)', 90, 4, {
    treble: JOY,
    bass: `${C}w | ${G}w | ${C}w | ${C}h ${G}h | ${C}w | ${G}w | ${C}w | ${G}h ${C}h`,
  }),
];

export function getSong(id: string): Song {
  const s = SONGS.find((x) => x.id === id);
  if (!s) throw new Error(`곡 없음: ${id}`);
  return s;
}
