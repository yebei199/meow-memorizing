// Regression: highlighting must survive a strict host-page CSP.
//
// Content scripts run in the host page's isolated world, which inherits the
// page CSP. On sites whose `script-src` omits `wasm-unsafe-eval` (GitHub, X, …)
// `new WebAssembly.Module` throws `CompileError`. Previously the matcher ran in
// the content script, so on such pages it threw and NOTHING highlighted — the
// real bug behind "selecting a word doesn't highlight across the GitHub page".
// The fix moves the WASM matcher into the background worker (permissive
// extension CSP) and drives it over messaging.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import {
  selectWord,
  setupBundleHarness,
} from './bundleHarness';

// Host CSP that allows inline script (so the harness can inject the bundle the
// way the browser injects a content script) but omits `wasm-unsafe-eval` — the
// exact shape that breaks in-content WASM.
const GITHUB_LIKE_CSP =
  "script-src 'self' 'unsafe-inline'; object-src 'self'";

test('a selected word highlights page-wide under a strict (no wasm-unsafe-eval) CSP', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
    url: 'http://127.0.0.1:5199/github-trending.html',
    csp: GITHUB_LIKE_CSP,
  });

  // Let the bundle's startup scan run under the CSP, then select "topic".
  await h.page.waitForTimeout(3000);
  await selectWord(h.page, 'p', 'topic');

  // Under the old in-content WASM path this stays 0 (CompileError kills the
  // matcher). With the worker-backed matcher every "topic" is highlighted:
  // 3 standalone + 1 inside "topic-modeling" (hyphen is a word boundary).
  const highlighted = h.page.locator('[data-word="topic"]');
  await expect(highlighted.first()).toBeVisible({
    timeout: 10000,
  });
  await expect(highlighted).toHaveCount(4);

  await h.close();
});

// The harness routes matcher work to a CSP-free stand-in page; the real
// background worker instead runs under the MV3 extension CSP. Pin the
// assumption that that CSP actually permits WASM (and that the manifest does
// not override it away), so the fix cannot silently regress.
test('the MV3 extension CSP the worker runs under permits WASM', async ({
  page,
}) => {
  const here = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(
    readFileSync(
      resolve(
        here,
        '../../.output/chrome-mv3/manifest.json',
      ),
      'utf8',
    ),
  ) as {
    content_security_policy?: { extension_pages?: string };
  };

  // Chrome's default MV3 CSP for extension pages + the service worker.
  const extensionPagesCsp =
    manifest.content_security_policy?.extension_pages ??
    "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'";

  expect(extensionPagesCsp).toContain('wasm-unsafe-eval');

  // Prove that CSP actually compiles WASM (mirrors the worker's environment).
  await page.route('**/csp-probe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: {
        'content-security-policy': extensionPagesCsp,
      },
      body: '<!doctype html><html><body>probe</body></html>',
    });
  });
  await page.goto('http://127.0.0.1:5199/csp-probe');
  const result = await page.evaluate(() => {
    const bytes = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0,
    ]);
    try {
      new WebAssembly.Module(bytes);
      return 'ok';
    } catch (e) {
      return `blocked: ${(e as Error).name}`;
    }
  });
  expect(result).toBe('ok');
});
