import { sendMessage } from '@/src/core/messaging';
import { queryWord } from '@/src/core/storageManager';

// 创建翻译缓存，直接使用对象类型避免额外的接口定义
export const translationCache = new Map<
  string,
  { data: string; timestamp: number }
>();
export const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存时间

/**
 * 检查并使用缓存数据
 */
export function checkAndUseCache(
  word: string,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
): { data: string; timestamp: number } | undefined {
  const cachedEntry = translationCache.get(word);
  if (
    cachedEntry &&
    Date.now() - cachedEntry.timestamp < CACHE_EXPIRY
  ) {
    return cachedEntry;
  } else if (cachedEntry) {
    // 缓存过期，删除它
    translationCache.delete(word);
  }
  return undefined;
}

/**
 * 解析html字符串
 */
export function parseBingDict(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    htmlString,
    'text/html',
  );

  const element = doc
    .querySelector('#clientnewword')
    ?.getAttribute('data-definition');

  if (!element) {
    return '没找到';
  }

  // 使用通用正则表达式匹配词性格式（字母加点的模式）
  // 在每个词性前添加换行（除了第一个）
  return element.replace(
    /(\s)([a-zA-Z]+\.)(?=\s)/g,
    '$1\n$2',
  );
}

/**
 * 获取单词信息并处理缓存检查
 */
export async function fetchData(
  word: string,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
  deleteWord: (word: string) => Promise<void>,
  processPageWords: () => Promise<void>,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
) {
  const wordLocalInfo = await queryWord(word);
  if (!wordLocalInfo) return;

  // 先检查缓存
  const cachedResult = await handleCachedData(
    word,
    wordLocalInfo,
    translationCache,
    CACHE_EXPIRY,
    setDataEnd,
    setLoading,
    setWordLocalInfoOuter,
    addWordLocal,
  );

  if (cachedResult) return;

  // 缓存未命中或过期，从网络获取数据
  await fetchAndProcessNetworkData(
    word,
    setDataEnd,
    setLoading,
    wordLocalInfo,
    setWordLocalInfoOuter,
    addWordLocal,
    deleteWord,
    processPageWords,
    translationCache,
  );
}

/**
 * 处理缓存数据
 */
async function handleCachedData(
  word: string,
  wordLocalInfo: any,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
): Promise<boolean> {
  const cachedEntry = checkAndUseCache(
    word,
    translationCache,
    CACHE_EXPIRY,
  );
  if (cachedEntry) {
    setDataEnd(cachedEntry.data);
    setLoading(false);

    // 更新查询次数
    if (wordLocalInfo) {
      wordLocalInfo.queryTimes += 1;
      setWordLocalInfoOuter(wordLocalInfo);
      await addWordLocal(wordLocalInfo);
    }
    return true;
  }
  return false;
}

/**
 * 从网络获取并处理数据
 */
async function fetchAndProcessNetworkData(
  word: string,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  wordLocalInfo: any,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
  deleteWord: (word: string) => Promise<void>,
  processPageWords: () => Promise<void>,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
) {
  try {
    const htmlString = await sendMessage('trans', { word });
    const element = parseBingDict(htmlString);
    if (element) {
      // 缓存结果
      const cacheEntry = {
        data: element,
        timestamp: Date.now(),
      };
      translationCache.set(word, cacheEntry);
      setDataEnd(element);
    } else {
      await deleteWord(word);
      await processPageWords();
      setDataEnd('未找到翻译');
    }
  } catch (error) {
    console.error('获取翻译失败:', error);
    setDataEnd('获取翻译失败');
  } finally {
    setLoading(false);
  }

  if (wordLocalInfo) {
    wordLocalInfo.queryTimes += 1;
    setWordLocalInfoOuter(wordLocalInfo);
    await addWordLocal(wordLocalInfo);
  }
}
