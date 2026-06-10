# transline

Translation-card and inline-highlight React components. This directory owns the
UI state for saved-word hover cards, selection lookup cards, and the parsed Bing
dictionary payload shown inside those cards.

Storage and page scanning stay outside this boundary: storage mutations go
through `src/core`, and page-wide highlight rescans stay in
`src/content-scripts`.
