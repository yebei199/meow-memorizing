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
- `package-extensions.rs` — clean old project ZIP artifacts, build WASM once,
  then create Chrome and Firefox
  production ZIP artifacts plus the Firefox source ZIP under `.output/`; it
  also refreshes the `.output/chrome-mv3-build` unpacked Chrome directory used
  for local loading.
- `update-readme-gif.ts` — build-time documentation helper that records the
  real content bundle through the Playwright e2e harness, converts the WebM
  recording to GIF with `ffmpeg`, uploads it to Zipline
  (`ZIPLINE_TOKEN`, optional `ZIPLINE_URL`), and replaces the README demo image
  URL.

Run the WASM steps via `bun run wasm`; the `build` scripts call them
automatically. `bun run build:test` creates only the Chrome bundle needed by
Playwright and does not create release ZIPs. Regenerate the README demo with
`bun run docs:gif`.
