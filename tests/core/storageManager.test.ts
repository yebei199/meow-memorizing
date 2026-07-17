// 词库存储层契约:一词一条(local:word:<w>),而非整本一个 blob。
// 分键形状是本次修复的性能根据(实测 5 万词:整本往返 536ms → 单条 24ms),
// 因此「键的布局」本身就是契约,需要被测试钉死。
// 注意:8192 字节配额由真实 chrome.storage 施加,fakeBrowser 不模拟配额,
// 故配额复现在 tests/e2e/large-vocabulary.spec.ts,不在这一层。
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  addWordLocal,
  getWordsList,
  queryWord,
  watchWords,
} from '../../src/core/storageManager';
import type {
  IAllWordsStorage,
  IWordStorage,
} from '../../src/core/types';

function makeWord(
  overrides: Partial<IWordStorage> & { word: string },
): IWordStorage {
  return {
    queryTimes: 1,
    isDeleted: false,
    deleteTimes: 0,
    isIgnored: false,
    isUntranslatable: false,
    lastAttemptAt: 0,
    ...overrides,
  };
}

describe('storageManager per-word persistence', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it(// 钉死本次修复的核心:数据落在 local，sync 保持为空（sync 单条目 8KB 是线上故障根因）
  'writes a word to the local area and never to sync', async () => {
    await addWordLocal(makeWord({ word: 'hello' }));

    expect(await storage.snapshot('sync')).toEqual({});
    expect(
      Object.keys(await storage.snapshot('local')),
    ).toContain('word:hello');
  });

  it(// 钉死分键形状:两个词两个独立键，且不存在承载整本词库的 myWords 条目
  'stores each word under its own key instead of one whole-book blob', async () => {
    await addWordLocal(makeWord({ word: 'hello' }));
    await addWordLocal(makeWord({ word: 'world' }));

    const snapshot = await storage.snapshot('local');
    expect(Object.keys(snapshot).sort()).toEqual([
      'word:hello',
      'word:world',
    ]);
    expect(snapshot.myWords).toBeUndefined();
  });

  it(// 正常路径:写入后能取回同一条记录（含三态字段）
  'reads back a word written by addWordLocal', async () => {
    const entry = makeWord({
      word: 'serendipity',
      queryTimes: 3,
      isIgnored: true,
    });
    await addWordLocal(entry);

    expect(await queryWord('serendipity')).toEqual(entry);
  });

  it(// 缺失边界:未存过的词返回 undefined，而不是抛错或空对象
  'returns undefined for a word that was never stored', async () => {
    expect(await queryWord('nonexistent')).toBeUndefined();
  });

  it(// 分键的行为保证:更新 A 词不得影响 B 词（整本 blob 时代这由读改写整本隐式保证）
  'updates one word without rewriting or losing its neighbours', async () => {
    await addWordLocal(
      makeWord({ word: 'alpha', queryTimes: 1 }),
    );
    await addWordLocal(
      makeWord({ word: 'beta', queryTimes: 5 }),
    );

    await addWordLocal(
      makeWord({ word: 'alpha', queryTimes: 2 }),
    );

    expect((await queryWord('alpha'))?.queryTimes).toBe(2);
    expect((await queryWord('beta'))?.queryTimes).toBe(5);
  });

  it(// 保留既有行为:大小写不敏感，存取都归一到小写
  'looks a word up case-insensitively', async () => {
    await addWordLocal(makeWord({ word: 'Hello' }));

    expect(await queryWord('HELLO')).toBeDefined();
    expect(
      Object.keys(await storage.snapshot('local')),
    ).toEqual(['word:hello']);
  });
});

describe('getWordsList', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it(// 词汇书页面与后台自动机都依赖整本视图，分键后仍要能拼回完整映射
  'assembles the whole vocabulary from the per-word keys', async () => {
    await addWordLocal(makeWord({ word: 'apple' }));
    await addWordLocal(
      makeWord({ word: 'banana', isDeleted: true }),
    );

    const list = await getWordsList();

    expect(Object.keys(list).sort()).toEqual([
      'apple',
      'banana',
    ]);
    expect(list.banana?.isDeleted).toBe(true);
  });

  it(// 空边界:全新安装时返回 {}，不抛错
  'returns an empty vocabulary on a fresh install', async () => {
    expect(await getWordsList()).toEqual({});
  });

  it(// 隔离性:local 区不再只有词表，非词条键不得被当成单词混进词库
  'ignores unrelated local storage keys', async () => {
    await storage.setItem('local:isWebsiteDarkMode', true);
    await addWordLocal(makeWord({ word: 'apple' }));

    expect(Object.keys(await getWordsList())).toEqual([
      'apple',
    ]);
  });
});

describe('watchWords', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it(// 替代 myWords.watch：后台靠它在活着时重建自动机，改动任一词条键都要能拿到最新整本
  'notifies the background matcher when a single word changes', async () => {
    const seen: IAllWordsStorage[] = [];
    watchWords((list) => {
      seen.push(list);
    });

    await addWordLocal(makeWord({ word: 'apple' }));

    await vi.waitFor(() =>
      expect(seen.at(-1)).toHaveProperty('apple'),
    );
  });
});
