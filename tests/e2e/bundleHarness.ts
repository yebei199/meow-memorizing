// Bundle-injection harness — runs the real content script without loading the
// extension (recent Chrome blocks unpacked --load-extension, and CDP
// loadUnpacked leaves the extension inert in headless/CI).
//
// It injects the built content bundle into a normal page, fakes the
// `browser`/`chrome` surface the bundle needs (storage + messaging), and routes
// the bundle's WASM-matcher messages to a second, CSP-free page running the
// real matcher — a faithful stand-in for the background service worker, which
// is where the matcher actually lives (see entrypoints/background.ts).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from '@playwright/test';
import type { IWordStorage } from '../../src/core/types';

const here = dirname(fileURLToPath(import.meta.url));
const BUNDLE = readFileSync(
  resolve(
    here,
    '../../.output/chrome-mv3/content-scripts/trans.js',
  ),
  'utf8',
);
const BASE = 'http://127.0.0.1:5199';

// startTranslation() waits 2s before its first scan and only then attaches the
// selection listener. Tests that dispatch a selection must wait past this, or
// the mouseup lands before the listener exists.
export const STARTUP_MS = 2600;

// Default bing-style dictionary payload; carries the strings existing specs
// assert on (definition text) so callers rarely need to override it.
const DEFAULT_TRANS =
  '<div id="clientnewword" data-definition="n. lucky discovery adj. unexpectedly fortunate"></div>';

interface WasmModule {
  set_words(active: string[], deleted: string[]): void;
  find_matches(text: string): unknown;
  find_deleted_matches(text: string): unknown;
}
type WorkerWindow = Window & { __m: WasmModule };

export interface BundleHarness {
  /** Content page: real bundle injected, fake browser surface installed. */
  page: Page;
  close(): Promise<void>;
}

export interface HarnessOptions {
  /** Fixture URL to load the content bundle into (served by server.ts). */
  url: string;
  /** Optional content-page viewport, mainly for deterministic demo captures. */
  viewport?: { width: number; height: number };
  /** Optional video recording for the content page context. */
  recordVideo?: {
    dir: string;
    size?: { width: number; height: number };
  };
  /** Optional host-page CSP header to apply to `url`. */
  csp?: string;
  /** Seed `myWords` before the bundle's startup scan reads storage. */
  seedWords?: Record<string, IWordStorage>;
  /** Override the dictionary HTML returned for `trans` messages. */
  transResponse?: string;
}

/**
 * Spin up a worker stand-in + a content page with the bundle injected. The
 * bundle starts its own scan (after its 2s delay); callers then drive the page.
 */
export async function setupBundleHarness(
  browser: Browser,
  opts: HarnessOptions,
): Promise<BundleHarness> {
  // Worker stand-in: a CSP-free page that loads and holds the real WASM matcher.
  const workerCtx = await browser.newContext();
  const worker = await workerCtx.newPage();
  await worker.goto(`${BASE}/sample.html`);
  await worker.evaluate(async () => {
    const matcherUrl =
      'http://127.0.0.1:5199/wasm/matcher.js';
    const mod = await import(matcherUrl);
    await mod.default();
    (window as unknown as WorkerWindow).__m =
      mod as unknown as WasmModule;
  });

  const transResponse = opts.transResponse ?? DEFAULT_TRANS;
  const bg = async (
    type: string,
    data: {
      text?: string;
      active?: string[];
      deleted?: string[];
    },
  ): Promise<unknown> => {
    if (type === 'matcherSetWords') {
      await worker.evaluate(
        (d) =>
          (window as unknown as WorkerWindow).__m.set_words(
            d.active ?? [],
            d.deleted ?? [],
          ),
        data,
      );
      return undefined;
    }
    if (type === 'matcherFindMatches')
      return worker.evaluate(
        (d) =>
          (
            window as unknown as WorkerWindow
          ).__m.find_matches(d.text ?? ''),
        data,
      );
    if (type === 'matcherFindDeleted')
      return worker.evaluate(
        (d) =>
          (
            window as unknown as WorkerWindow
          ).__m.find_deleted_matches(d.text ?? ''),
        data,
      );
    if (type === 'trans') return transResponse;
    return undefined;
  };

  const contentCtx = await browser.newContext({
    ...(opts.viewport ? { viewport: opts.viewport } : {}),
    ...(opts.recordVideo
      ? { recordVideo: opts.recordVideo }
      : {}),
  });
  const page = await contentCtx.newPage();
  await page.exposeFunction('__bg', bg);
  if (opts.csp) {
    const csp = opts.csp;
    await page.route(opts.url, async (route) => {
      const res = await route.fetch();
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: { 'content-security-policy': csp },
        body: await res.text(),
      });
    });
  }
  await page.addInitScript((seed) => {
    const mem: Record<string, unknown> = {
      myWords: seed ?? {},
      isWebsiteDarkMode: false,
    };
    const clone = (v: unknown) => structuredClone(v);
    const area = () => ({
      get: async (k: unknown) => {
        if (k == null) return clone(mem);
        if (typeof k === 'string')
          return { [k]: clone(mem[k]) };
        if (Array.isArray(k)) {
          const o: Record<string, unknown> = {};
          for (const x of k) o[x] = clone(mem[x]);
          return o;
        }
        const o: Record<string, unknown> = {};
        for (const x of Object.keys(k as object))
          o[x] = x in mem ? clone(mem[x]) : (k as never)[x];
        return o;
      },
      set: async (o: Record<string, unknown>) => {
        for (const x of Object.keys(o))
          mem[x] = clone(o[x]);
      },
      remove: async () => {},
      onChanged: { addListener() {}, removeListener() {} },
    });
    const g = globalThis as unknown as Record<
      string,
      unknown
    >;
    g.browser = {
      runtime: {
        id: 'harness',
        getURL: (p: string) => `about:blank#${p}`,
        onMessage: { addListener() {} },
        sendMessage: async (msg: {
          type: string;
          data: unknown;
        }) => ({
          res: await (
            g.__bg as (
              t: string,
              d: unknown,
            ) => Promise<unknown>
          )(msg.type, msg.data),
        }),
      },
      storage: { sync: area(), local: area() },
    };
    g.chrome = g.browser;
  }, opts.seedWords ?? {});

  await page.goto(opts.url, { waitUntil: 'load' });
  await page.addScriptTag({ content: BUNDLE });

  return {
    page,
    close: async () => {
      await contentCtx.close();
      await workerCtx.close();
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
