import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
      NODE_ENV: 'test',
      RESEND_API_KEY: 'test_resend_api_key',
      RESEND_FROM_EMAIL: 'test@example.com'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/**'],
      exclude: ['src/modules/**/__tests__/**'],
    },
  },
});
