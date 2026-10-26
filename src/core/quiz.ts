import { DIATONIC_QUALITY, chordName, triad, type Quality } from './chords';
import { clefFor, diatonic, fromDiatonic, parsePitch, toMidi, type Clef, type Pitch, type StaffKind } from './notes';

// 음표 퀴즈: 모드별 레벨과 자유 설정을 모두 QuizSpec 으로 만들어 퀴즈 화면에 넘긴다.

export type QuizMode = 'treble' | 'bass' | 'grand' | 'chord';
export type QuizTab = QuizMode | 'free';

/** 한 문제: 단음이면 pitches 1개, 화음이면 3개 */
export interface Question {
  pitches: Pitch[];
  clef: Clef;
  /** 화음 이름 (예: Dm) */
  name?: string;
}

export interface QuizSpec {
  key: string;
  tab: QuizTab;
  title: string;
  desc: string;
  staff: StaffKind;
  pool: Question[];
  /** 제한 시간(초), 0 이면 무제한 */
  duration: number;
  /** 목표 점수(⭐) */
  target?: number;
}

export const MODES: { id: QuizMode; label: string; desc: string }[] = [
  { id: 'treble', label: '높은음자리표', desc: '오른손 음역 (가온 다 위)' },
  { id: 'bass', label: '낮은음자리표', desc: '왼손 음역 (가온 다 아래)' },
  { id: 'grand', label: '큰보표', desc: '높은음+낮은음자리표 함께 (양손 악보)' },
  { id: 'chord', label: '화음', desc: '세 음을 한 번에 읽고 누르기' },
];

// ---------- 문제 풀 만들기 ----------

/** from~to 사이의 흰 건반 음 전부 */
export function naturals(from: string, to: string): Pitch[] {
  const result: Pitch[] = [];
  for (let d = diatonic(parsePitch(from)); d <= diatonic(parsePitch(to)); d++) result.push(fromDiatonic(d));
  return result;
}

/** from~to 사이 검은 건반 음을 ♯·♭ 두 가지 표기로 */
export function blackKeys(from: string, to: string): Pitch[] {
  const lo = toMidi(parsePitch(from));
  const hi = toMidi(parsePitch(to));
  const result: Pitch[] = [];
  for (const n of naturals(from, to)) {
    if (n.step !== 'E' && n.step !== 'B') result.push({ ...n, accidental: 1 });
    if (n.step !== 'C' && n.step !== 'F') result.push({ ...n, accidental: -1 });
  }
  return result.filter((p) => toMidi(p) >= lo && toMidi(p) <= hi);
}

function singles(pitches: Pitch[], staff: StaffKind): Question[] {
  return pitches.map((p) => ({ pitches: [p], clef: staff === 'grand' ? clefFor(p) : staff }));
}

interface TriadOptions {
  inversions?: boolean;
  accidentals?: boolean;
  /** 생략하면 가장 낮은 음 기준으로 큰보표 위치를 정한다 */
  clef?: Clef;
  /** 가장 높은 구성음 한계 */
  maxTop?: string;
}

/** 근음 lowRoot~highRoot 범위의 3화음들 */
export function triads(lowRoot: string, highRoot: string, opts: TriadOptions = {}): Question[] {
  const maxTop = opts.maxTop ? toMidi(parsePitch(opts.maxTop)) : Infinity;
  const result: Question[] = [];
  for (const root of naturals(lowRoot, highRoot)) {
    const qualities: Quality[] = opts.accidentals
      ? ['major', 'minor']
      : DIATONIC_QUALITY[root.step]
        ? [DIATONIC_QUALITY[root.step]!]
        : [];
    for (const q of qualities) {
      for (const inv of opts.inversions ? ([0, 1, 2] as const) : ([0] as const)) {
        const pitches = triad(root, q, inv);
        if (toMidi(pitches[2]) > maxTop) continue;
        result.push({ pitches, clef: opts.clef ?? clefFor(pitches[0]), name: chordName(root, q) });
      }
    }
  }
  return result;
}

// ---------- 모드별 레벨 ----------

interface LevelDef {
  title: string;
  desc: string;
  staff: StaffKind;
  pool: Question[];
  target: number;
}

