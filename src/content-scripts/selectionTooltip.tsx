// Selection translation card. A thin wrapper over the shared tooltip manager
// so the selection card and the hover card are mutually exclusive (one global
// tooltip). Selection has no persistent element anchor, so it pins to the rect
// of the selection captured at show time and dismisses on scroll / outside
// click / Escape.
import { unignoreWord } from '@/src/core/wordProcessor';
import { processPageWords } from './ergodicWords';
import {
  dismissTooltip,
  showTooltip,
} from './tooltipManager';

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

/** A stopword's small clickable indicator, shown instead of the translation card. */
function RetranslateDot({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      <button
        type='button'
        onClick={onClick}
        title='停用词，点击重新翻译'
        aria-label='停用词，点击重新翻译'
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: '2px solid #999',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          padding: 0,
        }}
      />
    </div>
  );
}

/**
 * Show the retranslate dot for a stopword instead of the translation card
 * (see CONTEXT.md / docs/adr/0001-split-word-lifecycle-states.md). Shares the
 * selection card's dismiss lifecycle; clicking it un-ignores the word and
 * opens the normal translation card.
 */
export function showRetranslateDot({
  word,
  x,
  y,
}: {
  word: string;
  x: number;
  y: number;
}): void {
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
    render: (dismiss) => (
      <RetranslateDot
        onClick={() => {
          dismiss();
          setTimeout(async () => {
            await unignoreWord(word);
            await processPageWords();
            showSelectionTooltip({ word, x, y });
          }, 10);
        }}
      />
    ),
  });
}
