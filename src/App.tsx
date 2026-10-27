import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { loadSaveData, saveSaveData, type SaveData } from './core/storage';
import { setVolume } from './core/audio';
import { parentOf } from './core/navigation';
import type { Screen, ScreenProps } from './types';
import { Home } from './screens/Home';
import { LevelSelect } from './screens/LevelSelect';
import { QuizMode } from './screens/QuizMode';
import { SongSelect } from './screens/SongSelect';
import { SongImport } from './screens/SongImport';
import { SongEditor } from './screens/SongEditor';
import { PracticeMode } from './screens/PracticeMode';
import { RhythmMode } from './screens/RhythmMode';
import { Result } from './screens/Result';
import { Settings } from './screens/Settings';

export function App() {
  const [data, setData] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    saveSaveData(data);
    setVolume(data.settings.volume);
  }, [data]);

  useBackNavigation(screen, setScreen);

  const update = useCallback((fn: (d: SaveData) => SaveData) => setData(fn), []);
  const props: ScreenProps = { data, update, go: setScreen };

  switch (screen.name) {
    case 'home':
      return <Home {...props} />;
    case 'levels':
      return <LevelSelect {...props} tab={screen.tab ?? 'treble'} />;
    case 'quiz':
      return <QuizMode key={JSON.stringify(screen)} {...props} specKey={screen.key} />;
    case 'songs':
      return <SongSelect {...props} mode={screen.mode} />;
    case 'songImport':
      return <SongImport {...props} mode={screen.mode} />;
    case 'songEdit':
      return <SongEditor key={screen.songId ?? 'new'} {...props} mode={screen.mode} songId={screen.songId} />;
    case 'practice':
      return <PracticeMode key={JSON.stringify(screen)} {...props} songId={screen.songId} />;
    case 'rhythm':
      return <RhythmMode key={JSON.stringify(screen)} {...props} songId={screen.songId} tempo={screen.tempo} />;
    case 'result':
      return <Result {...props} result={screen.result} />;
    case 'settings':
      return <Settings {...props} />;
  }
}

const native = Capacitor.isNativePlatform();

/**
 * 뒤로가기 → 앞 화면(parentOf), 홈에서 뒤로가기 → 종료.
 * 앱: 안드로이드 뒤로가기 버튼을 직접 받는다.
 * 웹: 홈이 아닐 때 history 에 가드 한 칸을 넣어 두고, 그 칸이 빠지면(popstate) 앞 화면으로 간다.
 *     홈에서는 가드가 없으므로 브라우저 기본 동작(사이트 나가기).
 */
function useBackNavigation(screen: Screen, setScreen: (s: Screen) => void) {
  const current = useRef(screen);
  current.current = screen;
  const guard = useRef({ pushed: false, ignorePop: false });

  useEffect(() => {
    if (native) {
      const sub = CapApp.addListener('backButton', () => {
        const parent = parentOf(current.current);
        if (parent) setScreen(parent);
        else void CapApp.exitApp();
      });
      return () => void sub.then((s) => s.remove());
    }
    const onPop = () => {
      const g = guard.current;
      g.pushed = false;
      if (g.ignorePop) {
        // 버튼으로 홈에 돌아와 남은 가드를 치운 것 — 그 사이 다시 홈을 떠났으면 가드를 새로 넣는다
        g.ignorePop = false;
        if (current.current.name !== 'home') {
          history.pushState(null, '');
          g.pushed = true;
        }
        return;
      }
      const parent = parentOf(current.current);
      if (parent) setScreen(parent);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setScreen]);

  useEffect(() => {
    if (native) return;
    const g = guard.current;
    const atHome = screen.name === 'home';
    if (!atHome && !g.pushed && !g.ignorePop) {
      history.pushState(null, '');
      g.pushed = true;
    } else if (atHome && g.pushed && !g.ignorePop) {
      g.ignorePop = true;
      history.back();
    }
  }, [screen]);
}
