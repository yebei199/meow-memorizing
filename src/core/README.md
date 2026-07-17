# src/core

Storage schema, persistence, and pure word-lifecycle logic shared by the
content scripts, popup, and background worker. UI state and DOM concerns stay
out of this boundary: React components live in `src/components`, page scanning
and selection handling live in `src/content-scripts`.

- `types.ts` — the shared `IWordStorage`/`IAllWordsStorage` schema and the
  WASM-matcher wire type (`IWordMatch`). `IWordStorage`
  carries three independent lifecycle flags — `isDeleted` (memorized, user
  removes from the vocabulary book), `isIgnored` (stopword, user marks as
  never-translate), `isUntranslatable` (system-detected, no dictionary entry,
  paired with `lastAttemptAt` for cooldown retry) — documented in `CONTEXT.md`
  at the repo root and `docs/adr/0001-split-word-lifecycle-states.md`.
- `storageManager.ts` — the vocabulary's only read/write path
  (`queryWord`/`addWordLocal`/`getWordsList`); every other module reaches
  storage through these rather than touching `storage`/`browser.storage`
  directly. Words live in the **local** area, **one key per word**
  (`local:word:<word>`): the whole book used to sit in a single `sync:myWords`
  item, but `chrome.storage.sync` caps one item at 8192 bytes, so ~54 words in
  every write started throwing `kQuotaBytesPerItem` and the selection flow died
  silently — see `docs/adr/0004-per-word-local-storage.md`, which also carries
  the measured numbers behind the per-key shape. `migrateLegacySyncWords()`
  moves an old sync blob over, once, on worker cold start. The background worker
  reads the assembled list here (and `watchWords` for live changes) to rehydrate
  its matcher automata, see `docs/adr/0002-worker-owns-word-set.md`.
- `wordSets.ts` — pure `activeWords`/`isExcluded`: the three-flag exclusion
  union (`isDeleted`/`isIgnored`/`isUntranslatable`) that decides which words
  the worker feeds to the highlight automaton. The single home for that logic,
  imported by the background worker.
- `wordProcessor.ts` — pure business logic for the three lifecycle states:
  `addQueriedWord` (record a selection, resets `isDeleted` on reselect by
  design but never touches `isIgnored`/`isUntranslatable`), `deleteWord`/
  `restoreWord` (memorize/remove and its undo, used by the popup's 已记住 tab),
  `ignoreWord`/`unignoreWord` (stopword toggle, also used by the popup's 停用词
  tab), `markUntranslatable`/`clearUntranslatable`/`shouldRetryTranslation`
  (auto-detected no-translation state with a 3-day retry cooldown), and
  `decideSelectionAction` (what a mouse selection should do — show the
  translation card, show the stopword retranslate dot, or stay silent for a
  cooling-down untranslatable word). Also holds `filterWord` (selection
  validity check) and `delay`.
- `messaging.ts` — the typed `@webext-core/messaging` protocol
  (`trans`/`matcherFindMatches`/`matcherReloadWords`) between content scripts
  and the background worker, needed because the WASM matcher can only run in the
  worker's extension-page CSP context, not a content script's page-inherited
  CSP. The worker owns its word set, so there is no word-set push message — the
  content script sends text and gets matches. `matcherReloadWords` is the
  ordered barrier a content script awaits after changing the vocabulary: the
  storage change event reaches the worker on a different IPC path than the
  write's ack reaches the page, so a rescan can otherwise beat the rebuild and
  miss the just-added word for good (`docs/adr/0004-per-word-local-storage.md`).
- `themeDetector.ts` — best-effort light/dark detection for the host page
  (media query, CSS class heuristics, background-color luminance) plus a
  `MutationObserver`-driven sync of the result into `isWebsiteDarkMode`
  storage, so translation cards can match the surrounding page theme.
