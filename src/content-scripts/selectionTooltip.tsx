import { createRoot, type Root } from 'react-dom/client'
import HoverTooltip from '@/src/components/transline/HoverTooltip'

const TOOLTIP_ID = 'meow-selection-tooltip-root'
const TOOLTIP_WIDTH = 340
const VIEWPORT_MARGIN = 16

let tooltipHost: HTMLDivElement | null = null
let tooltipRoot: Root | null = null
let handlersBound = false

function clampLeft(x: number): number {
  const minLeft = VIEWPORT_MARGIN
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
  )

  return Math.min(Math.max(x - TOOLTIP_WIDTH / 2, minLeft), maxLeft)
}

function handlePointerDown(event: MouseEvent): void {
  const target = event.target
  if (
    tooltipHost &&
    target instanceof Node &&
    tooltipHost.contains(target)
  ) {
    return
  }

  hideSelectionTooltip()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    hideSelectionTooltip()
  }
}

function bindHandlers(): void {
  if (handlersBound) {
    return
  }

  handlersBound = true
  document.addEventListener('mousedown', handlePointerDown, true)
  window.addEventListener('scroll', hideSelectionTooltip, true)
  window.addEventListener('keydown', handleKeyDown, true)
}

function unbindHandlers(): void {
  if (!handlersBound) {
    return
  }

  handlersBound = false
  document.removeEventListener(
    'mousedown',
    handlePointerDown,
    true,
  )
  window.removeEventListener('scroll', hideSelectionTooltip, true)
  window.removeEventListener('keydown', handleKeyDown, true)
}

function ensureTooltipHost(): HTMLDivElement {
  if (tooltipHost) {
    return tooltipHost
  }

  tooltipHost = document.createElement('div')
  tooltipHost.id = TOOLTIP_ID
  tooltipHost.dataset.meowIgnore = 'true'
  tooltipHost.dataset.meowTooltipRoot = 'selection'
  tooltipHost.style.position = 'fixed'
  tooltipHost.style.width = `${TOOLTIP_WIDTH}px`
  tooltipHost.style.zIndex = '2147483647'
  document.body.appendChild(tooltipHost)
  tooltipRoot = createRoot(tooltipHost)

  return tooltipHost
}

export function hideSelectionTooltip(): void {
  tooltipRoot?.unmount()
  tooltipRoot = null
  tooltipHost?.remove()
  tooltipHost = null
  unbindHandlers()
}

export function showSelectionTooltip({
  word,
  x,
  y,
}: {
  word: string
  x: number
  y: number
}): void {
  const host = ensureTooltipHost()
  host.style.left = `${clampLeft(x)}px`
  host.style.top = `${Math.min(
    y + 14,
    window.innerHeight - VIEWPORT_MARGIN,
  )}px`

  bindHandlers()
  tooltipRoot?.render(
    <HoverTooltip
      word={word}
      mode='selection'
      onClose={hideSelectionTooltip}
    />,
  )
}
