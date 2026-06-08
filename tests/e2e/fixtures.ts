// Playwright fixtures that load the built MV3 extension into a persistent
// context (the only way Chrome accepts an unpacked extension). Build first:
// `bun run build`.
//
// Loading unpacked extensions requires a real display or a headless build that
// permits --load-extension; where that is unavailable the service worker never
// appears and extension tests skip themselves (see getServiceWorker).
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type BrowserContext,
  chromium,
  test as base,
  type Worker,
} from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const extensionPath = resolve(here, '../../.output/chrome-mv3')
const chrome =
  process.env.PLAYWRIGHT_CHROME ??
  '/etc/profiles/per-user/yb/bin/google-chrome'

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    // headless:false + the `--headless=new` arg is the canonical way to load
    // an unpacked extension without a display: Playwright must not inject the
    // legacy `--headless` flag, which disables extensions. The disable-features
    // switch re-enables --load-extension on recent Chrome.
    const context = await chromium.launchPersistentContext('', {
      executablePath: chrome,
      headless: false,
      args: [
        '--headless=new',
        '--no-sandbox',
        '--disable-features=DisableLoadExtensionCommandLineSwitch',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    await use(context)
    await context.close()
  },
})

export const expect = test.expect

/**
 * Return the extension's background service worker, or null if it does not
 * appear within the timeout (e.g. the environment cannot load the unpacked
 * extension). Callers should `test.skip` when null.
 */
export async function getServiceWorker(
  context: BrowserContext,
  timeout = 8000,
): Promise<Worker | null> {
  const [existing] = context.serviceWorkers()
  if (existing) return existing
  try {
    return await context.waitForEvent('serviceworker', {
      timeout,
    })
  } catch {
    return null
  }
}
