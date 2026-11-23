import { defineConfig, devices } from '@playwright/test';
import { normalizeBase } from './src/lib/routes';

const base = normalizeBase(process.env.PORTFOLIO_BASE_PATH ?? '/');
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:4175${base}`,
    channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? undefined : 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4175',
    url: `http://127.0.0.1:4175${base}`,
    reuseExistingServer: false,
  },
});
