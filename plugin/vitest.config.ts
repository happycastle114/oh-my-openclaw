import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
    },
  },
});
