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
  // Headless by default so runs never steal desktop focus. The harness reads
  // this to decide `--headless=new` for the extension context; flip to false
  // (or `--headed`) to watch a run. `launchOptions.executablePath` also gives
  // the CSP-probe test's default (extension-free) page fixture the same
  // Chromium binary the harness resolves, without --no-sandbox.
  use: {
    headless: true,
    launchOptions: { executablePath: chromiumBinary() },
  },
  webServer: {
    command: 'bun run tests/e2e/server.ts',
    url: 'http://127.0.0.1:5199/sample.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
