// Selection translation card. A thin wrapper over the shared tooltip manager
// so the selection card and the hover card are mutually exclusive (one global
// tooltip). Selection has no persistent element anchor, so it pins to the rect
// of the selection captured at show time and dismisses on scroll / outside
// click / Escape.
import { dismissTooltip, showTooltip } from './tooltipManager';

let selectionToken: number | null = null;

export function hideSelectionTooltip(): void {
  if (selectionToken !== null) {
    dismissTooltip(selectionToken);
    selectionToken = null;
  }
}

export function showSelectionTooltip({
  word,
  x,
  y,
}: {
  word: string;
  x: number;
  y: number;
}): void {
  // x is the horizontal centre of the selection, y its bottom edge.
  const rect = new DOMRect(x, y, 0, 0);
  selectionToken = showTooltip({
    word,
    mode: 'selection',
    anchorRect: () => rect,
    follow: false,
    dismissOnOutside: true,
    onDismiss: () => {
      selectionToken = null;
    },
  });
}
