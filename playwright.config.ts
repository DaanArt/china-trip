import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5199/china-trip/', trace: 'retain-on-failure' },
  // Test mode loads .env.test (local Supabase). Never reuse a server: it might point at the live project.
  webServer: { command: 'npx vite --mode test --port 5199 --strictPort', url: 'http://localhost:5199/china-trip/', reuseExistingServer: false },
})
