import { createRoot, type Root } from 'react-dom/client';
import HighlightedText from '@/src/components/transline/HighlightedText.tsx';

// 用于标记已处理的文本节点
let processedTextNodes = new WeakSet<Text>();
const wrappedTextNodes = new Set<{
  wrapper: HTMLSpanElement;
  root: Root;
  text: string;
}>();
// Marks a span that wraps one text node's React-managed highlight tree. Its
// subtree must be skipped on rescans (it is owned by React), but unlike
// data-meow-ignore it stays selectable so users can still query words inside it.
const WRAPPED_ATTR = 'data-meow-wrapped';
const IGNORE_SELECTOR =
  '[data-meow-ignore="true"], [data-meow-tooltip-root], [data-meow-wrapped]';

/**
 * 获取页面所有文本节点，排除翻译面板中的文本节点
 */
export function getAllTextNodes(): Text[] {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 跳过已处理的文本节点
        if (processedTextNodes.has(node as Text)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 检查父元素是否属于翻译面板
        let parent = node.parentElement;
        while (parent) {
          // 检查是否是翻译面板相关的元素
          if (
            parent.matches(IGNORE_SELECTOR) ||
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
  ) =>
    | { index: number; word: string; end: number }[]
    | Promise<
        { index: number; word: string; end: number }[]
      >,
): Promise<void> {
  // 标记为已处理
  processedTextNodes.add(textNode);

  const text = textNode.textContent || '';
  if (!text.trim()) return;

  // 检查父元素是否已经处理过
  const parent = textNode.parentNode;
  if (!parent) return;

  // 检查是否已经有处理过的标记
  if (
    parent instanceof Element &&
    (parent.matches(IGNORE_SELECTOR) ||
      parent.closest(IGNORE_SELECTOR))
  ) {
    return; // 已经处理过，跳过
  }

  const matches = await findMatchingWords(text, wordsList);

  // 如果没有匹配的单词，直接返回
  if (matches.length === 0) return;

  // One inline wrapper + one React root per text node. The wrapper keeps valid
  // phrasing content inside links/headings; its subtree is React-managed, so it
  // is marked WRAPPED_ATTR to be skipped on rescans. Word deletion is handled
  // reactively inside the tree (T2 listens for the deleteWord event), so no
  // manual DOM surgery is needed afterwards.
  const wrapper = document.createElement('span');
  wrapper.setAttribute(WRAPPED_ATTR, 'true');
  wrapper.style.display = 'inline';
  wrapper.style.verticalAlign = 'baseline';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';
  wrapper.style.border = 'none';
  wrapper.style.background = 'none';
  wrapper.style.color = 'inherit';
  wrapper.style.font = 'inherit';

  parent.replaceChild(wrapper, textNode);

  const root = createRoot(wrapper);
  wrappedTextNodes.add({ wrapper, root, text });
  root.render(HighlightedText({ text, matches }));
}

/**
 * 重置已处理的文本节点标记（用于强制重新处理）
 */
export function resetProcessedTextNodes(): void {
  for (const wrapped of wrappedTextNodes) {
    const parent = wrapped.wrapper.parentNode;
    if (!parent) continue;

    wrapped.root.unmount();
    parent.replaceChild(
      document.createTextNode(wrapped.text),
      wrapped.wrapper,
    );
  }

  wrappedTextNodes.clear();
  processedTextNodes = new WeakSet<Text>();
}
