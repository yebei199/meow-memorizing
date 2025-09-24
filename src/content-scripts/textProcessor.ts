import { getWordsList } from '@/src/core/storageManager';
import {
  getAllTextNodes,
  processTextNode,
} from './domUtils';
import { findMatchingWords } from './wordMatcher';

/**
 * 处理页面中的单词
 */
export async function processPageWords(): Promise<void> {
  try {
    // 获取单词列表
    const wordsList = await getWordsList();
    if (!wordsList) return;

    // 获取页面所有文本节点
    const textNodes = getAllTextNodes();

    // 分块处理文本节点，避免阻塞主线程
    await processTextNodesInChunks(textNodes, wordsList, 50);
  } catch (error) {
    console.error('处理页面单词时出错:', error);
  }
}

/**
 * 分块处理文本节点
 * @param textNodes 文本节点数组
 * @param wordsList 单词列表
 * @param chunkSize 每块处理的节点数
 */
async function processTextNodesInChunks(
  textNodes: Text[],
  wordsList: Record<string, any>,
  chunkSize: number
): Promise<void> {
  for (let i = 0; i < textNodes.length; i += chunkSize) {
    const chunk = textNodes.slice(i, i + chunkSize);
    
    // 处理当前块
    const promises = chunk.map(textNode => 
      processTextNode(textNode, wordsList, findMatchingWords)
    );
    await Promise.all(promises);
    
    // 让出控制权给浏览器，防止阻塞UI
    await new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(undefined));
      } else {
        // 兼容性处理
        setTimeout(resolve, 0);
      }
    });
  }
}