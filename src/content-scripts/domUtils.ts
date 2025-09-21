import { createRoot } from 'react-dom/client';
import TransLine from '@/src/components/transline/TransLine.tsx';

// 用于存储原始文本节点的WeakMap
const originalTextMap = new WeakMap<Text, string>();

/**
 * 获取页面所有文本节点，排除翻译面板中的文本节点
 */
export function getAllTextNodes(): Text[] {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 检查父元素是否属于翻译面板
        let parent = node.parentElement;
        while (parent) {
          // 检查是否是翻译面板相关的元素
          if (
            parent.hasAttribute('data-word') ||
            (parent instanceof HTMLElement &&
              // 检查是否有面板相关的样式特征
              parent.style.position === 'absolute' &&
              parent.style.zIndex &&
              parseInt(parent.style.zIndex, 10) > 1000) ||
            // 检查是否是React组件根节点
            parent.hasAttribute('data-reactroot')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }

        // 检查文本节点本身是否有效
        if (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent &&
          node.textContent.trim().length > 0
        ) {
          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_REJECT;
      },
    },
  );

  const textNodes: Text[] = [];
  let node: Node | null;

  // 收集所有文本节点
  node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  return textNodes;
}

/**
 * 处理单个文本节点，将匹配的单词用React组件包装
 */
export async function processTextNode(
  textNode: Text,
  wordsList: Record<string, any>,
  findMatchingWords: (
    text: string,
    wordsList: Record<string, any>,
  ) => { index: number; word: string; end: number }[],
): Promise<void> {
  const text = textNode.textContent || '';
  if (!text.trim()) return;

  // 保存原始文本内容
  if (!originalTextMap.has(textNode)) {
    originalTextMap.set(textNode, text);
  }

  // 检查父元素是否已经处理过
  const parent = textNode.parentNode;
  if (!parent) return;

  // 检查是否已经有处理过的标记
  if (
    parent instanceof Element &&
    parent.querySelector('p[data-word]')
  ) {
    return; // 已经处理过，跳过
  }

  const matches = findMatchingWords(text, wordsList);

  // 如果没有匹配的单词，直接返回
  if (matches.length === 0) return;

  // 创建文档片段来保持原有结构
  const fragment = document.createDocumentFragment();
  let lastProcessedIndex = 0;

  // 处理匹配的单词
  for (const match of matches) {
    // 添加匹配单词之前的文本
    if (match.index > lastProcessedIndex) {
      const textBefore = text.substring(
        lastProcessedIndex,
        match.index,
      );
      fragment.appendChild(
        document.createTextNode(textBefore),
      );
    }

    // 直接使用 p 标签包裹单词，避免嵌套
    const wordElement = document.createElement('p');
    wordElement.setAttribute(
      'data-word',
      match.word.toLowerCase(),
    );
    wordElement.textContent = match.word; // 保持原始格式
    wordElement.style.display = 'inline';
    wordElement.style.verticalAlign = 'baseline';
    wordElement.style.margin = '0';
    wordElement.style.padding = '0';
    wordElement.style.border = 'none';
    wordElement.style.background = 'none';
    wordElement.style.color = 'inherit';
    wordElement.style.font = 'inherit';
    wordElement.style.position = 'relative';

    fragment.appendChild(wordElement);

    // 为单词创建React组件，传递原始格式的单词用于显示，小写版本用于查询
    const root = createRoot(wordElement);
    root.render(
      TransLine({
        originalWord: match.word,
        lowerCaseWord: match.word.toLowerCase(),
      }),
    );

    lastProcessedIndex = match.end;
  }

  // 添加最后剩余的文本
  if (lastProcessedIndex < text.length) {
    const textAfter = text.substring(lastProcessedIndex);
    fragment.appendChild(
      document.createTextNode(textAfter),
    );
  }

  // 替换原文本节点
  parent.replaceChild(fragment, textNode);
}

/**
 * 恢复文本节点到原始状态（用于删除单词时）
 */
export function restoreOriginalTextNode(
  container: Element,
  word: string,
): void {
  // 查找包含特定单词的元素
  const wordElements = container.querySelectorAll(
    `p[data-word="${word.toLowerCase()}"]`,
  );

  // 从后往前遍历，避免在修改DOM时影响NodeList
  for (let i = wordElements.length - 1; i >= 0; i--) {
    const wordElement = wordElements[i];
    const parent = wordElement.parentNode;
    if (!parent) continue;

    // 获取原始文本
    const originalText = wordElement.textContent || '';

    // 创建文本节点替换React组件
    const textNode = document.createTextNode(originalText);

    // 卸载React组件
    const root = createRoot(wordElement);
    root.unmount();

    // 替换节点
    parent.replaceChild(textNode, wordElement);
  }
}
