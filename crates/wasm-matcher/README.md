# wasm-matcher

WebAssembly backend for the page word scanner. Replaces the JS
`O(text × words)` `indexOf` loop with a single-pass Aho-Corasick scan.

## Responsibility

- Build and cache two Aho-Corasick automata (active + deleted word lists)
  keyed by the current word set, rebuilt only when the set changes.
- Scan a text node's string once, applying ASCII word-boundary checks and
  returning matches as `{ index, word, end }` to mirror the legacy JS
  contract in `src/content-scripts/wordMatcher.ts`.

DOM traversal and rendering stay in JS; this crate is pure text computation.

## Boundary

`#[wasm_bindgen]` exports (see `src/lib.rs`):

- `set_words(active, deleted)` — (re)build cached automata.
- `find_matches(text)` — matches against active words.
- `find_deleted_matches(text)` — matches against deleted words.

Match semantics: leftmost-longest, non-overlapping, ASCII case-insensitive,
both flanks non-`[a-zA-Z]`. Returned `word` preserves the source casing.

## Build

`cargo test -p wasm-matcher` runs native unit tests. Browser artifacts are
produced by `scripts/build-wasm.sh` (wasm32 release + wasm-bindgen) and
inlined as base64 by `scripts/inline-wasm.ts`. See repo `AGENTS.md`.
