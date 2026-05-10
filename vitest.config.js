import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
  },
})
