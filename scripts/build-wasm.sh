#!/usr/bin/env bash
# Build the wasm-matcher crate to wasm32 and run wasm-bindgen, emitting a
# browser ES module + .wasm into src/wasm/generated/. The .wasm is then
# embedded as base64 by scripts/inline-wasm.ts so the content script is
# self-contained (no fetch / no web_accessible_resources).
#
# Requires: wasm32-unknown-unknown target and wasm-bindgen-cli, whose version
# must match the pinned `wasm-bindgen` crate exactly.
set -euo pipefail

cd "$(dirname "$0")/.."

PINNED="0.2.121"
CLI_VER="$(wasm-bindgen --version | awk '{print $2}')"
if [ "$CLI_VER" != "$PINNED" ]; then
    echo "error: wasm-bindgen CLI $CLI_VER != pinned crate $PINNED" >&2
    echo "       install the matching wasm-bindgen-cli." >&2
    exit 1
fi

TARGET_DIR="target/wasm32-unknown-unknown/release"
OUT_DIR="src/wasm/generated"

echo ">> building wasm-matcher (release, wasm32)"
cargo build -p wasm-matcher --release --target wasm32-unknown-unknown

echo ">> wasm-bindgen -> $OUT_DIR"
wasm-bindgen \
    --target web \
    --out-dir "$OUT_DIR" \
    --out-name matcher \
    "$TARGET_DIR/matcher.wasm"

echo ">> wasm glue ready under $OUT_DIR/"
