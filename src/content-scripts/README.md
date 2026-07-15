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
- `matcherFacade.ts` — the only place that computes the active/deleted word
  sets sent to the background WASM matcher. `isExcluded()` unions the three
  independent lifecycle flags (`isDeleted`, `isIgnored`, `isUntranslatable` —
  see `CONTEXT.md` and `docs/adr/0001-split-word-lifecycle-states.md`) so all
  three stay unhighlighted; a signature cache avoids re-syncing the worker
  when the sets haven't changed.
- `AddButton.tsx` — the `mouseup` selection listener: normalizes and validates
  the selected text, records it via `wordProcessor.addQueriedWord`, then shows
  the selection translation card through `selectionTooltip.ts`.
- `tooltipManager.tsx` — the single shared tooltip host for the whole page.
  Hover cards and the selection card both render through `showTooltip`, so
  showing one always displaces the other; handles anchor-following
  positioning, outside-click/Escape/scroll dismissal.
- `selectionTooltip.ts` — thin selection-specific wrapper over
  `tooltipManager`, pinning the card to the selection's captured rect (no live
  DOM anchor to follow) and marking it dismiss-on-outside-click.
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
