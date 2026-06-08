// End-to-end: a stored word gets highlighted on a page by the real content
// bundle. Exercises the full content-script pipeline (WASM matcher driven over
// messaging), validating the Rust matcher in the browser. The CJK line in
// sample.html guards UTF-16 offset handling end-to-end.
//
// Uses the bundle-injection harness (see bundleHarness.ts) instead of loading
// the unpacked extension, so it runs in any Chrome rather than self-skipping.
import { expect, test } from '@playwright/test';
import { setupBundleHarness } from './bundleHarness';

test('highlights a stored word on the page', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hello: {
        word: 'hello',
        isDeleted: false,
        queryTimes: 0,
        deleteTimes: 0,
      },
    },
  });

  // Both "hello" occurrences (one after CJK) should be wrapped.
  const highlighted = h.page.locator('[data-word="hello"]');
  await expect(highlighted.first()).toBeVisible({
    timeout: 15000,
  });
  await expect(highlighted.first()).toHaveText(/hello/i);
  await expect(highlighted).toHaveCount(2);

  await h.close();
});
