import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' — 상대 경로 빌드라서 나중에 Capacitor(webDir: dist)로 그대로 감쌀 수 있다.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
