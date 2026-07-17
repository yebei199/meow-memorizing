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

    // 不清空原生选区：用户经常就是想选中之后复制文本，见 #140 讨论。
    const rect = range.getBoundingClientRect();

    // 记录单词是尽力而为:翻译不依赖写入,所以词库写满(local 区 10MB 上限,
    // 见 docs/adr/0005)或任何存储故障都只能让「保存」失败,不能连累「翻译」。
    // 早先这里没有兜底,写入抛错会让整个 mouseup 监听器静默中断——选中任何词
    // 都不翻译也不高亮,而已有下划线因为只依赖读取照常显示,这个半死不活的
    // 表象极难诊断(见 docs/adr/0004)。卡片会照实显示「未收录」,不必特殊处理。
    await addQueriedWord(word).catch((error) => {
      console.error(
        '记录单词失败,仅显示翻译(词库可能已满):',
        error,
      );
    });
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
