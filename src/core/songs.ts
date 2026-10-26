import { parsePitch, toMidi, type Clef, type Pitch, type StaffKind } from './notes';

// 곡 표기법: 공백으로 구분한 토큰, '|' 는 마디줄.
//   음표 = 음높이 + 길이 (w 온음표, h 2분, q 4분, e 8분) + 선택적 '.'(점음표)  예) C4q, F#4h, D4q.
//   화음 = 음높이를 '+' 로 연결                                                예) C3+E3+G3h
//   쉼표 = R + 길이                                                           예) Rq
//   붙임줄 = 끝에 '~' — 다음 음표(같은 음)까지 소리를 이어 내고, 다음 음은 누르지 않는다  예) C4w~ | C4q
// 양손 곡은 높은음자리표(오른손)와 낮은음자리표(왼손) 성부를 따로 적는다.

export interface SongNote {
  /** 빈 배열이면 쉼표 */
  pitches: Pitch[];
  beats: number;
  /** 곡 시작부터의 박 위치 */
  startBeat: number;
  measure: number;
  clef: Clef;
  /** 다음 음표와 붙임줄로 이어짐 */
  tieNext?: boolean;
  /** 앞 음표에서 붙임줄로 이어진 음 — 누르지 않고 소리만 이어진다 */
  tied?: boolean;
  /** 붙임줄을 포함해 소리가 나는 길이(박) */
  holdBeats: number;
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
const TOKEN = new RegExp(`^(R|${PITCH}(?:\\+${PITCH})*)([whqe])(\\.?)(~?)$`);

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
    notes.push({ pitches, beats, startBeat: beat, measure, clef, tieNext: m[4] === '~' && pitches.length > 0, holdBeats: beats });
    beat += beats;
  }
  for (let i = notes.length - 1; i >= 0; i--) {
    const next = notes[i + 1];
    if (notes[i].tieNext && next && next.pitches.length > 0) {
      next.tied = true;
      notes[i].holdBeats = notes[i].beats + next.holdBeats;
    } else {
      notes[i].tieNext = false;
    }
  }
  return notes;
}

/** 붙임줄: 앞 음표 index → 이어지는 음표 index (악보에 붙임줄을 그릴 때) */
export function tieTargets(notes: SongNote[]): Map<number, number> {
  const map = new Map<number, number>();
  notes.forEach((n, i) => {
    if (!n.tieNext) return;
    const end = n.startBeat + n.beats;
    const j = notes.findIndex((o, k) => k > i && o.tied && o.clef === n.clef && o.startBeat === end);
    if (j >= 0) map.set(i, j);
  });
  return map;
}

export function buildSong(
  id: string,
  title: string,
  bpm: number,
  beatsPerMeasure: number,
  voices: { treble?: string; bass?: string },
): Song {
  const notes = [
    ...(voices.treble ? parseSong(voices.treble, 'treble') : []),
    ...(voices.bass ? parseSong(voices.bass, 'bass') : []),
  ].sort((a, b) => a.startBeat - b.startBeat || (a.clef === 'treble' ? -1 : 1));
  const staff: StaffKind = voices.treble && voices.bass ? 'grand' : voices.bass ? 'bass' : 'treble';
  return { id, title, bpm, beatsPerMeasure, staff, notes };
}

