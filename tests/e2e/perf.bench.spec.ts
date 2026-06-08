// Performance attribution micro-benchmark.
//
// Splits the highlight pipeline's per-page cost into the three suspects raised
// for the page-jank report and times each in isolation, so we can tell which
// one dominates instead of guessing:
//
//   1. WASM compute      — real wasm-bindgen matcher over every text node.
//   2. Message passing   — real Worker round-trips with realistic payloads,
//                          measured per-node (one message each, as the current
//                          pipeline does) vs one batched message, to expose the
//                          "too many / too frequent objects" cost.
//   3. DOM build         — the exact span-wrapping + replaceChild reflow work
//                          domUtils does, minus React.
//
// Why no harness: bundleHarness routes matcher messages through a second
// Playwright page via worker.evaluate(), whose cross-page latency dwarfs a real
// content<->background postMessage and would make section 2 meaningless. Here
// section 2 uses a real in-page Worker, the faithful structured-clone + thread
// hop. No hard perf assertions (kept non-flaky); numbers are reported as
// annotations.
import { expect, test } from '@playwright/test';

// A node count and text shape that approximate a content-heavy article page.
const NODE_COUNT = 600;
const REAL_WORDS = [
  'hello', 'world', 'word', 'language', 'memory', 'browser',
  'extension', 'rust', 'match', 'text', 'scan', 'fast', 'every',
  'this', 'page', 'node', 'wasm', 'token', 'vocabulary', 'learn',
];

function wordList(): string[] {
  const distractors: string[] = [];
  for (let i = 0; i < 800; i++) {
    distractors.push(`zq${i.toString(36)}xk`);
  }
  return [...REAL_WORDS, ...distractors];
}

// One representative text node: a couple of sentences carrying several matches.
function nodeText(): string {
  return (
    'hello world this rust browser extension will scan text ' +
    'in memory to match every word fast on this page node. '
  ).repeat(2);
}

test('attributes page-scan cost across wasm, messaging and DOM', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:5199/sample.html');

  const result = await page.evaluate(
    async ({ words, nodeCount, sample }) => {
      const texts = Array.from({ length: nodeCount }, () => sample);

      // ---- 1. WASM compute: scan every node with the real matcher. ----
      const mod = await import(
        'http://127.0.0.1:5199/wasm/matcher.js'
      );
      await mod.default();
      mod.set_words(words, []);
      const wasm0 = performance.now();
      let totalMatches = 0;
      for (const t of texts) {
        totalMatches += (mod.find_matches(t) as unknown[]).length;
      }
      const wasmMs = performance.now() - wasm0;

      // ---- 2. Message passing via a real Worker. ----
      // Echo worker: receives {id, text|texts}, replies with a Match-shaped
      // payload of the same size the matcher returns, exercising structured
      // clone in both directions on a real thread hop.
      const workerSrc = `
        self.onmessage = (e) => {
          const { id, text, texts } = e.data;
          const make = (t) => {
            const out = [];
            for (let i = 0; i < 8; i++) out.push({ index: i, word: 'word', end: i + 4 });
            return out;
          };
          if (texts) self.postMessage({ id, res: texts.map(make) });
          else self.postMessage({ id, res: make(text) });
        };
      `;
      const url = URL.createObjectURL(
        new Blob([workerSrc], { type: 'text/javascript' }),
      );
      const worker = new Worker(url);
      const pending = new Map<number, (v: unknown) => void>();
      worker.onmessage = (e: MessageEvent) => {
        const resolve = pending.get(e.data.id);
        if (resolve) {
          pending.delete(e.data.id);
          resolve(e.data.res);
        }
      };
      let seq = 0;
      const send = (payload: Record<string, unknown>): Promise<unknown> =>
        new Promise((resolve) => {
          const id = ++seq;
          pending.set(id, resolve);
          worker.postMessage({ id, ...payload });
        });

      // 2a. One message per node, in chunks of 50 fired in parallel — exactly
      // the current pipeline's shape (processTextNodesInChunks).
      const perNode0 = performance.now();
      for (let i = 0; i < texts.length; i += 50) {
        const chunk = texts.slice(i, i + 50);
        await Promise.all(chunk.map((text) => send({ text })));
      }
      const perNodeMs = performance.now() - perNode0;

      // 2b. A single batched message carrying every node's text.
      const batch0 = performance.now();
      await send({ texts });
      const batchMs = performance.now() - batch0;

      worker.terminate();
      URL.revokeObjectURL(url);

      // ---- 3. DOM build: span-wrap matches + replaceChild, as domUtils does. ----
      const host = document.createElement('div');
      document.body.appendChild(host);
      const nodes = texts.map((t) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(t));
        host.appendChild(p);
        return p;
      });
      // Force initial layout so the rebuild below pays real reflow cost.
      void host.offsetHeight;

      const dom0 = performance.now();
      let rootCount = 0;
      for (const p of nodes) {
        const textNode = p.firstChild as Text;
        const text = textNode.textContent ?? '';
        const fragment = document.createDocumentFragment();
        // Wrap each occurrence of a real word (mirrors per-match span creation).
        let last = 0;
        const re = /\b(hello|world|rust|browser|extension|text|memory|page|node|word)\b/g;
        let m: RegExpExecArray | null;
        // biome-ignore lint/suspicious/noAssignInExpressions: tight scan loop
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) {
            fragment.appendChild(
              document.createTextNode(text.slice(last, m.index)),
            );
          }
          const span = document.createElement('span');
          span.setAttribute('data-word', m[0]);
          span.textContent = m[0];
          span.style.display = 'inline';
          span.style.position = 'relative';
          fragment.appendChild(span);
          rootCount += 1;
          last = m.index + m[0].length;
        }
        if (last < text.length) {
          fragment.appendChild(
            document.createTextNode(text.slice(last)),
          );
        }
        p.replaceChild(fragment, textNode);
      }
      void host.offsetHeight;
      const domMs = performance.now() - dom0;
      host.remove();

      return {
        nodeCount: texts.length,
        totalMatches,
        rootCount,
        wasmMs,
        perNodeMs,
        batchMs,
        domMs,
      };
    },
    { words: wordList(), nodeCount: NODE_COUNT, sample: nodeText() },
  );

  expect(result.totalMatches).toBeGreaterThan(0);

  const lines = [
    `nodes=${result.nodeCount} matches=${result.totalMatches} domSpans=${result.rootCount}`,
    `1) wasm compute (all nodes):      ${result.wasmMs.toFixed(1)}ms`,
    `2a) messaging per-node (${result.nodeCount} msgs): ${result.perNodeMs.toFixed(1)}ms`,
    `2b) messaging batched (1 msg):    ${result.batchMs.toFixed(1)}ms`,
    `3) DOM span-wrap + reflow:        ${result.domMs.toFixed(1)}ms`,
    `note: pipeline also calls createRoot() once per domSpan ` +
      `(${result.rootCount} React roots) on top of (3) — the JS-side multiplier.`,
  ];
  // Surface the breakdown both in the report and the run log.
  for (const line of lines) {
    test.info().annotations.push({ type: 'perf', description: line });
  }
  console.log(`\n[perf]\n${lines.join('\n')}\n`);
});
