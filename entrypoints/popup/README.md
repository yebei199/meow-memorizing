# entrypoints/popup

The extension's toolbar popup (WXT `popup` entrypoint): a small React app that
lists tracked words and lets the user manage their lifecycle state. Storage
reads/writes go through `src/core`; this directory only owns popup UI and has
no access to the host page's DOM (unlike `src/content-scripts`).

- `index.html` — the popup's HTML shell WXT loads into the toolbar popup
  window; mounts `main.tsx` at `#root`.
- `main.tsx` — React root bootstrap: sizes `#root` to fill the popup window
  and renders `App`.
- `App.tsx` / `App.css` — the popup's top-level wrapper, currently just a
  container around `VocabularyBook`.
- `style.css` — global popup styles (root sizing, scrollbars) shared across
  the whole popup, as opposed to `VocabularyBook`'s inline/theme-driven
  styles.
- `popup-main/VocabularyBook.tsx` — the popup's one real view: fetches the
  full word list (`getWordsList`), and renders it across three tabs backed
  by the shared `processWordsList` filter — 单词本 (`active`: plain tracked
  words, excludes memorized/stopwords), 已记住 (`memorized`: `isDeleted`
  words), and 停用词 (`ignored`: `isIgnored` words). The latter two tabs get
  an extra "恢复" action column (`restoreWord`/`unignoreWord`) so the user
  can undo either state without needing to reselect the word on a page.
  `isUntranslatable` is a system-only transient state and is never shown
  here (see `CONTEXT.md`).
