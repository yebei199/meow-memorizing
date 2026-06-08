// Unified word-matching entry point: WASM-first with JS fallback.
//
// Exposes the same `(text, wordsList) => { index, word, end }[]` signature as
// the legacy wordMatcher, so it drops into the existing processTextNode call
// sites. The WASM automata are rebuilt only when a new wordsList object
// arrives (textProcessor passes one shared object per page pass), removing the
// per-node re-sort of the whole word table. If WASM is unavailable or throws,
// we fall back to the original JS implementation.
import {
  ensureMatcher,
  type WasmMatch,
  type WasmMatcher,
} from '@/src/wasm/matcherLoader'
import {
  findDeletedWords as jsFindDeletedWords,
  findMatchingWords as jsFindMatchingWords,
} from './wordMatcher'

type WordsList = Record<string, any>
type WordMatch = { index: number; word: string; end: number }

// Reference of the wordsList the cached automata were built from.
let lastWordsList: WordsList | null = null

/**
 * Return the wasm matcher with automata in sync with `wordsList`, or null if
 * wasm is unavailable. Rebuilds automata only when the wordsList changes.
 */
function syncedMatcher(
  wordsList: WordsList,
): WasmMatcher | null {
  const matcher = ensureMatcher()
  if (!matcher) return null
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

/** Active-word matches, WASM-first with JS fallback. */
export function findMatchingWords(
  text: string,
  wordsList: WordsList,
): WordMatch[] {
  const matcher = syncedMatcher(wordsList)
  if (matcher) {
    try {
      return matcher.findMatches(text)
    } catch (error) {
      console.warn('[meow] WASM match failed, JS fallback:', error)
    }
  }
  return jsFindMatchingWords(text, wordsList)
}

/** Deleted-word matches, WASM-first with JS fallback. */
export function findDeletedWords(
  text: string,
  wordsList: WordsList,
): WordMatch[] {
  const matcher = syncedMatcher(wordsList)
  if (matcher) {
    try {
      return matcher.findDeletedMatches(text)
    } catch (error) {
      console.warn('[meow] WASM match failed, JS fallback:', error)
    }
  }
  return jsFindDeletedWords(text, wordsList)
}

export type { WasmMatch }
