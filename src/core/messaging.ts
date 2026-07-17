import { defineExtensionMessaging } from '@webext-core/messaging';
import type { IWordMatch, IWordQuery } from './types';

// The WASM matcher lives in the background service worker: content scripts run
// in the host page's isolated world, which inherits the page CSP. On strict
// sites (e.g. GitHub) that omit `wasm-unsafe-eval`, `new WebAssembly.Module`
// throws `CompileError`, so the matcher must be driven over messaging from the
// worker. The worker itself also needs MV3 extension CSP to opt into
// `wasm-unsafe-eval`. The worker owns its word set (rehydrated from storage,
// see docs/adr/0002-worker-owns-word-set.md), so the only matcher message the
// content script sends is a find — there is no word-set push.
interface ProtocolMap {
  trans(data: IWordQuery): string;
  // Active-word matches for a text chunk.
  matcherFindMatches(data: { text: string }): IWordMatch[];
  // The vocabulary just changed: reload the worker's word set before answering
  // any further find. Storage's `onChanged` reaches the worker on a different
  // IPC path than the write's ack reaches the content script, so a rescan that
  // fires right after a write can beat the rebuild and miss the new word —
  // permanently, since a full-page scan only runs once. Messages from one
  // content script are ordered, so awaiting this is the barrier that guarantees
  // the following finds see the new word.
  matcherReloadWords(): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
