import { describe, expect, it } from 'vitest';
import { parentOf } from '../src/core/navigation';
import { DEFAULT_FREE, freeKey } from '../src/core/quiz';
import type { Screen } from '../src/types';

describe('뒤로가기', () => {
  it('홈에서는 종료', () => {
    expect(parentOf({ name: 'home' })).toBeNull();
  });

  it('목록 화면은 홈으로', () => {
    expect(parentOf({ name: 'levels', tab: 'bass' })).toEqual({ name: 'home' });
    expect(parentOf({ name: 'songs', mode: 'rhythm' })).toEqual({ name: 'home' });
    expect(parentOf({ name: 'settings' })).toEqual({ name: 'home' });
  });

  it('퀴즈는 해당 탭의 레벨 목록으로', () => {
    expect(parentOf({ name: 'quiz', key: 'bass-3' })).toEqual({ name: 'levels', tab: 'bass' });
    expect(parentOf({ name: 'quiz', key: freeKey(DEFAULT_FREE) })).toEqual({ name: 'levels', tab: 'free' });
  });

  it('곡 화면은 같은 모드의 곡 목록으로', () => {
    expect(parentOf({ name: 'practice', songId: 'x' })).toEqual({ name: 'songs', mode: 'practice' });
    expect(parentOf({ name: 'rhythm', songId: 'x', tempo: 1 })).toEqual({ name: 'songs', mode: 'rhythm' });
    expect(parentOf({ name: 'songEdit', mode: 'rhythm' })).toEqual({ name: 'songs', mode: 'rhythm' });
    expect(parentOf({ name: 'songImport', mode: 'practice' })).toEqual({ name: 'songs', mode: 'practice' });
  });

  it('결과 화면은 목록으로 (끝난 게임으로 돌아가지 않음)', () => {
    const back: Screen = { name: 'songs', mode: 'rhythm' };
    const result: Screen = {
      name: 'result',
      result: { title: '', headline: '', isNewBest: false, stats: [], retry: { name: 'rhythm', songId: 'x', tempo: 1 }, back },
    };
    expect(parentOf(result)).toEqual(back);
  });
});
