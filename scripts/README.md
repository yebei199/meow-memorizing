# scripts

Build helpers for the Rust→WASM matcher.

- `build-wasm.sh` — compile `crates/wasm-matcher` (release, wasm32) and run
  wasm-bindgen (`--target web`) into `src/wasm/generated/`, asserting the
  wasm-bindgen CLI matches the pinned `0.2.122` crate version. If both a
  profile-managed binary and `~/.cargo/bin/wasm-bindgen` exist, the script
  prefers the user-installed cargo binary.
- `inline-wasm.ts` — embed the compiled `.wasm` as base64
  (`src/wasm/generated/matcher-inline.ts`) so the content script is
  self-contained.

Run both via `bun run wasm`; the `build` scripts call it automatically.
