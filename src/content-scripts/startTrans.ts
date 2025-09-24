import { delay } from '@/src/core/wordProcessor'
import { setupSelectionListener } from './AddButton'
import { processPageWords } from './ergodicWords'
import { getAllTextNodes, processTextNode } from './domUtils'
import { getWordsList } from './storageAction'
import { findMatchingWords } from './wordMatcher'

let domObserver: MutationObserver | null = null;
let debounceTimer: number | null = null;

/**
 * 检查变化是否与翻译面板相关
 */
function isMutationRelatedToTranslationPanel(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    // 检查添加的节点
    if (mutation.type === 'childList') {
      // 检查添加的节点
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) {
          // 检查节点是否有特定的属性或类名，表明它是翻译面板的一部分
          if (
            node.hasAttribute('data-word') ||    // 单词元素
            node.closest && node.closest('[data-word]') ||       // 单词元素的子元素
            // 检查是否有React组件的典型属性
            node.hasAttribute('data-reactroot') ||
            // 检查是否有面板相关的类名或属性
            (node instanceof HTMLElement && (
              (node.style.position === 'absolute' && 
              node.style.zIndex && 
              parseInt(node.style.zIndex) > 1000) ||
              // 面板组件通常有特定的样式
              node.classList.contains('trans-panel') ||
              node.classList.contains('hover-tooltip') ||
              // 检查是否是翻译面板容器
              (node.children.length > 0 && 
               Array.from(node.children).some(child => 
                 child instanceof HTMLElement && 
                 child.style.position === 'absolute'))
            ))
          ) {
            return true;
          }
        }
      }
      
      // 检查删除的节点
      for (const node of Array.from(mutation.removedNodes)) {
        if (node instanceof Element) {
          if (
            node.hasAttribute('data-word') ||   // 单词元素
            (node.closest && node.closest('[data-word]'))         // 单词元素的子元素
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * 处理新增的文本节点
 */
async function processAddedTextNodes(addedNodes: NodeList): Promise<void> {
  const wordsList = await getWordsList();
  if (!wordsList) return;

  const textNodes: Text[] = [];
  
  // 提取新增的文本节点
  for (const node of Array.from(addedNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
      textNodes.push(node as Text);
    } else if (node instanceof Element) {
      // 遍历元素的子节点查找文本节点
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (textNode) => {
            if (
              textNode.nodeType === Node.TEXT_NODE &&
              textNode.textContent &&
              textNode.textContent.trim().length > 0
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          },
        },
      );
      
      let textNode = walker.nextNode();
      while (textNode) {
        textNodes.push(textNode as Text);
        textNode = walker.nextNode();
      }
    }
  }

  // 处理新增的文本节点
  for (const textNode of textNodes) {
    await processTextNode(textNode, wordsList, findMatchingWords);
  }
}

/**
 * 初始化DOM变化监听器
 */
function initDOMObserver(): void {
  if (domObserver) {
    domObserver.disconnect();
  }

  domObserver = new MutationObserver(async (mutations) => {
    // 如果变化与翻译面板相关，则忽略
    if (isMutationRelatedToTranslationPanel(mutations)) {
      return;
    }

    // 检查是否有新增的文本节点需要处理
    let hasTextChanges = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && 
          (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
        // 检查是否添加了新的文本内容
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.TEXT_NODE || node instanceof Element) {
            hasTextChanges = true;
            break;
          }
        }
        if (hasTextChanges) break;
      }
    }

    if (hasTextChanges) {
      // 防抖处理，避免频繁触发
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(async () => {
        // 只处理新增的文本节点，而不是全量重新处理
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            await processAddedTextNodes(mutation.addedNodes);
          }
        }
      }, 500); // 减少防抖延迟到500ms
    }
  });

  // 监听DOM变化
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    // attributes: true, // 如果需要监听属性变化可以启用
  });
}

/**
 * 启动翻译功能
 */
export async function startTranslation(): Promise<void> {
  // 延迟几秒再加载
  await delay(2000)
  console.log('startTrans')

  // 处理页面中的单词
  await processPageWords()
  
  // 设置选择监听器
  setupSelectionListener().catch(console.error)
  
  // 初始化DOM变化监听器
  initDOMObserver();
}