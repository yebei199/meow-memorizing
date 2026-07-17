import {
  getAllTextNodes,
  processTextNode,
  resetProcessedTextNodes,
} from './domUtils';
import {
  findMatchingWords,
  reloadMatcherWords,
} from './matcherFacade';

/**
 * 处理页面中的单词。词表由后台 worker 自己从 storage 持有（见
 * docs/adr/0002-worker-owns-word-set.md），内容脚本只负责扫描文本节点、
 * 把文本交给匹配器，不再读取或传递词表。
 */
export async function processPageWords(): Promise<void> {
  try {
    // 整页扫描的调用方几乎都是刚改完词库（选词入库、取消停用），而后台收到
    // storage.onChanged 与这里拿到写入 ack 走的是两条 IPC，没有顺序保证。
    // 整页只扫这一次，抢输了刚加的词就永远不高亮（词表越大越必现），
    // 所以先挡一道，让 worker 把词表读新。
    await reloadMatcherWords();

    // Full-page rescans must revisit existing text nodes after the word list changes.
    resetProcessedTextNodes();

    // 获取页面所有文本节点
    const textNodes = getAllTextNodes();

    // 分块处理文本节点，避免阻塞主线程
    await processTextNodesInChunks(textNodes, 50);
  } catch (error) {
    console.error('处理页面单词时出错:', error);
  }
}

/**
 * 分块处理文本节点
 * @param textNodes 文本节点数组
 * @param chunkSize 每块处理的节点数
 */
async function processTextNodesInChunks(
  textNodes: Text[],
  chunkSize: number,
): Promise<void> {
  for (let i = 0; i < textNodes.length; i += chunkSize) {
    const chunk = textNodes.slice(i, i + chunkSize);

    // 处理当前块
    const promises = chunk.map((textNode) =>
      processTextNode(textNode, findMatchingWords),
    );
    await Promise.all(promises);

    // 让出控制权给浏览器，防止阻塞UI
    await new Promise((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(undefined));
      } else {
        // 兼容性处理
        setTimeout(resolve, 0);
      }
    });
  }
}
