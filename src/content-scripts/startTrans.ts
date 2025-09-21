import { delay } from '@/src/core/wordProcessor'
import { setupSelectionListener } from './AddButton'
import { processPageWords } from './ergodicWords'

let domObserver: MutationObserver | null = null;
let debounceTimer: number | null = null;

/**
 * 初始化DOM变化监听器
 */
function initDOMObserver(): void {
  if (domObserver) {
    domObserver.disconnect();
  }

  domObserver = new MutationObserver(() => {
    // 防抖处理，避免频繁触发
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      processPageWords().catch(console.error);
    }, 500); // 500ms防抖延迟
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