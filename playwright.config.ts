import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const localChrome =
  '/etc/profiles/per-user/yb/bin/google-chrome';

// Prefer local system Chrome for NixOS development, but fall back to
// Playwright-managed Chromium in CI or on machines without that path.
const chrome =
  process.env.PLAYWRIGHT_CHROME ??
  (existsSync(localChrome) && !process.env.CI
    ? localChrome
    : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  // Extension tests share one persistent context + one static server.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    launchOptions: {
      executablePath: chrome,
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'bun run tests/e2e/server.ts',
    url: 'http://127.0.0.1:5199/sample.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
