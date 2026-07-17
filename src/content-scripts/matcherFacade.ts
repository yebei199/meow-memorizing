// Unified word-matching entry point. The WASM automata live in the background
// service worker (see entrypoints/background.ts), which now owns the word set
// itself — it rehydrates from storage on cold start and watches for changes
// (see docs/adr/0002-worker-owns-word-set.md). The content script no longer
// pushes words or caches a sync signature; it just forwards text and gets back
// the active-word matches.
//
// Why the matcher runs in the worker at all: content scripts execute in the
// host page's isolated world, which inherits the page CSP. Strict sites
// (GitHub, X, …) omit `wasm-unsafe-eval`, so `new WebAssembly.Module` throws
// `CompileError` in the content script and highlighting silently dies. The
// worker's extension CSP permits WASM, so the matcher is driven from there.
import { sendMessage } from '@/src/core/messaging';
import type { IWordMatch } from '@/src/core/types';

/** Active-word matches for a text chunk. */
export async function findMatchingWords(
  text: string,
): Promise<IWordMatch[]> {
  return sendMessage('matcherFindMatches', { text });
}

/**
 * Make the worker reload its word set before the finds that follow.
 * Await this after changing the vocabulary and before rescanning — see the
 * `matcherReloadWords` note in core/messaging.ts for why the storage change
 * event alone is not enough.
 */
export async function reloadMatcherWords(): Promise<void> {
  await sendMessage('matcherReloadWords', undefined);
}
