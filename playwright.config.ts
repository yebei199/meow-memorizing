import { defineConfig } from '@playwright/test';
import { chromiumBinary } from './tests/e2e/bundleHarness';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  // Each spec loads the real extension into its own persistent Chromium context
  // (see bundleHarness.ts), so runs stay serial and share one static server.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // Only the CSP-probe test uses the default (extension-free) page fixture; give
  // it the same Chromium binary the harness resolves, without --no-sandbox.
  use: {
    launchOptions: { executablePath: chromiumBinary() },
  },
  webServer: {
    command: 'bun run tests/e2e/server.ts',
    url: 'http://127.0.0.1:5199/sample.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
