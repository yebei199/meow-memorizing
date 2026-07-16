// Regression: page highlighting must survive an MV3 background-worker recycle.
//
// The highlight automata live in the ephemeral background service worker. Chrome
// recycles it after ~30s idle, wiping its state, while the content script stays
// alive with the page. The old design had the content script push words to the
// worker and cache an "already synced" flag; after a recycle it skipped the
// re-push and every match hit an empty worker — highlighting silently died
// page-wide (the karakeep bug). The worker now owns its word set and rehydrates
// from storage on cold start (docs/adr/0002-worker-owns-word-set.md).
//
// This drives the real extension and simulates the recycle deterministically
// with CDP Target.closeTarget (docs/adr/0003-e2e-real-loaded-extension.md) — no
// flaky 30s idle wait. The rescan is triggered by a DOM mutation (not a page
// reload), so the content script instance is NOT reset — exactly the real
// scenario where a live page meets a recycled worker.
import { expect, test } from '@playwright/test';
import { setupBundleHarness } from './bundleHarness';

test('a live page still highlights after the background worker is recycled', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hello: {
        word: 'hello',
        isDeleted: false,
        isIgnored: false,
        isUntranslatable: false,
        lastAttemptAt: 0,
        queryTimes: 1,
        deleteTimes: 0,
      },
    },
  });

  // Baseline: the seeded word is highlighted (worker cold-loaded storage).
  const highlighted = h.page.locator('[data-word="hello"]');
  await expect(highlighted).toHaveCount(2, {
    timeout: 15000,
  });

  // Mark the current worker instance so we can prove a fresh one serves the
  // post-recycle match.
  await h.worker.evaluate(() => {
    (globalThis as unknown as { __mark?: string }).__mark =
      'before-recycle';
  });

  // Recycle: stop the worker; its in-memory automata are gone.
  await h.recycleWorker();

  // Mutate the live page (content script stays alive). Its MutationObserver
  // rescans the new node against the now-cold worker — the word set is
  // unchanged, the exact case the old push-cache skipped.
  await h.page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'a fresh hello appears here';
    document.body.appendChild(p);
  });

  // The new occurrence must get highlighted: the recycled worker rehydrated its
  // word set from storage on its own. 2 original + 1 injected.
  await expect(highlighted).toHaveCount(3, {
    timeout: 15000,
  });

  // Prove a fresh worker instance served it (the mark is gone after recycle).
  const restarted = await h.waitForWorker();
  const mark = await restarted.evaluate(
    () =>
      (globalThis as unknown as { __mark?: string })
        .__mark ?? 'FRESH',
  );
  expect(mark).toBe('FRESH');

  await h.close();
});