const LEVEL_DEFS: Record<QuizMode, LevelDef[]> = {
  treble: [
    { title: '도 ~ 솔', desc: '가온 다(C4)부터 솔까지 다섯 음', staff: 'treble', pool: singles(naturals('C4', 'G4'), 'treble'), target: 150 },
    { title: '도 ~ 높은 도', desc: '한 옥타브 C4–C5', staff: 'treble', pool: singles(naturals('C4', 'C5'), 'treble'), target: 180 },
    { title: '오선 전체', desc: 'C4–G5, 오선 위아래 모두', staff: 'treble', pool: singles(naturals('C4', 'G5'), 'treble'), target: 200 },
    { title: '덧줄 정복', desc: 'C4–C6, 위쪽 덧줄까지', staff: 'treble', pool: singles(naturals('C4', 'C6'), 'treble'), target: 200 },
    {
      title: '샵과 플랫',
      desc: '♯·♭이 붙은 음 — 검은 건반',
      staff: 'treble',
      pool: singles([...naturals('C4', 'C5'), ...blackKeys('C4', 'C5')], 'treble'),
      target: 180,
    },
  ],
  bass: [
    { title: '낮은 도 ~ 솔', desc: 'C3부터 솔까지 다섯 음', staff: 'bass', pool: singles(naturals('C3', 'G3'), 'bass'), target: 150 },
    { title: '낮은 도 ~ 가온 다', desc: '한 옥타브 C3–C4', staff: 'bass', pool: singles(naturals('C3', 'C4'), 'bass'), target: 180 },
    { title: '오선 전체', desc: 'G2–C4, 오선 위아래 모두', staff: 'bass', pool: singles(naturals('G2', 'C4'), 'bass'), target: 200 },
    { title: '덧줄 정복', desc: 'C2–C4, 아래쪽 덧줄까지', staff: 'bass', pool: singles(naturals('C2', 'C4'), 'bass'), target: 200 },
    {
      title: '샵과 플랫',
      desc: '♯·♭이 붙은 음 — 검은 건반',
      staff: 'bass',
      pool: singles([...naturals('C3', 'C4'), ...blackKeys('C3', 'C4')], 'bass'),
      target: 180,
    },
  ],
  grand: [
    { title: '가온 다 주변', desc: 'G3–G4, 두 보표 사이를 오가기', staff: 'grand', pool: singles(naturals('G3', 'G4'), 'grand'), target: 150 },
    { title: '두 옥타브', desc: 'C3–C5', staff: 'grand', pool: singles(naturals('C3', 'C5'), 'grand'), target: 170 },
    { title: '두 보표 전체', desc: 'G2–G5', staff: 'grand', pool: singles(naturals('G2', 'G5'), 'grand'), target: 180 },
    { title: '덧줄 정복', desc: 'E2–A5, 위아래 덧줄까지', staff: 'grand', pool: singles(naturals('E2', 'A5'), 'grand'), target: 180 },
    {
      title: '샵과 플랫',
      desc: 'C3–C5의 ♯·♭',
      staff: 'grand',
      pool: singles([...naturals('C3', 'C5'), ...blackKeys('C3', 'C5')], 'grand'),
      target: 160,
    },
  ],
  chord: [
    { title: '기본 3화음', desc: '높은음자리표 C·Dm·Em·F·G·Am', staff: 'treble', pool: triads('C4', 'A4', { clef: 'treble' }), target: 240 },
    {
      title: '자리바꿈',
      desc: '높은음자리표, 자리바꿈 포함',
      staff: 'treble',
      pool: triads('C4', 'A4', { clef: 'treble', inversions: true, maxTop: 'C6' }),
      target: 240,
    },
    { title: '낮은음 화음', desc: '낮은음자리표 기본 3화음', staff: 'bass', pool: triads('G2', 'F3', { clef: 'bass' }), target: 240 },
    {
      title: '샵·플랫 화음',
      desc: '장3화음·단3화음 (예: D = 레·파♯·라)',
      staff: 'treble',
      pool: triads('C4', 'A4', { clef: 'treble', accidentals: true }),
      target: 210,
    },
    {
      title: '큰보표 화음',
      desc: '양쪽 보표, 자리바꿈 포함',
      staff: 'grand',
      pool: [
        ...triads('C4', 'G4', { clef: 'treble', inversions: true }),
        ...triads('G2', 'F3', { clef: 'bass', inversions: true, maxTop: 'B3' }),
      ],
      target: 210,
    },
  ],
};

export const LEVEL_COUNT = 5;

export function levelSpecs(mode: QuizMode): QuizSpec[] {
  return LEVEL_DEFS[mode].map((def, i) => ({
    ...def,
    key: `${mode}-${i + 1}`,
    tab: mode,
    title: `Lv.${i + 1} ${def.title}`,
    duration: 60,
  }));
}

