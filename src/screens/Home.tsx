import type { ScreenProps } from '../types';

export function Home({ go }: ScreenProps) {
  return (
    <main className="page home">
      <div className="logo">
        <span className="logo-note">♪</span>
        <h1>
          NOTE HUNTER
          <small>음표 사냥꾼</small>
        </h1>
      </div>
      <p className="tagline">악보를 읽고, 건반을 눌러 음표를 잡아라!</p>

      <div className="mode-cards">
        <button className="mode-card quiz" onClick={() => go({ name: 'levels' })}>
          <span className="mode-icon">🎯</span>
          <span className="mode-name">음표 퀴즈</span>
          <span className="mode-desc">높은음·낮은음·큰보표·화음 골라서 맞히기</span>
        </button>
        <button className="mode-card practice" onClick={() => go({ name: 'songs', mode: 'practice' })}>
          <span className="mode-icon">🎼</span>
          <span className="mode-name">곡 따라 치기</span>
          <span className="mode-desc">내 속도로 한 음씩 연습</span>
        </button>
        <button className="mode-card rhythm" onClick={() => go({ name: 'songs', mode: 'rhythm' })}>
          <span className="mode-icon">🥁</span>
          <span className="mode-name">리듬 게임</span>
          <span className="mode-desc">박자에 맞춰 흘러오는 음표 치기</span>
        </button>
      </div>

      <button className="text-btn" onClick={() => go({ name: 'settings' })}>
        ⚙ 설정
      </button>
    </main>
  );
}
