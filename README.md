# 음표 사냥꾼 (Note Hunter)

악보(높은음자리표)를 보고 화면 피아노 건반을 눌러 음표 읽기를 익히는 학습 게임.

## 바로 플레이
**https://euiyoul-jeong.github.io/NoteHunter/** — 브라우저에서 바로 실행 (PC·휴대폰). 홈 화면 아래에 안드로이드 앱 다운로드 QR이 있다.
`main` 에 푸시하면 GitHub Actions(`.github/workflows/pages.yml`)가 자동으로 다시 배포한다.

## 안드로이드 앱 다운로드
[Releases](https://github.com/euiyoul-jeong/NoteHunter/releases/latest) 에서 `NoteHunter-x.y.z.apk` 를 폰으로 받아 설치한다.
처음 설치할 때 "알 수 없는 앱 설치" 허용이 필요하다. 앱은 가로 화면으로 실행된다.

새 버전 배포: `git tag v1.0.1 && git push origin v1.0.1` → GitHub Actions(`.github/workflows/android.yml`)가 서명된 APK를 빌드해 Releases 에 올린다.
서명 키는 저장소 비밀값(`ANDROID_KEYSTORE_*`)에 있고, 원본은 저장소 밖에 별도 보관한다.

## 실행
```
npm install
npm run dev      # 개발 서버
npm run test     # 단위 테스트 (Vitest)
npm run build    # dist/ 에 정적 빌드 (상대 경로 — Capacitor webDir 로 그대로 사용 가능)
```

## 게임 모드
- **음표 퀴즈** — 모드 탭을 골라 60초 동안 맞히기. 모든 레벨은 처음부터 열려 있고, 목표 점수를 넘기면 ⭐
  - 높은음자리표 / 낮은음자리표 / 큰보표(양손 악보) / 화음(3화음) — 모드마다 Lv.1~5
  - 화음은 구성음을 하나씩 눌러 모아도, 동시에 눌러도 정답
  - **자유 연습**: 악보·단음/3화음·자리바꿈·♯♭·음역·시간(무제한 포함)을 직접 조합
- **곡 따라 치기** — 맞는 건반을 눌러야 다음 단계로. 양손 곡은 같은 박의 오른손+왼손 음을 모두 눌러야 진행. 두 번 틀리면 힌트
- **리듬 게임** — 흘러오는 음표를 판정선에서 치기 (PERFECT ±60ms / GOOD ±130ms), 빠르기 60–120%. 화음·양손은 음마다 판정
- 곡: 높은음자리표 5곡, 낮은음자리표 2곡(런던 다리, 자크 형제), 양손 3곡(비행기, 반짝반짝 작은별, 환희의 송가)

## 구조
- `src/core/` — 음높이·자리표(`notes`), 3화음(`chords`), 퀴즈 모드·레벨·자유 설정(`quiz`), 곡 데이터·파서(`songs`), 합성음(`audio`), 저장(`storage`), 리듬 판정(`judge`), 악보 배치(`layout`)
- `src/components/` — SVG 오선(`Staff`: 높은음/낮은음/큰보표, 화음), 멀티터치 건반(`PianoKeyboard`, 범위 자동), HUD
- `src/screens/` — 화면별 컴포넌트

## 곡 추가
`src/core/songs.ts` 의 `SONGS` 에 텍스트 표기로 추가한다. 예: `E4q D4q C4q D4q | E4h.` (w/h/q/e = 온/2분/4분/8분, `.` 점음표, `R` 쉼표, `|` 마디줄, `C3+E3+G3h` 화음).
성부는 `{ treble: '...', bass: '...' }` 로 적고, 둘 다 있으면 큰보표(양손) 곡이 된다. 건반 범위는 곡의 음역에 맞춰 자동으로 정해진다.
