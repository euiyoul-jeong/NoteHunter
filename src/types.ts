import type { SaveData } from './core/storage';
import type { QuizTab } from './core/quiz';

export type SongMode = 'practice' | 'rhythm';

export type Screen =
  | { name: 'home' }
  | { name: 'levels'; tab?: QuizTab }
  /** key: 레벨 키('bass-3') 또는 자유 연습 키('free:...') */
  | { name: 'quiz'; key: string }
  | { name: 'songs'; mode: SongMode }
  | { name: 'songImport'; mode: SongMode }
  | { name: 'songEdit'; mode: SongMode; songId?: string }
  | { name: 'practice'; songId: string }
  | { name: 'rhythm'; songId: string; tempo: number }
  | { name: 'result'; result: GameResult }
  | { name: 'settings' };

export interface GameResult {
  title: string;
  headline: string;
  isNewBest: boolean;
  best?: string;
  stats: { label: string; value: string }[];
  message?: string;
  retry: Screen;
  back: Screen;
}

export interface ScreenProps {
  data: SaveData;
  update: (fn: (d: SaveData) => SaveData) => void;
  go: (s: Screen) => void;
}
