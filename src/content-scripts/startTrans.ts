import { delay } from '@/src/core/wordProcessor'
import { setupSelectionListener } from './AddButton'
import { processPageWords } from './ergodicWords'

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
 * 初始化DOM变化监听器
 */
function initDOMObserver(): void {
  if (domObserver) {
    domObserver.disconnect();
  }

  domObserver = new MutationObserver((mutations) => {
    // 如果变化与翻译面板相关，则忽略
    if (isMutationRelatedToTranslationPanel(mutations)) {
      return;
    }

    // 防抖处理，避免频繁触发
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      processPageWords().catch(console.error);
    }, 1000); // 增加到1000ms防抖延迟，避免频繁触发
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