# src/wasm

Frontend glue for the Rust→WASM word matcher (`crates/wasm-matcher`).

- `matcherLoader.ts` — synchronous, cached `initSync` loader over the
  base64-embedded binary; returns `null` on failure so callers fall back to
  the JS implementation.
- `generated/` — produced by `bun run wasm` (wasm-bindgen glue + `.wasm` +
  `matcher-inline.ts` base64 payload). Gitignored; rebuild before
  `compile`/`build`.

The WASM-first/JS-fallback dispatch lives in
`src/content-scripts/matcherFacade.ts`.
