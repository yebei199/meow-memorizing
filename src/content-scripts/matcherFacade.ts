// Unified word-matching entry point. The WASM automata live in the background
// service worker (see entrypoints/background.ts); this facade forwards text to
// it over messaging and keeps the worker's word sets in sync.
//
// Why not run WASM here: content scripts execute in the host page's isolated
// world, which inherits the page CSP. Strict sites (GitHub, X, …) omit
// `wasm-unsafe-eval`, so `new WebAssembly.Module` throws `CompileError` in the
// content script and highlighting silently dies. The worker's extension CSP
// permits WASM, so the matcher is driven from there.
import { sendMessage } from '@/src/core/messaging';
import type { IWordMatch } from '@/src/core/types';

type WordsList = Record<string, any>;

// Signature of the word sets last pushed to the worker; avoids re-sending the
// full lists on every text node when nothing changed.
let lastSig: string | null = null;
// Serialises concurrent ensureWords callers (a chunk fires many in parallel).
let syncInFlight: Promise<void> | null = null;

/** Order-independent signature of the active/deleted word sets. */
function computeSig(wordsList: WordsList): string {
  const parts: string[] = [];
  for (const key of Object.keys(wordsList)) {
    const entry = wordsList[key];
    if (!entry || typeof entry.word !== 'string') continue;
    parts.push(
      `${entry.isDeleted ? '-' : '+'}${entry.word}`,
    );
  }
  parts.sort();
  return parts.join(' ');
}

/** Push the current word sets to the worker matcher when they have changed. */
async function ensureWords(
  wordsList: WordsList,
): Promise<void> {
  const sig = computeSig(wordsList);
  if (sig === lastSig) return;
  if (!syncInFlight) {
    const active: string[] = [];
    const deleted: string[] = [];
    for (const key of Object.keys(wordsList)) {
      const entry = wordsList[key];
      if (!entry || typeof entry.word !== 'string')
        continue;
      if (entry.isDeleted) deleted.push(entry.word);
      else active.push(entry.word);
    }
    syncInFlight = sendMessage('matcherSetWords', {
      active,
      deleted,
    })
      .then(() => {
        lastSig = sig;
      })
      .finally(() => {
        syncInFlight = null;
      });
  }
  await syncInFlight;
}

/** Active-word matches. */
export async function findMatchingWords(
  text: string,
  wordsList: WordsList,
): Promise<IWordMatch[]> {
  await ensureWords(wordsList);
  return sendMessage('matcherFindMatches', { text });
}

/** Deleted-word matches. */
export async function findDeletedWords(
  text: string,
  wordsList: WordsList,
): Promise<IWordMatch[]> {
  await ensureWords(wordsList);
  return sendMessage('matcherFindDeleted', { text });
}
