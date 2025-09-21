import { processPageWords as _processPageWords } from './textProcessor';

/**
 * 处理页面中的单词
 */
export async function processPageWords(): Promise<void> {
  return _processPageWords();
}
