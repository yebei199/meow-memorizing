// Regression: highlighting must survive a strict host-page CSP.
//
// Content scripts run in the host page's isolated world, which inherits the
// page CSP. On sites whose `script-src` omits `wasm-unsafe-eval` (GitHub, X, …)
// `new WebAssembly.Module` throws `CompileError`. Previously the matcher ran in
// the content script, so on such pages it threw and NOTHING highlighted — the
// real bug behind "selecting a word doesn't highlight across the GitHub page".
// The fix moves the WASM matcher into the background worker (permissive
// extension CSP) and drives it over messaging.
//
// This test does not load the extension (unpacked loading is blocked in recent
// Chrome). Instead it injects the real built content bundle into a page carrying
// a GitHub-like CSP, and routes the bundle's matcher messages to a second,
// CSP-free page running the real WASM matcher — a faithful stand-in for the
// background service worker.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = readFileSync(
  resolve(
    here,
    '../../.output/chrome-mv3/content-scripts/trans.js',
  ),
  'utf8',
);

// Host CSP that allows inline script (so the harness can inject the bundle the
// way the browser injects a content script) but omits `wasm-unsafe-eval` — the
// exact shape that breaks in-content WASM.
const GITHUB_LIKE_CSP =
  "script-src 'self' 'unsafe-inline'; object-src 'self'";

// Faked webext storage + runtime, installed before the bundle runs. `get`
// structured-clones like the real chrome.storage; matcher/trans messages route
// to the Node-side `__bg` bridge.
function installFakeBrowser(): void {
  const mem: Record<string, unknown> = {
    myWords: {},
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
      for (const x of Object.keys(o)) mem[x] = clone(o[x]);
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
      id: 'csp-test',
      getURL: (p: string) => `about:blank#${p}`,
      onMessage: { addListener() {} },
      // @webext-core/messaging expects a `{ res } | { err }` envelope.
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
}

test('highlighting survives a strict (no wasm-unsafe-eval) page CSP', async ({
  browser,
}) => {
  // Background-worker stand-in: a CSP-free page running the real WASM matcher.
  const workerCtx = await browser.newContext();
  const worker = await workerCtx.newPage();
  await worker.goto('http://127.0.0.1:5199/sample.html');
  await worker.evaluate(async () => {
    const mod = await import(
      'http://127.0.0.1:5199/wasm/matcher.js'
    );
    await mod.default();
    (window as unknown as Record<string, unknown>).__m =
      mod;
  });
  type Wasm = {
    set_words(a: string[], d: string[]): void;
    find_matches(t: string): unknown;
    find_deleted_matches(t: string): unknown;
  };
  const bg = async (
    type: string,
    data: {
      text?: string;
      active?: string[];
      deleted?: string[];
    },
  ) => {
    if (type === 'matcherSetWords') {
      await worker.evaluate(
        (d) =>
          (
            window as unknown as { __m: Wasm }
          ).__m.set_words(d.active ?? [], d.deleted ?? []),
        data,
      );
      return undefined;
    }
    if (type === 'matcherFindMatches')
      return worker.evaluate(
        (d) =>
          (
            window as unknown as { __m: Wasm }
          ).__m.find_matches(d.text ?? ''),
        data,
      );
    if (type === 'matcherFindDeleted')
      return worker.evaluate(
        (d) =>
          (
            window as unknown as { __m: Wasm }
          ).__m.find_deleted_matches(d.text ?? ''),
        data,
      );
    if (type === 'trans')
      return '<div id="clientnewword" data-definition="n. 话题"></div>';
    return undefined;
  };

  // Content context carrying the strict, GitHub-like CSP.
  const contentCtx = await browser.newContext();
  const page = await contentCtx.newPage();
  await page.exposeFunction('__bg', bg);
  await page.route(
    '**/github-trending.html',
    async (route) => {
      const res = await route.fetch();
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: {
          'content-security-policy': GITHUB_LIKE_CSP,
        },
        body: await res.text(),
      });
    },
  );
  await page.addInitScript(installFakeBrowser);
  await page.goto(
    'http://127.0.0.1:5199/github-trending.html',
    {
      waitUntil: 'load',
    },
  );
  await page.addScriptTag({ content: bundle });

  // Let startTranslation (2s delay) and its first scan run under the CSP.
  await page.waitForTimeout(3000);

  // Select the first "topic" in the description and complete the selection.
  await page.evaluate(() => {
    const p = Array.from(
      document.querySelectorAll('p'),
    ).find((n) =>
      n.textContent?.includes('researches any topic'),
    );
    const tn = p?.firstChild;
    if (!tn || tn.nodeType !== Node.TEXT_NODE)
      throw new Error('paragraph not ready');
    const start = (tn.textContent ?? '').indexOf('topic');
    const range = document.createRange();
    range.setStart(tn, start);
    range.setEnd(tn, start + 'topic'.length);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const rect = range.getBoundingClientRect();
    p?.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom,
      }),
    );
  });

  // Under the old (in-content WASM) code this stays 0 — CompileError kills the
  // matcher. With the worker-backed matcher every "topic" is highlighted:
  // 3 standalone + 1 inside "topic-modeling" (hyphen is a word boundary).
  const highlighted = page.locator('[data-word="topic"]');
  await expect(highlighted.first()).toBeVisible({
    timeout: 10000,
  });
  await expect(highlighted).toHaveCount(4);

  await workerCtx.close();
  await contentCtx.close();
});