export function songSteps(s: Song): SongStep[] {
  const steps = new Map<number, SongStep>();
  s.notes.forEach((n, i) => {
    if (n.pitches.length === 0 || n.tied) return;
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
  buildSong('airplane', '비행기', 100, 4, { treble: AIRPLANE }),
  buildSong('butterfly', '나비야', 100, 4, {
    treble: `
    G4q E4q E4h | F4q D4q D4h | C4q D4q E4q F4q | G4q G4q G4h |
    G4q E4q E4q E4q | F4q D4q D4q D4q | C4q E4q G4q G4q | E4q E4q E4h`,
  }),
  buildSong('twinkle', '반짝반짝 작은별', 96, 4, { treble: TWINKLE }),
  buildSong('joy', '환희의 송가', 100, 4, { treble: JOY }),
  buildSong('birthday', '생일 축하합니다', 90, 3, {
    treble: `
    G4e G4e | A4q G4q C5q | B4h G4e G4e | A4q G4q D5q | C5h G4e G4e |
    G5q E5q C5q | B4q A4q F5e F5e | E5q C5q D5q | C5h.`,
  }),
  buildSong('jingle', '징글벨', 110, 4, {
    treble: `
    E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w |
    F4q F4q F4q. F4e | F4q E4q E4q E4e E4e | E4q D4q D4q E4q | D4h G4h |
    E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w |
    F4q F4q F4q F4q | F4q E4q E4q E4e E4e | G4q G4q F4q D4q | C4w`,
  }),
  buildSong('hotcross', '핫 크로스 번', 100, 4, {
    treble: `E4q D4q C4h | E4q D4q C4h | C4e C4e C4e C4e D4e D4e D4e D4e | E4q D4q C4h`,
  }),
  buildSong('moonlight', '달빛 아래서', 96, 4, {
    treble: `
    C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4w |
    C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4w |
    D4q D4q D4q D4q | A3h A3h | D4q C4q B3q A3q | G3w |
    C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4w`,
  }),
  buildSong('yankee', '양키 두들', 110, 4, {
    treble: `
    C4q C4q D4q E4q | C4q E4q D4h | C4q C4q D4q E4q | C4h B3h |
    C4q C4q D4q E4q | F4q E4q D4q C4q | B3q G3q A3q B3q | C4h C4h`,
  }),
  buildSong('macdonald', '올드 맥도날드', 110, 4, {
    treble: `
    G4q G4q G4q D4q | E4q E4q D4h | B4q B4q A4q A4q | G4h. D4q |
    G4q G4q G4q D4q | E4q E4q D4h | B4q B4q A4q A4q | G4w`,
  }),
  // 낮은음자리표
  buildSong('london', '런던 다리', 100, 4, {
    bass: `
    G3q. A3e G3q F3q | E3q F3q G3h | D3q E3q F3h | E3q F3q G3h |
    G3q. A3e G3q F3q | E3q F3q G3h | D3h G3h | E3q C3h.`,
  }),
  buildSong('jacques', '자크 형제', 100, 4, {
    bass: `
    C3q D3q E3q C3q | C3q D3q E3q C3q | E3q F3q G3h | E3q F3q G3h |
    G3e A3e G3e F3e E3q C3q | G3e A3e G3e F3e E3q C3q | C3q G2q C3h | C3q G2q C3h`,
  }),
  // 양손 (큰보표)
  buildSong('airplane-2h', '비행기 (양손)', 90, 4, {
    treble: AIRPLANE,
    bass: 'C3w | C3w | G2w | C3w | C3w | C3w | G2w | C3w',
  }),
  buildSong('twinkle-2h', '반짝반짝 작은별 (양손)', 84, 4, {
    treble: TWINKLE,
    bass: `
    ${C}w | ${F}h ${C}h | ${F}h ${C}h | ${G}h ${C}h |
    ${C}h ${F}h | ${C}h ${G}h | ${C}h ${F}h | ${C}h ${G}h |
    ${C}w | ${F}h ${C}h | ${F}h ${C}h | ${G}h ${C}h`,
  }),
  buildSong('joy-2h', '환희의 송가 (양손)', 90, 4, {
    treble: JOY,
    bass: `${C}w | ${G}w | ${C}w | ${C}h ${G}h | ${C}w | ${G}w | ${C}w | ${G}h ${C}h`,
  }),
];

// ---------- 내 곡 (기기에만 저장, 곡 코드로 가져오기) ----------

/** 사용자가 가져온 곡. 원본 표기를 그대로 저장한다. */
export interface CustomSong {
  id: string;
  title: string;
  bpm: number;
  beatsPerMeasure: number;
  treble?: string;
  bass?: string;
}

const customCache = new WeakMap<CustomSong, Song>();

function fromCustom(c: CustomSong): Song {
  let built = customCache.get(c);
  if (!built) {
    built = buildSong(c.id, c.title, c.bpm, c.beatsPerMeasure, { treble: c.treble, bass: c.bass });
    customCache.set(c, built);
  }
  return built;
}

export function allSongs(customs: CustomSong[] = []): Song[] {
  return [...SONGS, ...customs.map(fromCustom)];
}

export function getSong(id: string, customs: CustomSong[] = []): Song {
  const s = SONGS.find((x) => x.id === id) ?? customs.filter((c) => c.id === id).map(fromCustom)[0];
  if (!s) throw new Error(`곡 없음: ${id}`);
  return s;
}

/** 곡 코드 만들기 (내보내기·공유용). decodePack 으로 다시 읽을 수 있다. */
export function encodePack(songs: CustomSong[]): string {
  return JSON.stringify({
    noteHunterSongs: 1,
    songs: songs.map(({ title, bpm, beatsPerMeasure, treble, bass }) => ({ title, bpm, beatsPerMeasure, treble, bass })),
  });
}

/**
 * 곡 코드 읽기. 형식: {"noteHunterSongs":1,"songs":[{"title","bpm","beatsPerMeasure","treble","bass"}]}
 * (곡 하나만 있는 객체나 배열도 허용). 잘못된 곡이 있으면 몇 번째 곡인지와 이유를 담아 예외를 던진다.
 */
export function decodePack(text: string): Omit<CustomSong, 'id'>[] {
  let data: unknown;
  try {
    data = JSON.parse(text.trim());
  } catch {
    throw new Error('곡 코드 형식이 올바르지 않아요. 받은 코드를 처음부터 끝까지 그대로 붙여넣어 주세요.');
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { songs?: unknown }).songs)
      ? (data as { songs: unknown[] }).songs
      : [data];
  if (list.length === 0) throw new Error('곡이 들어 있지 않아요.');
  return list.map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const where = `${i + 1}번째 곡${title ? `(${title})` : ''}`;
    if (!title) throw new Error(`${where}: 제목이 없어요.`);
    const treble = typeof item.treble === 'string' && item.treble.trim() ? item.treble : undefined;
    const bass = typeof item.bass === 'string' && item.bass.trim() ? item.bass : undefined;
    if (!treble && !bass) throw new Error(`${where}: 음표가 없어요.`);
    const bpm = typeof item.bpm === 'number' && item.bpm >= 30 && item.bpm <= 240 ? item.bpm : 90;
    const beatsPerMeasure =
      typeof item.beatsPerMeasure === 'number' && [2, 3, 4].includes(item.beatsPerMeasure) ? item.beatsPerMeasure : 4;
    try {
      if (treble) parseSong(treble, 'treble');
      if (bass) parseSong(bass, 'bass');
    } catch (e) {
      throw new Error(`${where}: ${(e as Error).message}`);
    }
    return { title, bpm, beatsPerMeasure, treble, bass };
  });
}
