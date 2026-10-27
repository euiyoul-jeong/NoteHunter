import { getSpec } from './quiz';
import type { Screen } from '../types';

/**
 * 뒤로가기(안드로이드 버튼·브라우저)로 갈 화면. 각 화면의 ←/✕ 버튼과 같은 곳.
 * 홈이면 null — 앱 종료.
 */
export function parentOf(screen: Screen): Screen | null {
  switch (screen.name) {
    case 'home':
      return null;
    case 'levels':
    case 'songs':
    case 'settings':
      return { name: 'home' };
    case 'quiz':
      return { name: 'levels', tab: getSpec(screen.key).tab };
    case 'songImport':
    case 'songEdit':
      return { name: 'songs', mode: screen.mode };
    case 'practice':
      return { name: 'songs', mode: 'practice' };
    case 'rhythm':
      return { name: 'songs', mode: 'rhythm' };
    case 'result':
      return screen.result.back;
  }
}
