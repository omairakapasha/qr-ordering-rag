import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // The app refuses to start without these, and config.ts runs on import.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      SESSION_SECRET: 'test-session-secret-0123456789abcdef',
    },
  },
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../../lib/db/src/index.ts'),
    },
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.json'],
  },
});
