// 리듬 모드 판정. 시간 단위는 초.

export type Judgement = 'perfect' | 'good' | 'miss';

export const PERFECT_WINDOW = 0.06;
export const GOOD_WINDOW = 0.13;

/** 판정 대상 하나 = 특정 시각에 눌러야 하는 건반 하나 (화음·양손은 같은 시각에 여러 개) */
export interface Target {
  time: number;
  midi: number;
  judged: boolean;
}

/** 입력 시각과 음표 시각의 차이로 판정. 판정 범위 밖이면 null. */
export function judgeOffset(offset: number): Exclude<Judgement, 'miss'> | null {
  const a = Math.abs(offset);
  if (a <= PERFECT_WINDOW) return 'perfect';
  if (a <= GOOD_WINDOW) return 'good';
  return null;
}

/** 시각 t에 누른 건반(midi)과 같은 음 중 가장 가까운 미판정 대상 index (없으면 -1). */
export function pickTarget(targets: Target[], t: number, midi: number): number {
  let best = -1;
  let bestDist = Infinity;
  targets.forEach((target, i) => {
    if (target.judged || target.midi !== midi) return;
    const d = Math.abs(target.time - t);
    if (d <= GOOD_WINDOW && d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

/** 판정 범위 안에 아직 판정 안 된 대상이 있는가 — 있는데 다른 건반을 눌렀다면 오답 입력 */
export function hasPendingNear(targets: Target[], t: number): boolean {
  return targets.some((target) => !target.judged && Math.abs(target.time - t) <= GOOD_WINDOW);
}

/** 판정 범위를 지나쳐버린(놓친) 음표인가 */
export function isMissed(noteTime: number, now: number): boolean {
  return now - noteTime > GOOD_WINDOW;
}

export const JUDGE_POINTS: Record<Judgement, number> = { perfect: 100, good: 50, miss: 0 };
