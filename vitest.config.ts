import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Server and pure-logic tests run in Node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: ['**/*.test.*', 'src/main.tsx', 'src/data/**', 'src/audio/**'],
      // Logic and server code must stay well covered; UI is covered by behaviour tests.
      thresholds: {
        'src/utils/**': { lines: 85, branches: 75 },
        'server/**': { lines: 80, branches: 70 },
      },
    },
  },
});
