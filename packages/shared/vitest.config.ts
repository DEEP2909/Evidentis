import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text'],
      exclude: ['dist/**', 'tests/**'],
    },
  },
});
