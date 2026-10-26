import type { NameStyle } from './notes';
import { DEFAULT_FREE, type FreeConfig } from './quiz';

export interface Settings {
  nameStyle: NameStyle;
  showKeyLabels: boolean;
  volume: number;
  metronome: boolean;
  /** 마지막으로 고른 자유 연습 설정 */
  lastFree: FreeConfig;
}

export interface SongRecord {
  practice?: number;
  rhythm?: number;
}

export interface SaveData {
  settings: Settings;
  /** 퀴즈 키('treble-1', 'free:...') → 최고 점수 */
  quizBest: Record<string, number>;
  songBest: Record<string, SongRecord>;
}

export const STORAGE_KEY = 'noteHunter.v1';

export function defaultSaveData(): SaveData {
  return {
    settings: { nameStyle: 'solfege', showKeyLabels: true, volume: 0.8, metronome: true, lastFree: { ...DEFAULT_FREE } },
    quizBest: {},
    songBest: {},
  };
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): KV | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** 1차 버전은 높은음자리표 레벨만 있어서 퀴즈 키가 숫자였다 → 'treble-N' */
function migrateQuizBest(saved: Record<string, number> = {}): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(saved)) result[/^\d+$/.test(k) ? `treble-${k}` : k] = v;
  return result;
}

export function loadSaveData(store: KV | null = defaultStore()): SaveData {
  const base = defaultSaveData();
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<SaveData>;
    return {
      settings: {
        ...base.settings,
        ...saved.settings,
        lastFree: { ...base.settings.lastFree, ...saved.settings?.lastFree },
      },
      quizBest: migrateQuizBest(saved.quizBest),
      songBest: { ...saved.songBest },
    };
  } catch {
    return base;
  }
}

export function saveSaveData(data: SaveData, store: KV | null = defaultStore()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 공간 차단(시크릿 모드 등) — 진행 기록 없이 계속 플레이
  }
}
