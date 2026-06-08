import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  IMatcherWords,
  IWordMatch,
  IWordQuery,
} from './types';

// The WASM matcher lives in the background service worker: content scripts run
// in the host page's isolated world, which inherits the page CSP. On strict
// sites (e.g. GitHub) that omit `wasm-unsafe-eval`, `new WebAssembly.Module`
// throws `CompileError`, so the matcher must be driven over messaging from the
// worker. The worker itself also needs MV3 extension CSP to opt into
// `wasm-unsafe-eval`.
interface ProtocolMap {
  trans(data: IWordQuery): string;
  // Sync the active/deleted word sets into the background matcher automata.
  matcherSetWords(data: IMatcherWords): void;
  // Active-word matches for a text chunk.
  matcherFindMatches(data: { text: string }): IWordMatch[];
  // Deleted-word matches for a text chunk.
  matcherFindDeleted(data: { text: string }): IWordMatch[];
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
