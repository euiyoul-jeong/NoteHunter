import { diatonic, fromDiatonic, toMidi, type Accidental, type Pitch, type Step } from './notes';

export type Quality = 'major' | 'minor' | 'dim';

/** 근음으로부터 3음·5음까지의 반음 수 */
const INTERVALS: Record<Quality, [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
};

/** C장조의 흰 건반 3화음 (B 감3화음은 초보 과정에서 제외) */
export const DIATONIC_QUALITY: Partial<Record<Step, Quality>> = {
  C: 'major',
  D: 'minor',
  E: 'minor',
  F: 'major',
  G: 'major',
  A: 'minor',
};

/**
 * 3화음 구성음(낮은 음부터). 음이름을 3도씩 쌓고 반음 수로 ♯/♭을 정하므로 철자가 정확하다.
 * inversion 1 = 첫째 자리바꿈(3음이 맨 아래), 2 = 둘째 자리바꿈.
 */
export function triad(root: Pitch, quality: Quality, inversion: 0 | 1 | 2 = 0): Pitch[] {
  const rootMidi = toMidi(root);
  const tones = INTERVALS[quality].map((semis, k) => {
    const natural = fromDiatonic(diatonic(root) + 2 * k);
    const acc = rootMidi + semis - toMidi(natural);
    if (acc < -1 || acc > 1) throw new Error('겹임시표가 필요한 화음');
    return { ...natural, accidental: acc as Accidental };
  });
  for (let i = 0; i < inversion; i++) {
    const lowest = tones.shift()!;
    tones.push({ ...lowest, octave: lowest.octave + 1 });
  }
  return tones;
}

/** 코드 이름 (예: C, Dm, F♯m) */
export function chordName(root: Pitch, quality: Quality): string {
  const acc = root.accidental === 1 ? '♯' : root.accidental === -1 ? '♭' : '';
  return root.step + acc + (quality === 'minor' ? 'm' : quality === 'dim' ? 'dim' : '');
}
