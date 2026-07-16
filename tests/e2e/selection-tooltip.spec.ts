// Selection → translation-card behaviour, driven through the real content
// bundle via the bundle-injection harness (no unpacked extension, so these run
// in any Chrome instead of self-skipping).
import { expect, test } from '@playwright/test';
import {
  STARTUP_MS,
  selectWord,
  setupBundleHarness,
} from './bundleHarness';

test('shows a translation card for a selected word without nested highlight markup', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
  });

  // A fresh target that is not already a stored/highlighted word.
  await h.page.evaluate(() => {
    const host = document.createElement('p');
    host.id = 'selection-target';
    host.textContent = 'Selection target: serendipity';
    document.body.appendChild(host);
  });

  // Wait for the bundle to attach its selection listener.
  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(
    h.page,
    '#selection-target',
    'serendipity',
  );

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  // Exactly one tooltip root — no nested/duplicated marker.
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('serendipity');
  // Definition comes from the real background `trans` fetch (intercepted), so
  // allow for the worker cold-start + fetch on top of the hover delay.
  await expect(tooltip).toContainText('lucky discovery', {
    timeout: 15000,
  });
  await expect(tooltip).toContainText('已加入词库');
  // Selecting auto-saves, so the card shows the saved state, not an add button.
  await expect(
    tooltip.getByRole('button', { name: '加入词库' }),
  ).toHaveCount(0);
  // The card itself must not contain nested highlight markup.
  await expect(tooltip.locator('[data-word]')).toHaveCount(
    0,
  );
  await expect(
    tooltip.locator('[data-meow-word-trigger="true"]'),
  ).toHaveCount(0);
  // The selected word is now highlighted once in the page body.
  await expect(
    h.page.locator('[data-word="serendipity"]'),
  ).toHaveCount(1);

  await h.close();
});

test('selecting a word immediately highlights all existing matches', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
  });

  // Wait for the bundle to attach its selection listener.
  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(h.page, 'body', 'hello');

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('已加入词库');
  await expect(
    tooltip.getByRole('button', { name: '加入词库' }),
  ).toHaveCount(0);

  const highlighted = h.page.locator('[data-word="hello"]');
  await expect(highlighted.first()).toBeVisible({
    timeout: 15000,
  });
  await expect(highlighted).toHaveCount(2);

  await h.close();
});

test('silently closes the card for a selected word without dictionary results', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    transResponse:
      '<html><body>No dictionary result</body></html>',
  });

  await h.page.evaluate(() => {
    const host = document.createElement('p');
    host.id = 'missing-selection-target';
    host.textContent =
      'Missing dictionary word: quizzacious';
    document.body.appendChild(host);
  });

  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(
    h.page,
    '#missing-selection-target',
    'quizzacious',
  );

  // No dictionary result marks the word isUntranslatable and closes the
  // card silently — no "未找到翻译" text, the card just disappears.
  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(0, { timeout: 15000 });
  await expect(
    h.page.locator('[data-word="quizzacious"]'),
  ).toHaveCount(0);

  await h.close();
});

test('selecting a word inside an existing highlight tree immediately highlights it', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hello: {
        word: 'hello',
        isDeleted: false,
        queryTimes: 1,
        deleteTimes: 0,
      },
    },
  });

  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 15000 });

  await selectWord(h.page, 'body', 'world');

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('已加入词库');

  await expect(
    h.page.locator('[data-word="world"]'),
  ).toHaveCount(1, { timeout: 15000 });

  await h.close();
});

test('highlights and opens hover cards inside github-like inline links', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      reddit: {
        word: 'reddit',
        isDeleted: false,
        queryTimes: 1,
        deleteTimes: 0,
      },
    },
  });

  const highlighted = h.page.locator(
    '[data-word="reddit"]',
  );
  await expect(highlighted).toHaveCount(2, {
    timeout: 15000,
  });
  await expect(highlighted.first()).toBeVisible();

  const trigger = h.page
    .locator('[data-meow-word-trigger="true"]')
    .first();
  await trigger.hover();

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="stored"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('reddit');
  // Definition comes from the real background `trans` fetch (intercepted), so
  // allow for the worker cold-start + fetch on top of the hover delay.
  await expect(tooltip).toContainText('lucky discovery', {
    timeout: 15000,
  });

  await h.close();
});

test('shows a retranslate dot for a stopword, and clicking it restores the tooltip (#140)', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hush: {
        word: 'hush',
        isDeleted: false,
        queryTimes: 3,
        deleteTimes: 0,
        isIgnored: true,
        isUntranslatable: false,
        lastAttemptAt: 0,
      },
    },
  });

  await h.page.evaluate(() => {
    const host = document.createElement('p');
    host.id = 'stopword-target';
    host.textContent = 'Stopword target: hush';
    document.body.appendChild(host);
  });

  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(h.page, '#stopword-target', 'hush');

  // No translation card — a small retranslate dot instead.
  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(0, { timeout: 15000 });
  const dot = h.page.getByTitle('停用词，点击重新翻译');
  await expect(dot).toBeVisible({ timeout: 15000 });

  await dot.click();

  // Clicking the dot un-ignores the word and reopens the normal card.
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('hush');

  await h.close();
});

test('keeps the native selection intact after selecting a stopword (so copy still works)', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hush: {
        word: 'hush',
        isDeleted: false,
        queryTimes: 3,
        deleteTimes: 0,
        isIgnored: true,
        isUntranslatable: false,
        lastAttemptAt: 0,
      },
    },
  });

  await h.page.evaluate(() => {
    const host = document.createElement('p');
    host.id = 'copy-target';
    host.textContent = 'Copy target: hush';
    document.body.appendChild(host);
  });

  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(h.page, '#copy-target', 'hush');

  // Wait for the dot (or its absence) to settle before checking the selection.
  await expect(
    h.page.getByTitle('停用词，点击重新翻译'),
  ).toBeVisible({ timeout: 15000 });

  // A stopword's text node is excluded from highlighting, so the page
  // rescan never replaces it — the native selection must survive, so the
  // user can still Ctrl+C right after selecting it (see #140 follow-up).
  // Selecting a word that DOES get highlighted still loses the native
  // selection, because the rescan replaces its DOM node; that's pre-existing
  // behavior this change doesn't attempt to fix.
  const selectedText = await h.page.evaluate(() =>
    window.getSelection()?.toString(),
  );
  expect(selectedText).toBe('hush');

  await h.close();
});
