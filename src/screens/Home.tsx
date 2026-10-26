import { Capacitor } from '@capacitor/core';
import type { ScreenProps } from '../types';

// 항상 최신 릴리스의 APK 를 가리키는 고정 주소 (.github/workflows/android.yml 이 NoteHunter.apk 로 함께 올린다)
const APK_URL = 'https://github.com/euiyoul-jeong/NoteHunter/releases/latest/download/NoteHunter.apk';
const RELEASES_URL = 'https://github.com/euiyoul-jeong/NoteHunter/releases';

export function Home({ go }: ScreenProps) {
  return (
    <main className="page home">
      <div className="logo">
        <span className="logo-note">♪</span>
        <h1>음표 사냥꾼</h1>
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

      {!Capacitor.isNativePlatform() && <AppDownload />}
    </main>
  );
}

/** 웹에서 접속했을 때만 보이는 안드로이드 앱 다운로드 안내 (앱 안에서는 숨김) */
function AppDownload() {
  return (
    <section className="app-download">
      <img src="./apk-qr.svg" alt="안드로이드 앱 다운로드 QR 코드" width={132} height={132} />
      <div className="app-download-text">
        <h3>📱 안드로이드 앱</h3>
        <p>휴대폰 카메라로 QR을 찍거나 아래 버튼을 눌러 설치 파일(APK)을 받으세요.</p>
        <a className="btn primary" href={APK_URL}>
          APK 다운로드
        </a>
        <small>
          처음 설치할 때 "알 수 없는 앱 설치"를 허용해야 해요 ·{' '}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            모든 버전
          </a>
        </small>
      </div>
    </section>
  );
}
