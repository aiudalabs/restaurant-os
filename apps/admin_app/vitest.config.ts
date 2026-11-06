import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Separate from vite.config.ts on purpose: tests are pure functions (node), they need
// neither the React/Tailwind plugins nor the build-time env guard.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
