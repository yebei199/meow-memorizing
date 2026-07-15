import { queryWord } from '@/src/core/storageManager';
import {
  addQueriedWord,
  decideSelectionAction,
} from '@/src/core/wordProcessor';
import { processPageWords } from './ergodicWords';
import {
  showRetranslateDot,
  showSelectionTooltip,
} from './selectionTooltip';

const VALID_SELECTION_PATTERN = /^[a-zA-Z-]+$/;

function normalizeSelectedWord(
  text: string,
): string | null {
  const trimmed = text.trim();
  if (trimmed.length <= 2) {
    return null;
  }

  if (!VALID_SELECTION_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

/**
 * Listen for completed text selections and show a transient translation card.
 */
export async function setupSelectionListener(): Promise<void> {
  document.addEventListener('mouseup', async (event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[data-meow-ignore="true"]')
    ) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1) return;

    const range = selection.getRangeAt(0);
    const word = normalizeSelectedWord(range.toString());
    if (!word) return;

    const rect = range.getBoundingClientRect();
    selection.removeAllRanges();

    await addQueriedWord(word);
    await processPageWords();

    const position = {
      word,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    };

    // 停用词出重译提示点而不是面板；冷却期内的查无翻译词完全静默；
    // 其余情况（含已记住、普通词）照常弹出翻译面板。
    switch (decideSelectionAction(await queryWord(word))) {
      case 'showDot':
        showRetranslateDot(position);
        break;
      case 'silent':
        break;
      case 'showTooltip':
        showSelectionTooltip(position);
        break;
    }
  });
}
