# transline

Translation-card and inline-highlight React components. This directory owns the
UI state for saved-word hover cards, selection lookup cards, and the parsed Bing
dictionary payload shown inside those cards.

Storage and page scanning stay outside this boundary: storage mutations go
through `src/core`, and page-wide highlight rescans stay in
`src/content-scripts`.

- `HighlightedText.tsx` — renders one scanned text node as a single React tree:
  plain-text segments interleaved with a `TransLine` per matched word. One root
  per text node (not per word) keeps React mount cost proportional to DOM
  nodes rather than match count, which is the dominant JS-side cost of a page
  scan (see `src/content-scripts/domUtils.ts`, its only caller).
- `TransLine.tsx` — thin per-word wrapper that renders `T2` inside a
  zero-styling `<span>`; exists so `HighlightedText` has one React element per
  match without leaking `T2`'s internal layout assumptions into the text-node
  splitting logic.
- `T2.tsx` — the interactive highlighted-word span actually mounted on the
  page: tracks a word's `isDeleted` status (initial fetch + reactive
  `deleteWord` window-event listener), shows/hides the shared tooltip on
  hover via `tooltipManager`, and falls back to plain unstyled text once a
  word is excluded so it stops being interactive. The `deleteWord` event is
  reused (not renamed) as a generic "hide this word's highlight now" signal —
  `transUtils.ts`'s untranslatable path and `HoverTooltip.tsx`'s ignore path
  both dispatch it too, so already-mounted spans update without a full page
  rescan.
- `HoverTooltip.tsx` — the translation card body: fetches/refetches a word's
  definition through `transUtils.fetchData`, and owns the two card-level
  actions — `useWordDelete` (existing "移除单词"/memorized) and
  `useWordIgnore` (stopword, confirms via `window.confirm` before calling
  `wordProcessor.ignoreWord`, since that state is meant to be deliberate)
  — plus the light/dark theme toggle and the close button.
- `PanelComponents.tsx` — the two presentational panel bodies `HoverTooltip`
  renders: `LoadingPanel` (spinner state) and `LoadedPanel` (definition text
  plus the action row — "移除单词" for stored words, "停用词" whenever a
  tracked word is present, and the selection-mode saved/unsaved badge).
- `transUtils.ts` — the actual translation fetch pipeline: cache lookup
  (`translationCache` + `CACHE_EXPIRY`), the Bing HTML parser
  (`parseBingDict`), and `fetchData`/`fetchAndProcessNetworkData`, which
  decide what a lookup outcome means for the word's lifecycle state — a
  found definition just renders; a missing definition or a request failure
  both call `markUntranslatable` and `onUntranslatable` (silent, no error
  text — see `docs/adr/0001-split-word-lifecycle-states.md`) instead of
  showing an error message.
- `tooltipTheme.ts` — the hand-drawn dark/light palettes (`THEMES`) and shared
  sketch primitives (`SKETCH_RADIUS`, `HAND_FONT`) consumed by both
  `HoverTooltip` and `PanelComponents` so the two stay visually consistent.
- `TimerManager.ts` — a tiny named-timer helper (set/clear/clear-all) used to
  debounce hover show/hide without scattering raw `setTimeout`/`clearTimeout`
  calls through a component.
- `WordHighlighter.tsx` / `WordHighlighter.types.ts` — a class-component
  highlighted-word implementation, re-exported from `index.ts` but not
  imported by anything on the actual render path (that path is
  `HighlightedText` → `TransLine` → `T2`, whose own internal function is also
  named `WordHighlighter`). Looks like a leftover from an earlier
  class-to-hooks migration; worth deleting rather than extending.
- `index.ts` — the directory's public barrel (`T2`, `TimerManager`,
  `WordHighlighter`, and the `WordHighlighter.types` types); currently the
  only consumer of the dead `WordHighlighter.tsx` export above.
