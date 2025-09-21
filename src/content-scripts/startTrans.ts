import { delay } from '@/src/core/wordProcessor'
import { setupSelectionListener } from './AddButton'
import { processPageWords } from './ergodicWords'

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
}