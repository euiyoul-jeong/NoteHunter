import { useCallback, useEffect, useState } from 'react';
import { loadSaveData, saveSaveData, type SaveData } from './core/storage';
import { setVolume } from './core/audio';
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
      return <SongSelect {...props} mode={screen.mode} filter={screen.filter} />;
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
