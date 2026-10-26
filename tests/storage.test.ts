import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, defaultSaveData, loadSaveData, saveSaveData } from '../src/core/storage';

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe('storage', () => {
  it('저장 데이터 없으면 기본값', () => {
    expect(loadSaveData(memoryStore())).toEqual(defaultSaveData());
    expect(loadSaveData(null)).toEqual(defaultSaveData());
  });

  it('일부 설정만 저장돼 있어도 기본값과 병합', () => {
    const store = memoryStore({ [STORAGE_KEY]: JSON.stringify({ settings: { nameStyle: 'letter', lastFree: { staff: 'bass' } } }) });
    const data = loadSaveData(store);
    expect(data.settings.nameStyle).toBe('letter');
    expect(data.settings.volume).toBe(0.8);
    expect(data.settings.lastFree.staff).toBe('bass');
    expect(data.settings.lastFree.duration).toBe(60);
  });

  it('1차 버전 기록(숫자 레벨 키) → 높은음자리표 레벨 키로 이전', () => {
    const v1 = { settings: {}, quizBest: { 1: 220, 3: 150 }, unlockedLevel: 4, songBest: { twinkle: { practice: 90 } } };
    const data = loadSaveData(memoryStore({ [STORAGE_KEY]: JSON.stringify(v1) }));
    expect(data.quizBest).toEqual({ 'treble-1': 220, 'treble-3': 150 });
    expect(data.songBest.twinkle.practice).toBe(90);
    expect('unlockedLevel' in data).toBe(false);
  });

  it('깨진 JSON은 기본값', () => {
    expect(loadSaveData(memoryStore({ [STORAGE_KEY]: '{oops' }))).toEqual(defaultSaveData());
  });

  it('저장 후 다시 읽기', () => {
    const store = memoryStore();
    const data = defaultSaveData();
    data.quizBest['bass-2'] = 220;
    data.songBest.twinkle = { practice: 95 };
    saveSaveData(data, store);
    expect(loadSaveData(store)).toEqual(data);
  });
});
