import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // BCRYPT_COST=12 (auth service default) plus real SMTP attempts can exceed
    // vitest's 5s default on slower machines; give integration tests headroom.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'prisma/',
      ],
    },
  },
});
