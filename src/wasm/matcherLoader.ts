// Synchronous loader for the wasm-matcher backend.
//
// The .wasm is base64-embedded (matcher-inline) so initSync needs no fetch —
// content scripts cannot rely on fetching extension resources. Initialised
// once and cached. There is no JS fallback: a browser without WASM support is
// unsupported by design, so init failure throws and the feature is off.
// Generated glue under ./generated is produced by `bun run wasm`.
import {
  find_deleted_matches,
  find_matches,
  initSync,
  set_words,
} from './generated/matcher.js'
import { wasmBytes } from './generated/matcher-inline'

/** One match, mirroring the JS `{ index, word, end }` contract. */
export interface WasmMatch {
  index: number
  word: string
  end: number
}

/** Bound, type-safe surface over the wasm exports. */
export interface WasmMatcher {
  setWords(active: string[], deleted: string[]): void
  findMatches(text: string): WasmMatch[]
  findDeletedMatches(text: string): WasmMatch[]
}

let cached: WasmMatcher | undefined

/**
 * Initialise the wasm matcher once and return it. Throws if WASM is
 * unavailable — there is no JS fallback. Safe to call on every match;
 * subsequent calls hit the cache.
 */
export function ensureMatcher(): WasmMatcher {
  if (cached !== undefined) return cached
  initSync({ module: wasmBytes })
  cached = {
    setWords: (active, deleted) => set_words(active, deleted),
    findMatches: (text) =>
      find_matches(text) as WasmMatch[],
    findDeletedMatches: (text) =>
      find_deleted_matches(text) as WasmMatch[],
  }
  return cached
}
