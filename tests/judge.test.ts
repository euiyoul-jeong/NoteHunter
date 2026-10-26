import { describe, expect, it } from 'vitest';
import { GOOD_WINDOW, PERFECT_WINDOW, hasPendingNear, isMissed, judgeOffset, pickTarget, type Target } from '../src/core/judge';

const t = (time: number, midi: number, judged = false): Target => ({ time, midi, judged });

describe('judge', () => {
  it('판정 경계', () => {
    expect(judgeOffset(0)).toBe('perfect');
    expect(judgeOffset(-PERFECT_WINDOW)).toBe('perfect');
    expect(judgeOffset(PERFECT_WINDOW + 0.001)).toBe('good');
    expect(judgeOffset(-GOOD_WINDOW)).toBe('good');
    expect(judgeOffset(GOOD_WINDOW + 0.001)).toBeNull();
  });

  it('누른 음과 같은 음 중 가장 가까운 대상', () => {
    const targets = [t(1, 60), t(1.1, 60), t(2, 60)];
    expect(pickTarget(targets, 1.08, 60)).toBe(1);
    targets[1].judged = true;
    expect(pickTarget(targets, 1.08, 60)).toBe(0);
    expect(pickTarget(targets, 1.5, 60)).toBe(-1);
  });

  it('화음: 같은 시각의 다른 음을 각각 판정', () => {
    const chord = [t(1, 60), t(1, 64), t(1, 67)];
    expect(pickTarget(chord, 1.01, 64)).toBe(1);
    expect(pickTarget(chord, 1.01, 67)).toBe(2);
    expect(pickTarget(chord, 1.01, 62)).toBe(-1); // 화음에 없는 음
    expect(hasPendingNear(chord, 1.01)).toBe(true); // → 오답 입력
    expect(hasPendingNear(chord, 1.5)).toBe(false); // 아무것도 없을 때 누르면 무시
  });

  it('놓친 음표', () => {
    expect(isMissed(1, 1.1)).toBe(false);
    expect(isMissed(1, 1 + GOOD_WINDOW + 0.01)).toBe(true);
  });
});
