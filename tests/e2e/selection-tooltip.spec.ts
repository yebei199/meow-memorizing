import { expect, getServiceWorker, test } from './fixtures'

const bingResponse = `
  <div
    id="clientnewword"
    data-definition="n. lucky discovery adj. unexpectedly fortunate"
  ></div>
`

test('shows a translation card for selected text on Google search pages', async ({
  context,
  page,
}) => {
  const worker = await getServiceWorker(context)
  test.skip(
    !worker,
    'Unpacked MV3 extension/service worker unavailable in this environment.',
  )

  await context.route('https://cn.bing.com/dict/clientsearch**', async (route) => {
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: bingResponse,
    })
  })

  await page.goto('https://www.google.com/search?hl=en&q=serendipity', {
    waitUntil: 'domcontentloaded',
  })

  await page.evaluate(() => {
    const host = document.createElement('p')
    host.id = 'playwright-selection-target'
    host.textContent = 'Selection target: serendipity'
    host.style.position = 'fixed'
    host.style.top = '120px'
    host.style.left = '32px'
    host.style.zIndex = '2147483647'
    host.style.padding = '12px 16px'
    host.style.background = '#fff8dc'
    host.style.color = '#202124'
    host.style.fontSize = '20px'
    host.style.fontFamily = 'Arial, sans-serif'
    document.body.appendChild(host)
  })

  await page.evaluate(() => {
    const host = document.getElementById('playwright-selection-target')
    if (!host?.firstChild || host.firstChild.nodeType !== Node.TEXT_NODE) {
      throw new Error('selection target not ready')
    }

    const textNode = host.firstChild
    const text = textNode.textContent ?? ''
    const target = 'serendipity'
    const start = text.indexOf(target)
    if (start < 0) {
      throw new Error('target word not found')
    }

    const selection = window.getSelection()
    if (!selection) {
      throw new Error('selection api unavailable')
    }

    const range = document.createRange()
    range.setStart(textNode, start)
    range.setEnd(textNode, start + target.length)
    selection.removeAllRanges()
    selection.addRange(range)

    const rect = range.getBoundingClientRect()
    host.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom,
      }),
    )
  })

  const tooltip = page.locator('[data-meow-tooltip-root="selection"]')
  await expect(tooltip).toBeVisible({ timeout: 15000 })
  await expect(tooltip).toContainText('serendipity')
  await expect(tooltip).toContainText('lucky discovery')
  await expect(tooltip).toContainText('已加入词库')
  await expect(
    tooltip.getByRole('button', { name: '加入词库' }),
  ).toHaveCount(0)
  await expect(tooltip.locator('[data-word]')).toHaveCount(0)
  await expect(
    tooltip.locator('[data-meow-word-trigger="true"]'),
  ).toHaveCount(0)
  await expect(page.locator('[data-word="serendipity"]')).toHaveCount(1)
})

test('selecting a word immediately updates all existing matches on the page', async ({
  context,
  page,
}) => {
  const worker = await getServiceWorker(context)
  test.skip(
    !worker,
    'Unpacked MV3 extension/service worker unavailable in this environment.',
  )

  await worker!.evaluate(async () => {
    await chrome.storage.sync.set({ myWords: {} })
  })

  await context.route('https://cn.bing.com/dict/clientsearch**', async (route) => {
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: bingResponse,
    })
  })

  await page.goto('http://127.0.0.1:5199/sample.html')

  await page.evaluate(() => {
    const paragraph = Array.from(document.querySelectorAll('p')).find(
      (node) => node.textContent?.includes('Say hello to the world') ?? false,
    )
    if (!paragraph?.firstChild || paragraph.firstChild.nodeType !== Node.TEXT_NODE) {
      throw new Error('sample paragraph not ready')
    }

    const textNode = paragraph.firstChild
    const text = textNode.textContent ?? ''
    const target = 'hello'
    const start = text.indexOf(target)
    if (start < 0) {
      throw new Error('target word not found')
    }

    const selection = window.getSelection()
    if (!selection) {
      throw new Error('selection api unavailable')
    }

    const range = document.createRange()
    range.setStart(textNode, start)
    range.setEnd(textNode, start + target.length)
    selection.removeAllRanges()
    selection.addRange(range)

    const rect = range.getBoundingClientRect()
    paragraph.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom,
      }),
    )
  })

  const tooltip = page.locator('[data-meow-tooltip-root="selection"]')
  await expect(tooltip).toBeVisible({ timeout: 15000 })
  await expect(tooltip).toContainText('已加入词库')
  await expect(
    tooltip.getByRole('button', { name: '加入词库' }),
  ).toHaveCount(0)

  const highlighted = page.locator('[data-word="hello"]')
  await expect(highlighted.first()).toBeVisible({ timeout: 15000 })
  await expect(highlighted).toHaveCount(2)
})

test('highlights and opens hover cards inside github-like inline links', async ({
  context,
  page,
}) => {
  const worker = await getServiceWorker(context)
  test.skip(
    !worker,
    'Unpacked MV3 extension/service worker unavailable in this environment.',
  )

  await worker!.evaluate(async () => {
    await chrome.storage.sync.set({
      myWords: {
        reddit: {
          word: 'reddit',
          isDeleted: false,
          queryTimes: 1,
          deleteTimes: 0,
        },
      },
    })
  })

  await context.route('https://cn.bing.com/dict/clientsearch**', async (route) => {
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: bingResponse,
    })
  })

  await page.goto('http://127.0.0.1:5199/sample.html')

  const highlighted = page.locator('[data-word="reddit"]')
  await expect(highlighted).toHaveCount(2, { timeout: 15000 })
  await expect(highlighted.first()).toBeVisible()

  const trigger = page.locator('[data-meow-word-trigger="true"]').first()
  await trigger.hover()

  const tooltip = page.locator('[data-meow-tooltip-root="stored"]')
  await expect(tooltip).toBeVisible({ timeout: 15000 })
  await expect(tooltip).toContainText('reddit')
  await expect(tooltip).toContainText('lucky discovery')
})
