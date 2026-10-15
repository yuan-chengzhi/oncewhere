import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Test the actual static build with the existing behavior suite, not the dev server.
export default defineConfig(base, {
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
