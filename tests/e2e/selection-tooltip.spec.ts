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
  await expect(tooltip.locator('[data-word]')).toHaveCount(0)
  await expect(
    tooltip.locator('[data-meow-word-trigger="true"]'),
  ).toHaveCount(0)
})
