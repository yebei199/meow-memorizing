# src/core

Storage schema, persistence, and pure word-lifecycle logic shared by the
content scripts, popup, and background worker. UI state and DOM concerns stay
out of this boundary: React components live in `src/components`, page scanning
and selection handling live in `src/content-scripts`.

- `types.ts` — the shared `IWordStorage`/`IAllWordsStorage` schema and the
  WASM-matcher wire types (`IWordMatch`, `IMatcherWords`). `IWordStorage`
  carries three independent lifecycle flags — `isDeleted` (memorized, user
  removes from the vocabulary book), `isIgnored` (stopword, user marks as
  never-translate), `isUntranslatable` (system-detected, no dictionary entry,
  paired with `lastAttemptAt` for cooldown retry) — documented in `CONTEXT.md`
  at the repo root and `docs/adr/0001-split-word-lifecycle-states.md`.
- `storageManager.ts` — thin wrapper over WXT's `storage.defineItem` /
  `@webext-core/storage` for the `myWords` and `isWebsiteDarkMode` extension
  storage items. Owns the only read/write path (`queryWord`/`addWordLocal`) to
  the word list; every other module reaches storage through these two
  functions rather than touching `storage`/`browser.storage` directly.
- `wordProcessor.ts` — pure business logic for the three lifecycle states:
  `addQueriedWord` (record a selection, resets `isDeleted` on reselect by
  design but never touches `isIgnored`/`isUntranslatable`), `deleteWord`
  (memorize/remove), `ignoreWord`/`unignoreWord` (stopword toggle),
  `markUntranslatable`/`clearUntranslatable`/`shouldRetryTranslation`
  (auto-detected no-translation state with a 3-day retry cooldown). Also holds
  `filterWord` (selection validity check) and `delay`.
- `messaging.ts` — the typed `@webext-core/messaging` protocol
  (`trans`/`matcherSetWords`/`matcherFindMatches`/`matcherFindDeleted`) between
  content scripts and the background worker, needed because the WASM matcher
  can only run in the worker's extension-page CSP context, not a content
  script's page-inherited CSP.
- `themeDetector.ts` — best-effort light/dark detection for the host page
  (media query, CSS class heuristics, background-color luminance) plus a
  `MutationObserver`-driven sync of the result into `isWebsiteDarkMode`
  storage, so translation cards can match the surrounding page theme.
