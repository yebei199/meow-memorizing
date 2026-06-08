// Unified word-matching entry point, backed solely by the WASM matcher.
//
// Exposes the same `(text, wordsList) => { index, word, end }[]` signature the
// processTextNode call sites expect. The WASM automata are rebuilt only when a
// new wordsList object arrives (textProcessor passes one shared object per page
// pass), removing the per-node re-sort of the whole word table. There is no JS
// fallback: if WASM is unavailable the loader throws and the feature is off.
import {
  ensureMatcher,
  type WasmMatch,
  type WasmMatcher,
} from '@/src/wasm/matcherLoader'

type WordsList = Record<string, any>
type WordMatch = { index: number; word: string; end: number }

// Reference of the wordsList the cached automata were built from.
let lastWordsList: WordsList | null = null

/**
 * Return the wasm matcher with automata in sync with `wordsList`. Rebuilds
 * automata only when the wordsList reference changes.
 */
function syncedMatcher(wordsList: WordsList): WasmMatcher {
  const matcher = ensureMatcher()
  if (wordsList !== lastWordsList) {
    const active: string[] = []
    const deleted: string[] = []
    for (const key of Object.keys(wordsList)) {
      const entry = wordsList[key]
      if (!entry || typeof entry.word !== 'string') continue
      if (entry.isDeleted) deleted.push(entry.word)
      else active.push(entry.word)
    }
    matcher.setWords(active, deleted)
    lastWordsList = wordsList
  }
  return matcher
}

/** Active-word matches. */
export function findMatchingWords(
  text: string,
  wordsList: WordsList,
): WordMatch[] {
  return syncedMatcher(wordsList).findMatches(text)
}

/** Deleted-word matches. */
export function findDeletedWords(
  text: string,
  wordsList: WordsList,
): WordMatch[] {
  return syncedMatcher(wordsList).findDeletedMatches(text)
}

export type { WasmMatch }
