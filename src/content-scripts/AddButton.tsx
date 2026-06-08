import { showSelectionTooltip } from './selectionTooltip'

const VALID_SELECTION_PATTERN = /^[a-zA-Z-]+$/

function normalizeSelectedWord(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.length <= 2) {
    return null
  }

  if (!VALID_SELECTION_PATTERN.test(trimmed)) {
    return null
  }

  return trimmed.toLowerCase()
}

/**
 * Listen for completed text selections and show a transient translation card.
 */
export async function setupSelectionListener(): Promise<void> {
  document.addEventListener('mouseup', (event) => {
    const target = event.target
    if (
      target instanceof Element &&
      target.closest('[data-meow-ignore="true"]')
    ) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount < 1) return

    const range = selection.getRangeAt(0)
    const word = normalizeSelectedWord(range.toString())
    if (!word) return

    const rect = range.getBoundingClientRect()
    showSelectionTooltip({
      word,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    })
  })
}
