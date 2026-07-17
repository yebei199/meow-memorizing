# src/content-scripts

Page-facing DOM logic for the `trans.content` entrypoint: scanning the host
page for known words, wrapping matches with the React highlight tree, driving
the selection-triggered translation flow, and hosting the shared tooltip.
Storage schema and word-lifecycle rules stay out of this boundary (`src/core`);
translation-card rendering stays in `src/components/transline`.

- `startTrans.ts` — entrypoint orchestration: `startTranslation()` runs the
  initial full-page scan (after a startup delay), wires up the selection
  listener, and starts a `MutationObserver` that incrementally reprocesses only
  newly-added text nodes (debounced), filtering out mutations that originate
  from the extension's own tooltip/highlight DOM.
- `ergodicWords.tsx` / `domUtils.ts` — the page-scan pipeline: `ergodicWords.tsx`
  walks all eligible text nodes and chunks them through
  `domUtils.processTextNode`, which matches words via `matcherFacade` and
  replaces each matched text node with a React-rendered `HighlightedText` tree,
  marking the wrapper so rescans skip it.
- `matcherFacade.ts` — a thin forwarder that sends a text chunk to the
  background WASM matcher and returns the active-word matches. The worker owns
  the word set itself (rehydrated from storage, see
  `docs/adr/0002-worker-owns-word-set.md`), so the content script no longer
  computes/pushes word sets or caches a sync signature. The active/deleted
  split now lives in `src/core/wordSets.ts` (`activeWords`/`isExcluded`, the
  three-flag union of `isDeleted`/`isIgnored`/`isUntranslatable` — see
  `CONTEXT.md` and `docs/adr/0001-split-word-lifecycle-states.md`), read by the
  worker. It also exposes `reloadMatcherWords`, which `processPageWords` awaits
  before a full rescan so the worker's word set is current — the storage change
  event alone is not ordered against the page's own write
  (`docs/adr/0004-per-word-local-storage.md`).
- `AddButton.tsx` — the `mouseup` selection listener: normalizes and validates
  the selected text, records it via `wordProcessor.addQueriedWord`, then
  consults `wordProcessor.decideSelectionAction` on the word's lifecycle
  state to pick one of three outcomes — the stopword retranslate dot, total
  silence for an untranslatable word still in its retry cooldown, or the
  normal selection translation card (`selectionTooltip.ts`).
- `tooltipManager.tsx` — the single shared tooltip host for the whole page.
  Hover cards, the selection card, and the stopword retranslate dot all
  render through `showTooltip` (the latter via its `render` override instead
  of the default `HoverTooltip`), so showing one always displaces the
  other; handles anchor-following positioning, outside-click/Escape/scroll
  dismissal.
- `selectionTooltip.ts` — thin selection-specific wrapper over
  `tooltipManager`: `showSelectionTooltip` pins the translation card to the
  selection's captured rect (no live DOM anchor to follow), and
  `showRetranslateDot` shows the small stopword indicator instead — sharing
  the same dismiss lifecycle — whose click un-ignores the word
  (`wordProcessor.unignoreWord`) and reopens the normal card.
- `storageAction.ts` / `core.ts` — re-export shims: `storageAction.ts`
  re-exposes `src/core/storageManager`'s functions under the content-scripts
  namespace, and `core.ts` re-exports `domUtils`/`matcherFacade`/
  `textProcessor` as this directory's public surface for other entrypoints.
- `textProcessor.ts` — legacy/parallel page-scan implementation
  (`processPageWords` + chunked processing) duplicating most of
  `ergodicWords.tsx`'s responsibility; worth reconciling into one path (see
  architecture note below) rather than extending either copy further.
- `themeDetector.ts` — near-duplicate of `src/core/themeDetector.ts` (same
  light/dark heuristics), differing only in which storage item it writes to.
  Same reconciliation note applies.
