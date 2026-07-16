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
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
