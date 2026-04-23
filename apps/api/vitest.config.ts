import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const configDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@evidentis/shared': resolve(
        configDir,
        '../../packages/shared/src/index.ts',
      ),
      '@evidentis/shared/validators': resolve(
        configDir,
        '../../packages/shared/src/validators.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://evidentis:test_password@localhost:5432/evidentis_test',
      REDIS_URL: 'redis://localhost:6379',
    },
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text'],
      reportsDirectory: '../../coverage',
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'src/seed.ts'],
    },
  },
});
