import { defineExtensionStorage } from '@webext-core/storage';
import { browser } from 'wxt/browser';
import type {
  ExtensionStorageSchema,
  IAllWordsStorage,
  IWordStorage,
} from './types';

// 网站主题模式存储
export const isWebsiteDarkMode =
  storage.defineItem<boolean>('local:isWebsiteDarkMode', {
    fallback: false,
  });

/**
 * 词条键前缀:词库一词一条(local:word:<单词>)。
 *
 * 曾经整本词库存在 sync 区的单个 myWords 条目里,但 chrome.storage.sync 的
 * 单条目上限是 8192 字节,约 54 词后所有写入抛 kQuotaBytesPerItem,选词链路
 * 在 mouseup 监听器里静默中断——页面既不翻译也不高亮,而已有高亮因为只依赖
 * 读取仍然显示。分键存储同时解决容量与写入代价(实测 5 万词:整本往返
 * 536ms → 单条 24ms)。详见 docs/adr/0004-per-word-local-storage.md。
 */
const WORD_KEY_PREFIX = 'word:';

/** 迁移完成标记。用它而非「local 是否为空」判断,否则用户迁移后删掉的词会复活。 */
const wordsMigratedFromSync = storage.defineItem<boolean>(
  'local:wordsMigratedFromSync',
  { fallback: false },
);

/** 迁移前的老词库:sync 区的整本 blob。不带 fallback,读不到即为 null。 */
const legacySyncWords =
  storage.defineItem<IAllWordsStorage>('sync:myWords');

type WordKey = `local:${string}`;

const wordKey = (word: string): WordKey =>
  `local:${WORD_KEY_PREFIX}${word.trim().toLowerCase()}`;

/**
 * 获取整本词库(供词汇书页面与后台自动机使用)。
 * 每次从快照现建对象返回,不复用共享引用——调用方(如 addQueriedWord)会就地
 * 修改取回的词条。
 */
export async function getWordsList(): Promise<IAllWordsStorage> {
  try {
    const snapshot = await storage.snapshot('local');
    const wordsList: IAllWordsStorage = {};
    for (const [key, value] of Object.entries(snapshot)) {
      if (!key.startsWith(WORD_KEY_PREFIX)) continue;
      const entry = value as IWordStorage;
      if (typeof entry?.word !== 'string') continue;
      wordsList[entry.word.toLowerCase()] = entry;
    }
    return wordsList;
  } catch (error) {
    console.error('Failed to get words list:', error);
    throw new Error('Can not get local storage words list');
  }
}

/**
 * 查询单词
 */
export async function queryWord(
  word: string,
): Promise<IWordStorage | undefined> {
  try {
    return (
      (await storage.getItem<IWordStorage>(
        wordKey(word),
      )) ?? undefined
    );
  } catch (error) {
    console.error('Failed to query word:', error);
    return undefined;
  }
}

/**
 * 添加或更新单词。只写这一条,不触碰词库里的其他词。
 */
export async function addWordLocal(
  wordNeedAdd: IWordStorage,
): Promise<void> {
  try {
    await storage.setItem(
      wordKey(wordNeedAdd.word),
      wordNeedAdd,
    );
  } catch (error) {
    console.error(
      'Failed to add word to local storage:',
      error,
    );
    throw error;
  }
}

/**
 * 监听词库变化,交给后台 worker 重建自动机。
 * WXT 的 storage.watch 只能盯单个键,而词条键是动态的,所以直接听 local 区的
 * 变更事件并按前缀过滤。
 */
export function watchWords(
  callback: (wordsList: IAllWordsStorage) => void,
): void {
  browser.storage.local.onChanged.addListener(
    async (changes) => {
      const touchedWords = Object.keys(changes).some(
        (key) => key.startsWith(WORD_KEY_PREFIX),
      );
      if (!touchedWords) return;
      callback(await getWordsList());
    },
  );
}

/**
 * 把老用户存在 sync 区的整本词库迁到 local 区、一词一条。只跑一次。
 *
 * 不删除 sync 原数据:那 8KB 反正另作他用不了,留着当迁移出错时的安全网。
 * 已存在于 local 的词不覆盖——本地的才是更新的那份。
 */
export async function migrateLegacySyncWords(): Promise<void> {
  if (await wordsMigratedFromSync.getValue()) return;

  const legacyWords = await legacySyncWords.getValue();
  const existingWords = await getWordsList();
  const wordsToMigrate = Object.values(legacyWords ?? {})
    .filter(
      (entry): entry is IWordStorage =>
        typeof entry?.word === 'string',
    )
    .filter(
      (entry) =>
        !(entry.word.toLowerCase() in existingWords),
    )
    .map((entry) => ({
      key: wordKey(entry.word),
      value: entry,
    }));

  if (wordsToMigrate.length > 0) {
    await storage.setItems(wordsToMigrate);
  }
  await wordsMigratedFromSync.setValue(true);
}

export const extensionStorage =
  defineExtensionStorage<ExtensionStorageSchema>(
    browser.storage.local,
  );
