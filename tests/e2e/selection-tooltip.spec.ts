// Selection → translation-card behaviour, driven through the real content
// bundle via the bundle-injection harness (no unpacked extension, so these run
// in any Chrome instead of self-skipping).
import { expect, test } from '@playwright/test';
import {
  STARTUP_MS,
  selectWord,
  setupBundleHarness,
} from './bundleHarness';

test('shows a translation card for a selected word without nested highlight markup', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
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
  await expect(tooltip).toContainText('lucky discovery');
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

test('selecting a word immediately highlights all existing matches', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
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

test('does not keep a highlight for a selected word without dictionary results', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
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

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('未找到翻译');
  await expect(tooltip).toContainText('未收录');
  await expect(
    h.page.locator('[data-word="quizzacious"]'),
  ).toHaveCount(0);

  await h.close();
});

test('selecting a word inside an existing highlight tree immediately highlights it', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
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

test('highlights and opens hover cards inside github-like inline links', async ({
  browser,
}) => {
  const h = await setupBundleHarness(browser, {
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
  await expect(tooltip).toContainText('lucky discovery');

  await h.close();
});
