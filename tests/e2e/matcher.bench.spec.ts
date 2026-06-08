// Equivalence + performance guard for the WASM matcher.
//
// Imports the real wasm-bindgen module over http and runs it against an
// independent in-page JS oracle (correct leftmost-longest scan) on a large
// input. Asserts the two produce identical matches (the correctness contract)
// and records both timings (the reason the refactor exists). No hard perf
// assertion, to stay non-flaky.
import { expect, test } from '@playwright/test'

const REAL_WORDS = [
  'hello', 'world', 'word', 'language', 'memory', 'browser',
  'extension', 'rust', 'match', 'text', 'scan', 'fast', 'every',
  'this', 'page', 'node', 'wasm', 'token', 'vocabulary', 'learn',
]

// A realistic word list is large (a learner's vocabulary). Distractors never
// appear in the text, so both implementations find the same matches — but the
// JS scan pays O(text × words) per position while aho-corasick is independent
// of word-list size. This is the actual motivation for the WASM backend.
function wordList(): string[] {
  const distractors: string[] = []
  for (let i = 0; i < 800; i++) {
    distractors.push(`zq${i.toString(36)}xk`)
  }
  return [...REAL_WORDS, ...distractors]
}

function bigText(): string {
  const sentence =
    'hello world this rust browser extension will scan text ' +
    'in memory to match every word fast on this page node. '
  return sentence.repeat(1500)
}

test('wasm matches equal the JS reference', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/sample.html')

  const result = await page.evaluate(
    async ({ words, text }) => {
      const mod = await import(
        'http://127.0.0.1:5199/wasm/matcher.js'
      )
      await mod.default()
      mod.set_words(words, [])

      const w0 = performance.now()
      const wasm = mod.find_matches(text)
      const w1 = performance.now()

      // Independent JS oracle mirroring aho-corasick leftmost-longest +
      // non-overlapping find_iter, then the ASCII boundary filter. Kept as a
      // correct reference algorithm to guard the WASM output, not a port of
      // any prior implementation.
      function jsFind(
        text: string,
        words: string[],
      ): { index: number; word: string; end: number }[] {
        const sorted = [...words].sort(
          (a, b) => b.length - a.length,
        )
        const lower = text.toLowerCase()
        const isBoundary = (c: string) => /^[^a-zA-Z]$/.test(c)
        const matches: {
          index: number
          word: string
          end: number
        }[] = []
        let i = 0
        while (i < text.length) {
          let matchedLen = 0
          for (const word of sorted) {
            const wl = word.length
            if (
              lower.startsWith(word.toLowerCase(), i)
            ) {
              matchedLen = wl
              const before = i > 0 ? text[i - 1] : ' '
              const after =
                i + wl < text.length
                  ? text[i + wl]
                  : ' '
              if (isBoundary(before) && isBoundary(after)) {
                matches.push({
                  index: i,
                  word: text.substring(i, i + wl),
                  end: i + wl,
                })
              }
              break
            }
          }
          i += matchedLen > 0 ? matchedLen : 1
        }
        return matches
      }

      const j0 = performance.now()
      const js = jsFind(text, words)
      const j1 = performance.now()

      return {
        wasm,
        js,
        wasmMs: w1 - w0,
        jsMs: j1 - j0,
        count: wasm.length,
      }
    },
    { words: wordList(), text: bigText() },
  )

  expect(result.count).toBeGreaterThan(0)
  expect(result.wasm).toEqual(result.js)
  test
    .info()
    .annotations.push({
      type: 'perf',
      description: `${result.count} matches — wasm ${result.wasmMs.toFixed(1)}ms vs js ${result.jsMs.toFixed(1)}ms`,
    })
})
