import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Include test patterns
    include: ['tests/**/*.test.js'],

    // Coverage (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '.git/',
        '.archived_scripts/',
      ],
    },

    // Globals (no need to import describe, it, expect)
    globals: true,

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Print test names
    reportOnThread: true,
  },
});
