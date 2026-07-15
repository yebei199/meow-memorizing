import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { IWordStorage } from '../../src/core/types';

const sendMessage = vi.fn(
  async (type: string, _data?: unknown) => {
    if (
      type === 'matcherFindMatches' ||
      type === 'matcherFindDeleted'
    )
      return [];
    return undefined;
  },
);

vi.mock('../../src/core/messaging', () => ({
  sendMessage: (type: string, data?: unknown) =>
    sendMessage(type, data),
}));

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

// matcherFacade caches the last-synced signature in module-level state, so
// each test gets a fresh module instance to avoid order-dependent bleed.
async function loadFacade() {
  return import('../../src/content-scripts/matcherFacade');
}

function lastSetWordsCall() {
  const call = sendMessage.mock.calls.findLast(
    ([type]) => type === 'matcherSetWords',
  );
  return call?.[1] as
    | { active: string[]; deleted: string[] }
    | undefined;
}

beforeEach(() => {
  vi.resetModules();
  sendMessage.mockClear();
});

describe('findMatchingWords / findDeletedWords word-set sync', () => {
  it(// 三个生命周期字段都为 false 的普通词应当进入 active 集合
  'sends a word with no lifecycle flags set as active', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      apple: makeWord({ word: 'apple' }),
    };

    await findMatchingWords('some text', wordsList);

    expect(lastSetWordsCall()).toEqual({
      active: ['apple'],
      deleted: [],
    });
  });

  it(// 已记住（isDeleted）的词应当进入 deleted 集合（现状不变）
  'sends an isDeleted word as deleted', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      memorized: makeWord({
        word: 'memorized',
        isDeleted: true,
      }),
    };

    await findMatchingWords('some text', wordsList);

    expect(lastSetWordsCall()).toEqual({
      active: [],
      deleted: ['memorized'],
    });
  });

  it(// 停用词（isIgnored）即便 isDeleted 为 false，也应当进入 deleted 集合——这是 #138 新增的行为
  'sends an isIgnored word as deleted even though isDeleted is false', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      is: makeWord({ word: 'is', isIgnored: true }),
    };

    await findMatchingWords('some text', wordsList);

    expect(lastSetWordsCall()).toEqual({
      active: [],
      deleted: ['is'],
    });
  });

  it(// 查无翻译（isUntranslatable）即便其余两个字段为 false，也应当进入 deleted 集合——这是 #138 新增的行为
  'sends an isUntranslatable word as deleted even though isDeleted and isIgnored are false', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      zzz: makeWord({
        word: 'zzz',
        isUntranslatable: true,
      }),
    };

    await findMatchingWords('some text', wordsList);

    expect(lastSetWordsCall()).toEqual({
      active: [],
      deleted: ['zzz'],
    });
  });

  it(// 同时命中多个排除状态的词只应该在 deleted 数组里出现一次，不应重复或分裂成多条
  'sends a word with multiple exclusion flags true as deleted exactly once', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      both: makeWord({
        word: 'both',
        isDeleted: true,
        isIgnored: true,
      }),
    };

    await findMatchingWords('some text', wordsList);

    expect(lastSetWordsCall()).toEqual({
      active: [],
      deleted: ['both'],
    });
  });

  it(// 历史数据缺失 isIgnored/isUntranslatable 字段时应视为 false，归入 active，而不是抛错或误判为排除
  'treats a legacy word missing isIgnored/isUntranslatable fields as active', async () => {
    const { findMatchingWords } = await loadFacade();
    const legacyWord = {
      word: 'legacy',
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    } as IWordStorage;

    await findMatchingWords('some text', {
      legacy: legacyWord,
    });

    expect(lastSetWordsCall()).toEqual({
      active: ['legacy'],
      deleted: [],
    });
  });

  it(// 签名计算必须覆盖三个字段：仅 isIgnored 从 false 变 true（isDeleted 不变）也应该触发重新同步，
  // 而不是被旧签名逻辑（只看 isDeleted）误判为"没变化"而跳过
  'resyncs when only isIgnored flips even though isDeleted stays the same', async () => {
    const { findMatchingWords } = await loadFacade();
    const before = { is: makeWord({ word: 'is' }) };
    const after = {
      is: makeWord({ word: 'is', isIgnored: true }),
    };

    await findMatchingWords('some text', before);
    const setWordsCallsAfterFirst =
      sendMessage.mock.calls.filter(
        ([type]) => type === 'matcherSetWords',
      ).length;

    await findMatchingWords('some text', after);
    const setWordsCallsAfterSecond =
      sendMessage.mock.calls.filter(
        ([type]) => type === 'matcherSetWords',
      ).length;

    expect(setWordsCallsAfterSecond).toBe(
      setWordsCallsAfterFirst + 1,
    );
    expect(lastSetWordsCall()).toEqual({
      active: [],
      deleted: ['is'],
    });
  });

  it(// 两次调用之间单词集合完全没变时，不应该重复发送 matcherSetWords（沿用既有的签名缓存行为）
  'skips resending matcherSetWords when nothing changed between two calls', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = {
      apple: makeWord({ word: 'apple' }),
    };

    await findMatchingWords('some text', wordsList);
    await findMatchingWords('some other text', wordsList);

    const setWordsCalls = sendMessage.mock.calls.filter(
      ([type]) => type === 'matcherSetWords',
    );
    expect(setWordsCalls).toHaveLength(1);
  });
});
