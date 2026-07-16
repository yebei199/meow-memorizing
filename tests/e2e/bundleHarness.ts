// Real loaded-extension harness. Loads the built extension (.output/chrome-mv3)
// into a persistent Chromium context via --load-extension, so specs exercise
// the real background service worker, real chrome.storage, and real messaging —
// the only setup under which "the worker owns its word set" (ADR-0002) can be
// validated. See docs/adr/0003-e2e-real-loaded-extension.md.
//
// Empirically verified constraints:
// - Branded Chrome 137+ dropped --load-extension; a Playwright-provided Chromium
//   binary is required. We resolve one below.
// - The MV3 worker is lazy: it starts when the content script first messages it
//   (the startup scan), so we wait for it after loading the content page.
// - A worker recycle is simulated deterministically with CDP Target.closeTarget
//   on the service_worker target — the next event starts a fresh instance with
//   cleared module state.
import {
  existsSync,
  mkdtempSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type BrowserContext,
  chromium,
  type Page,
  type Worker,
} from '@playwright/test';
import type { IWordStorage } from '../../src/core/types';

const here = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = resolve(here, '../../.output/chrome-mv3');
const BASE = 'http://127.0.0.1:5199';

// startTranslation() waits 2s before its first scan and only then attaches the
// selection listener. Tests that dispatch a selection must wait past this.
export const STARTUP_MS = 2600;

// Default bing-style dictionary payload; carries the strings existing specs
// assert on (definition text) so callers rarely need to override it.
const DEFAULT_TRANS =
  '<div id="clientnewword" data-definition="n. lucky discovery adj. unexpectedly fortunate"></div>';

/** Locate a Chromium binary that honours --load-extension. */
export function chromiumBinary(): string {
  const env = process.env.PLAYWRIGHT_CHROME;
  if (env && existsSync(env)) return env;
  try {
    const bundled = chromium.executablePath();
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    // executablePath throws if the browser isn't installed; fall through.
  }
  const cache = join(
    process.env.HOME ?? '',
    '.cache/ms-playwright',
  );
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      if (!d.startsWith('chromium-') || d.includes('headless'))
        continue;
      for (const sub of [
        'chrome-linux64/chrome',
        'chrome-linux/chrome',
      ]) {
        const p = join(cache, d, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error(
    'No Chromium binary that accepts --load-extension. Run: npx playwright install chromium',
  );
}

export interface BundleHarness {
  /** Content page with the real extension's content script auto-injected. */
  page: Page;
  context: BrowserContext;
  /** The extension's background service worker. */
  worker: Worker;
  /** Extension id (host of the worker's chrome-extension:// URL). */
  extId: string;
  /**
   * Simulate an MV3 idle recycle: stop the current service worker. The next
   * message from the page starts a fresh instance with cleared module state.
   */
  recycleWorker(): Promise<void>;
  /** Wait for a (possibly restarted) service worker to be live again. */
  waitForWorker(): Promise<Worker>;
  close(): Promise<void>;
}

export interface HarnessOptions {
  /** Fixture URL to load (served by server.ts). */
  url: string;
  /** Optional content-page viewport. */
  viewport?: { width: number; height: number };
  /** Optional host-page CSP header to apply to `url`. */
  csp?: string;
  /** Seed `myWords` before the content script's first scan. */
  seedWords?: Record<string, IWordStorage>;
  /** Override the dictionary HTML the background returns for `trans`. */
  transResponse?: string;
}

async function currentWorker(
  context: BrowserContext,
  timeoutMs = 15000,
): Promise<Worker> {
  let sw = context.serviceWorkers()[0];
  const deadline = Date.now() + timeoutMs;
  while (!sw && Date.now() < deadline) {
    sw = await context
      .waitForEvent('serviceworker', { timeout: 1000 })
      .catch(() => context.serviceWorkers()[0]);
  }
  if (!sw)
    throw new Error(
      'extension service worker never started',
    );
  return sw;
}

/**
 * Launch a persistent Chromium context with the real extension loaded, open the
 * content page, and (optionally) seed storage before the page highlights.
 */
export async function setupBundleHarness(
  opts: HarnessOptions,
): Promise<BundleHarness> {
  const userDir = mkdtempSync(join(tmpdir(), 'meow-ext-'));
  const context = await chromium.launchPersistentContext(
    userDir,
    {
      // headless:false makes Playwright launch the full Chromium (not the
      // headless_shell, which can't load extensions); --headless=new then runs
      // it in Chrome's new headless mode — no visible window, no focus stealing,
      // extensions still supported.
      headless: false,
      executablePath: chromiumBinary(),
      ...(opts.viewport ? { viewport: opts.viewport } : {}),
      args: [
        '--headless=new',
        `--disable-extensions-except=${EXT_DIR}`,
        `--load-extension=${EXT_DIR}`,
      ],
    },
  );

  // Intercept the bing dictionary lookup the real background worker makes, so
  // specs stay offline and deterministic (replaces the stand-in transResponse).
  const transResponse = opts.transResponse ?? DEFAULT_TRANS;
  await context.route(
    '**/dict/clientsearch**',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: transResponse,
      }),
  );

  if (opts.csp) {
    const csp = opts.csp;
    await context.route(opts.url, async (route) => {
      const res = await route.fetch();
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: { 'content-security-policy': csp },
        body: await res.text(),
      });
    });
  }

  const page = await context.newPage();
  await page.goto(opts.url, { waitUntil: 'load' });

  // The content script wakes the worker on its first scan; grab it, then seed.
  const worker = await currentWorker(context);
  const extId = new URL(worker.url()).host;

  if (opts.seedWords) {
    await worker.evaluate((seed) => {
      // chrome.storage.sync backs WXT's `sync:myWords` item.
      const c = (
        globalThis as unknown as {
          chrome: {
            storage: {
              sync: {
                set(v: unknown): Promise<void>;
              };
            };
          };
        }
      ).chrome;
      return c.storage.sync.set({ myWords: seed });
    }, opts.seedWords);
    // Re-scan with the seeded words now present (the first scan saw none).
    await page.reload({ waitUntil: 'load' });
  }

  return {
    page,
    context,
    worker,
    extId,
    recycleWorker: async () => {
      const session = await context.newCDPSession(page);
      const { targetInfos } = await session.send(
        'Target.getTargets',
      );
      const sw = targetInfos.find(
        (t) =>
          t.type === 'service_worker' &&
          t.url.includes(extId),
      );
      if (sw)
        await session.send('Target.closeTarget', {
          targetId: sw.targetId,
        });
      await session.detach();
    },
    waitForWorker: () => currentWorker(context),
    close: async () => {
      await context.close();
    },
  };
}

/** Dispatch a real selection + mouseup over `target` text inside `selector`. */
export async function selectWord(
  page: Page,
  selector: string,
  word: string,
): Promise<void> {
  await page.evaluate(
    ({ selector, word }) => {
      const host = document.querySelector(selector);
      const walker = document.createTreeWalker(
        host ?? document.body,
        NodeFilter.SHOW_TEXT,
      );
      let node: Node | null = walker.nextNode();
      while (node) {
        const idx = (node.textContent ?? '').indexOf(word);
        if (idx >= 0) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + word.length);
          const sel = getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          const rect = range.getBoundingClientRect();
          (host ?? document.body).dispatchEvent(
            new MouseEvent('mouseup', {
              bubbles: true,
              clientX: rect.left + rect.width / 2,
              clientY: rect.bottom,
            }),
          );
          return;
        }
        node = walker.nextNode();
      }
      throw new Error(
        `word "${word}" not found in "${selector}"`,
      );
    },
    { selector, word },
  );
}
