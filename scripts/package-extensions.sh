#!/usr/bin/env bash
set -euo pipefail

bun run wasm
wxt zip -b chrome
bun run src/copy.ts
wxt zip -b firefox --sources
