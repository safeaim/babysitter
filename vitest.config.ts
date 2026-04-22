import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'packages/*/tests/**/*.test.{ts,tsx}', 'packages/agent-mux/*/src/**/*.test.{ts,tsx}', 'packages/agent-mux/*/tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'packages/agent-mux/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.test.ts',
        '**/index.ts',
        // TODO: re-include once these packages have test coverage
        'packages/agent-mux/observability/src/**',
        'packages/agent-mux/harness-mock/src/multi-execution.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
