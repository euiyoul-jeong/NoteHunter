import { describe, expect, it } from 'vitest';
import { chordName, triad } from '../src/core/chords';
import { pitchName, parsePitch, staffStep, toMidi } from '../src/core/notes';
import { MODES, freeKey, freeSpec, getSpec, levelSpecs, quizPoints, type FreeConfig } from '../src/core/quiz';

const names = (ps: ReturnType<typeof triad>) => ps.map((p) => pitchName(p, 'letter') + p.octave).join(' ');

describe('화음', () => {
  it('철자', () => {
    expect(names(triad(parsePitch('C4'), 'major'))).toBe('C4 E4 G4');
    expect(names(triad(parsePitch('D4'), 'major'))).toBe('D4 F♯4 A4');
    expect(names(triad(parsePitch('F4'), 'minor'))).toBe('F4 A♭4 C5');
    expect(names(triad(parsePitch('B3'), 'major'))).toBe('B3 D♯4 F♯4');
  });

  it('자리바꿈', () => {
    expect(names(triad(parsePitch('C4'), 'major', 1))).toBe('E4 G4 C5');
    expect(names(triad(parsePitch('C4'), 'major', 2))).toBe('G4 C5 E5');
  });

  it('이름', () => {
    expect(chordName(parsePitch('D4'), 'minor')).toBe('Dm');
    expect(chordName(parsePitch('F#4'), 'major')).toBe('F♯');
  });
});

const allConfigs = (): FreeConfig[] => {
  const result: FreeConfig[] = [];
  for (const staff of ['treble', 'bass', 'grand'] as const)
    for (const content of ['single', 'triad'] as const)
      for (const inversions of [false, true])
        for (const accidentals of [false, true])
          for (const range of ['narrow', 'wide'] as const) result.push({ staff, content, inversions, accidentals, range, duration: 60 });
  return result;
};

describe('퀴즈 문제 풀', () => {
  const specs = [...MODES.flatMap((m) => levelSpecs(m.id)), ...allConfigs().map(freeSpec)];

  it.each(specs.map((s) => [s.key, s] as const))('%s — 문제가 있고 보표에서 읽을 수 있는 위치', (_key, spec) => {
    expect(spec.pool.length).toBeGreaterThan(3);
    for (const q of spec.pool) {
      expect([1, 3]).toContain(q.pitches.length);
      if (spec.staff !== 'grand') expect(q.clef).toBe(spec.staff);
      for (const p of q.pitches) {
        // 덧줄 3개 이내
        const step = staffStep(p, q.clef);
        expect(step).toBeGreaterThanOrEqual(-6);
        expect(step).toBeLessThanOrEqual(14);
        expect(toMidi(p)).toBeGreaterThanOrEqual(36);
        expect(toMidi(p)).toBeLessThanOrEqual(84);
      }
    }
  });

  it('화음 모드는 모두 3화음', () => {
    for (const spec of levelSpecs('chord')) for (const q of spec.pool) expect(q.pitches).toHaveLength(3);
  });

  it('레벨 1 높은음은 도~솔 다섯 음', () => {
    expect(levelSpecs('treble')[0].pool.map((q) => q.pitches[0].step)).toEqual(['C', 'D', 'E', 'F', 'G']);
  });

  it('키로 다시 찾기', () => {
    expect(getSpec('bass-3').title).toBe(levelSpecs('bass')[2].title);
    const c: FreeConfig = { staff: 'grand', content: 'triad', inversions: true, accidentals: false, range: 'wide', duration: 0 };
    const spec = getSpec(freeKey(c));
    expect(spec.key).toBe(freeKey(c));
    expect(spec.duration).toBe(0);
    expect(spec.pool.length).toBe(freeSpec(c).pool.length);
  });

  it('점수: 콤보 배수, 화음은 음 개수만큼', () => {
    expect(quizPoints(0)).toBe(10);
    expect(quizPoints(5)).toBe(20);
    expect(quizPoints(100)).toBe(40);
    expect(quizPoints(0, 3)).toBe(30);
  });
});
