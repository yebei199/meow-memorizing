import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { IWordStorage } from '../../src/core/types';
import {
  addQueriedWord,
  clearUntranslatable,
  decideSelectionAction,
  ignoreWord,
  markUntranslatable,
  shouldRetryTranslation,
  UNTRANSLATABLE_RETRY_COOLDOWN_MS,
  unignoreWord,
} from '../../src/core/wordProcessor';

// Fake in-memory storage backing queryWord/addWordLocal so wordProcessor.ts
// can be tested without WXT's storage global or chrome.storage.
const store = new Map<string, IWordStorage>();

vi.mock('../../src/core/storageManager', () => ({
  queryWord: vi.fn(async (word: string) =>
    store.get(word.toLowerCase()),
  ),
  addWordLocal: vi.fn(async (info: IWordStorage) => {
    store.set(info.word.toLowerCase(), info);
  }),
}));

function seedWord(
  overrides: Partial<IWordStorage> & { word: string },
): IWordStorage {
  const word: IWordStorage = {
    queryTimes: 1,
    isDeleted: false,
    deleteTimes: 0,
    isIgnored: false,
    isUntranslatable: false,
    lastAttemptAt: 0,
    ...overrides,
  };
  store.set(word.word, word);
  return word;
}

beforeEach(() => {
  store.clear();
});

describe('shouldRetryTranslation', () => {
  it(// 未查询过的新词（wordInfo 为 undefined）应当允许首次尝试翻译
  'returns true when wordInfo is undefined', () => {
    expect(shouldRetryTranslation(undefined)).toBe(true);
  });

  it(// 未被标记为查无翻译的词应当正常放行，不受冷却逻辑影响
  'returns true when isUntranslatable is false', () => {
    const word = seedWord({
      word: 'apple',
      isUntranslatable: false,
    });
    expect(shouldRetryTranslation(word)).toBe(true);
  });

  it(// 标记查无翻译后 3 天冷却期内不应重试
  'returns false within the 3-day cooldown window', () => {
    const word = seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt: Date.now() - 1000,
    });
    expect(shouldRetryTranslation(word)).toBe(false);
  });

  it(// 冷却期满（含边界值）后应当允许自动重试一次
  'returns true once the 3-day cooldown has elapsed', () => {
    const word = seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt:
        Date.now() - UNTRANSLATABLE_RETRY_COOLDOWN_MS - 1,
    });
    expect(shouldRetryTranslation(word)).toBe(true);
  });

  it(// 历史数据缺失 lastAttemptAt 字段时应视为可重试，而不是抛错或永久跳过
  'treats a legacy record missing lastAttemptAt as immediately retryable', () => {
    const legacyWord = {
      word: 'legacy',
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
      isUntranslatable: true,
    } as IWordStorage;
    expect(shouldRetryTranslation(legacyWord)).toBe(true);
  });
});

describe('ignoreWord', () => {
  it(// 标记停用词时只应改变 isIgnored，不应影响 isDeleted（已记住）和 isUntranslatable（查无翻译）这两个独立状态
  'marks an existing word as isIgnored without touching isDeleted or isUntranslatable', async () => {
    seedWord({
      word: 'is',
      isDeleted: false,
      isUntranslatable: true,
      lastAttemptAt: 123,
    });

    await ignoreWord('is');

    const updated = store.get('is');
    expect(updated?.isIgnored).toBe(true);
    expect(updated?.isDeleted).toBe(false);
    expect(updated?.isUntranslatable).toBe(true);
    expect(updated?.lastAttemptAt).toBe(123);
  });

  it(// 从未被查询/记录过的单词调用停用操作时，不应报错或凭空创建脏数据
  'does nothing when the word has never been queried before', async () => {
    await expect(
      ignoreWord('ghost'),
    ).resolves.toBeUndefined();
    expect(store.has('ghost')).toBe(false);
  });
});

describe('unignoreWord', () => {
  it(// 取消停用后 isIgnored 应变回 false，其余字段不受影响
  'clears isIgnored on a previously ignored word', async () => {
    seedWord({
      word: 'the',
      isIgnored: true,
      queryTimes: 5,
    });

    await unignoreWord('the');

    const updated = store.get('the');
    expect(updated?.isIgnored).toBe(false);
    expect(updated?.queryTimes).toBe(5);
  });
});

describe('markUntranslatable', () => {
  it(// 查无翻译时应打上 isUntranslatable 标记并记录当次尝试的时间戳
  'sets isUntranslatable and records the current attempt timestamp', async () => {
    seedWord({ word: 'xyzzy' });
    const before = Date.now();

    await markUntranslatable('xyzzy');

    const updated = store.get('xyzzy');
    expect(updated?.isUntranslatable).toBe(true);
    expect(updated?.lastAttemptAt).toBeGreaterThanOrEqual(
      before,
    );
  });
});

