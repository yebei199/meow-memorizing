import { getWordsList } from '@/src/core/storageManager'
import {
  getAllTextNodes,
  processTextNode,
  restoreOriginalTextNode
} from './domUtils'
import { findMatchingWords } from './wordMatcher'

/**
 * 处理页面中的单词
 */
export async function processPageWords(): Promise<void> {
  try {
    // 获取单词列表
    const wordsList = await getWordsList()
    if (!wordsList) return

    // 获取页面所有文本节点
    const textNodes = getAllTextNodes()

    // 处理每个文本节点
    for (const textNode of textNodes) {
      await processTextNode(textNode, wordsList, findMatchingWords)
    }
  } catch (error) {
    console.error('处理页面单词时出错:', error)
  }
}