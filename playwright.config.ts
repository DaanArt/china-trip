import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5199/china-trip/', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199/china-trip/', reuseExistingServer: true },
})