describe('clearUntranslatable', () => {
  it(// 冷却期满后的自动重试一旦成功，应清除 isUntranslatable，使单词恢复正常高亮与弹窗
  'resets isUntranslatable to false after a successful retry', async () => {
    seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt: 999,
    });

    await clearUntranslatable('zzz');

    expect(store.get('zzz')?.isUntranslatable).toBe(false);
  });

  it(// 单词本来就不是查无翻译状态时调用清除操作应当是安全的空操作
  'does nothing when the word is not marked untranslatable', async () => {
    const word = seedWord({
      word: 'apple',
      isUntranslatable: false,
    });

    await clearUntranslatable('apple');

    expect(store.get('apple')).toEqual(word);
  });
});

describe('addQueriedWord regression: new states must not be clobbered on reselect', () => {
  it(// 重新选中一个已被标记为停用词的单词时，不应像旧逻辑那样把它当成全新单词处理并清掉 isIgnored
  'does not reset isIgnored to false when a stopword is reselected', async () => {
    seedWord({
      word: 'is',
      isIgnored: true,
      queryTimes: 2,
    });

    await addQueriedWord('is');

    expect(store.get('is')?.isIgnored).toBe(true);
  });

  it(// 查无翻译单词在冷却期内被重新选中时，isUntranslatable 不应被 addQueriedWord 意外清除
  'does not reset isUntranslatable to false when an untranslatable word is reselected before cooldown', async () => {
    seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt: Date.now(),
    });

    await addQueriedWord('zzz');

    expect(store.get('zzz')?.isUntranslatable).toBe(true);
  });

  it(// 已记住的单词被重新选中时应保持现状——仍然立即把 isDeleted 重置为 false，这是刻意保留的既有行为
  'still resets isDeleted to false when a memorized word is reselected, preserving existing behavior', async () => {
    seedWord({
      word: 'memorized',
      isDeleted: true,
      deleteTimes: 1,
    });

    await addQueriedWord('memorized');

    expect(store.get('memorized')?.isDeleted).toBe(false);
  });

  it(// 全新单词首次被记录时，isIgnored/isUntranslatable/lastAttemptAt 三个新字段应有合理默认值
  'initializes isIgnored/isUntranslatable/lastAttemptAt defaults for a brand-new word', async () => {
    await addQueriedWord('brandnew');

    const created = store.get('brandnew');
    expect(created?.isIgnored).toBe(false);
    expect(created?.isUntranslatable).toBe(false);
    expect(created?.lastAttemptAt).toBe(0);
  });
});

describe('decideSelectionAction (#140)', () => {
  it(// 从未查过的新词：照常弹出翻译面板
  'shows the tooltip for a word with no info', () => {
    expect(decideSelectionAction(undefined)).toBe(
      'showTooltip',
    );
  });

  it(// 停用词：不弹面板，改为出重译提示点
  'shows the retranslate dot for an ignored word', () => {
    const word = seedWord({ word: 'is', isIgnored: true });
    expect(decideSelectionAction(word)).toBe('showDot');
  });

  it(// 查无翻译且仍在冷却期内：完全静默，什么都不出现
  'stays silent for an untranslatable word within its cooldown', () => {
    const word = seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt: Date.now() - 1000,
    });
    expect(decideSelectionAction(word)).toBe('silent');
  });

  it(// 查无翻译但冷却期已过：照常弹出翻译面板，触发一次重试
  'shows the tooltip for an untranslatable word once its cooldown has elapsed', () => {
    const word = seedWord({
      word: 'zzz',
      isUntranslatable: true,
      lastAttemptAt:
        Date.now() - UNTRANSLATABLE_RETRY_COOLDOWN_MS - 1,
    });
    expect(decideSelectionAction(word)).toBe('showTooltip');
  });

  it(// 已记住（isDeleted）的词：行为不变，照常弹出翻译面板
  'shows the tooltip for a memorized word, unaffected by isDeleted', () => {
    const word = seedWord({
      word: 'memorized',
      isDeleted: true,
    });
    expect(decideSelectionAction(word)).toBe('showTooltip');
  });

  it(// 同时是停用词又被判定查无翻译：停用词的圆点优先
  'prefers the retranslate dot when a word is both ignored and untranslatable', () => {
    const word = seedWord({
      word: 'both',
      isIgnored: true,
      isUntranslatable: true,
      lastAttemptAt: Date.now(),
    });
    expect(decideSelectionAction(word)).toBe('showDot');
  });
});
