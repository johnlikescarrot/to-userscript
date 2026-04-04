import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 85,
        statements: 98,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
