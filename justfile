set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    @just --list

# ── Dev ──────────────────────────────────────────────────────────────────────

# Start WXT dev server (hot-reload, Chrome)
[no-exit-message]
dev:
    exec bun run dev

# Start WXT dev server for Firefox
[no-exit-message]
dev-ff:
    exec bun run dev:firefox

# ── Build ────────────────────────────────────────────────────────────────────

# Build WASM only (compile Rust → wasm-bindgen → inline base64)
wasm:
    bun run wasm

# Full extension package build (clean old zips + Chrome/Firefox/source zips)
build:
    mkdir -p target
    rustc --edition=2021 scripts/package-extensions.rs -o target/package-extensions
    target/package-extensions

# Full extension build for Firefox
build-ff:
    bun run build:firefox

# ── Lint / typecheck ─────────────────────────────────────────────────────────

# TypeScript typecheck
ts:
    bun run compile

# Rust fmt + clippy
lint:
    bun run lint:rust

# Rust cargo check (fast, no codegen)
check:
    bun run check:rust

# Run all checks (Rust lint + TS typecheck)
verify: lint ts

# ── Test ─────────────────────────────────────────────────────────────────────

# Rust unit tests (native, no WASM runtime needed)
test:
    cargo test -p wasm-matcher

# Playwright e2e (WASM bench always runs; highlight test needs a display)
e2e:
    bun run test:e2e

# Playwright e2e with a virtual display (for headless/CI hosts)
e2e-xvfb:
    xvfb-run -a bun run test:e2e

# ── Misc ─────────────────────────────────────────────────────────────────────

# Package extension for Chrome Web Store
zip:
    bun run zip

# Package extension for Firefox Add-ons
zip-ff:
    bun run zip:firefox