// ---------- 자유 연습 ----------

export interface FreeConfig {
  staff: StaffKind;
  content: 'single' | 'triad';
  inversions: boolean;
  accidentals: boolean;
  range: 'narrow' | 'wide';
  /** 초, 0 = 무제한 */
  duration: number;
}

export const DEFAULT_FREE: FreeConfig = {
  staff: 'treble',
  content: 'single',
  inversions: false,
  accidentals: false,
  range: 'narrow',
  duration: 60,
};

const SINGLE_RANGE: Record<StaffKind, Record<FreeConfig['range'], [string, string]>> = {
  treble: { narrow: ['C4', 'C5'], wide: ['C4', 'C6'] },
  bass: { narrow: ['C3', 'C4'], wide: ['C2', 'C4'] },
  grand: { narrow: ['C3', 'C5'], wide: ['E2', 'A5'] },
};

function freeTriads(clef: Clef, c: FreeConfig): Question[] {
  const opts = { clef, inversions: c.inversions, accidentals: c.accidentals };
  if (clef === 'treble') {
    return c.range === 'narrow' ? triads('C4', 'G4', { ...opts, maxTop: 'G5' }) : triads('C4', 'A5', { ...opts, maxTop: 'C6' });
  }
  return c.range === 'narrow' ? triads('G2', 'F3', { ...opts, maxTop: 'C4' }) : triads('C2', 'A3', { ...opts, maxTop: 'E4' });
}

export const STAFF_LABEL: Record<StaffKind, string> = { treble: '높은음자리표', bass: '낮은음자리표', grand: '큰보표' };

export function freeKey(c: FreeConfig): string {
  return `free:${c.staff}-${c.content}-${+c.inversions}-${+c.accidentals}-${c.range}-${c.duration}`;
}

export function freeSpec(c: FreeConfig): QuizSpec {
  let pool: Question[];
  if (c.content === 'single') {
    const [lo, hi] = SINGLE_RANGE[c.staff][c.range];
    pool = singles([...naturals(lo, hi), ...(c.accidentals ? blackKeys(lo, hi) : [])], c.staff);
  } else {
    pool = c.staff === 'grand' ? [...freeTriads('treble', c), ...freeTriads('bass', c)] : freeTriads(c.staff, c);
  }
  const parts = [
    STAFF_LABEL[c.staff],
    c.content === 'single' ? '단음' : c.inversions ? '3화음+자리바꿈' : '3화음',
    c.accidentals ? '♯♭ 포함' : null,
    c.range === 'wide' ? '넓은 음역' : '좁은 음역',
  ].filter(Boolean);
  return {
    key: freeKey(c),
    tab: 'free',
    title: '자유 연습',
    desc: parts.join(' · '),
    staff: c.staff,
    pool,
    duration: c.duration,
  };
}

function parseFreeKey(key: string): FreeConfig {
  const [staff, content, inv, acc, range, duration] = key.slice('free:'.length).split('-');
  return {
    staff: staff as StaffKind,
    content: content as FreeConfig['content'],
    inversions: inv === '1',
    accidentals: acc === '1',
    range: range as FreeConfig['range'],
    duration: Number(duration),
  };
}

/** 레벨 키('bass-3') 또는 자유 연습 키('free:...')로 퀴즈 명세 찾기 */
export function getSpec(key: string): QuizSpec {
  if (key.startsWith('free:')) return freeSpec(parseFreeKey(key));
  const [mode, num] = key.split('-');
  const spec = LEVEL_DEFS[mode as QuizMode] && levelSpecs(mode as QuizMode)[Number(num) - 1];
  if (!spec) throw new Error(`퀴즈 없음: ${key}`);
  return spec;
}

/** 콤보가 쌓일수록 배수 증가(최대 4배). 화음은 음 개수만큼 곱한다. */
export function quizPoints(combo: number, noteCount = 1): number {
  return 10 * Math.min(4, 1 + Math.floor(combo / 5)) * noteCount;
}

export function randomQuestion(pool: Question[], prev?: Question): Question {
  const same = (a: Question, b: Question) =>
    a.pitches.length === b.pitches.length && a.pitches.every((p, i) => toMidi(p) === toMidi(b.pitches[i]));
  const candidates = prev && pool.length > 1 ? pool.filter((q) => !same(q, prev)) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
