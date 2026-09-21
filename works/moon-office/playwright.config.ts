import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const cachedChromium = '/home/ubuntu/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cachedChromium) ? cachedChromium : undefined),
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
