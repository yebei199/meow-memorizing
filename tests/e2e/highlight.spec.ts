// End-to-end: a stored word gets highlighted on a real page by the loaded
// extension. This exercises the full content-script pipeline, which is
// WASM-first, so it validates the Rust matcher in the browser. The CJK line
// in sample.html also guards UTF-16 offset handling end-to-end.
//
// Skips automatically where the unpacked extension cannot load (some headless
// Chrome builds / no display); run in a real Chrome or CI with a display.
import { expect, getServiceWorker, test } from './fixtures'

test('highlights a stored word on the page', async ({
  context,
  page,
}) => {
  const worker = await getServiceWorker(context)
  test.skip(
    !worker,
    'Unpacked MV3 extension/service worker unavailable in this environment.',
  )

  // Seed the word list before the content script reads storage.
  await worker!.evaluate(async () => {
    await chrome.storage.sync.set({
      myWords: {
        hello: {
          word: 'hello',
          isDeleted: false,
          queryTimes: 0,
          deleteTimes: 0,
        },
      },
    })
  })

  await page.goto('http://127.0.0.1:5199/sample.html')

  // Content script applies highlights after its startup delay. Both "hello"
  // occurrences (one after CJK) should be wrapped.
  const highlighted = page.locator('[data-word="hello"]')
  await expect(highlighted.first()).toBeVisible({
    timeout: 15000,
  })
  await expect(highlighted.first()).toHaveText(/hello/i)
  await expect(highlighted).toHaveCount(2)
})
