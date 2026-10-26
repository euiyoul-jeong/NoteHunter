import type { CapacitorConfig } from '@capacitor/cli';

// 웹 빌드(dist)를 안드로이드 앱으로 감싼다. `npm run android:sync` 후 android/ 를 빌드.
const config: CapacitorConfig = {
  appId: 'com.euiyouljeong.notehunter',
  appName: 'Note Hunter',
  webDir: 'dist',
  android: {
    backgroundColor: '#1d1b33',
  },
};

export default config;
