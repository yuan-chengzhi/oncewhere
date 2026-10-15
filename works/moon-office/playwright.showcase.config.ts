import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// A single object replaces webServer; defineConfig(base, extra) concatenates servers.
export default defineConfig({
  ...base,
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
