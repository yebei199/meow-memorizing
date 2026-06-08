# scripts

Build helpers for the Rust→WASM matcher.

- `build-wasm.sh` — compile `crates/wasm-matcher` (release, wasm32) and run
  wasm-bindgen (`--target web`) into `src/wasm/generated/`, asserting the
  wasm-bindgen CLI matches the pinned crate version.
- `inline-wasm.ts` — embed the compiled `.wasm` as base64
  (`src/wasm/generated/matcher-inline.ts`) so the content script is
  self-contained.

Run both via `bun run wasm`; the `build` scripts call it automatically.
