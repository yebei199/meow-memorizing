import { beforeEach, describe, it, vi } from 'vitest';
import type { IWordStorage } from '../../src/core/types';

const sendMessage = vi.fn(async (type: string) => {
  if (
    type === 'matcherFindMatches' ||
    type === 'matcherFindDeleted'
  )
    return [];
  return undefined;
});

vi.mock('../../src/core/messaging', () => ({
  sendMessage: (...args: [string, unknown]) =>
    sendMessage(...args),
}));

function _makeWord(
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
async function _loadFacade() {
  return import('../../src/content-scripts/matcherFacade');
}

function _lastSetWordsCall() {
  const call = sendMessage.mock.calls.find(
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
  it.todo(
    // 三个生命周期字段都为 false 的普通词应当进入 active 集合
    'sends a word with no lifecycle flags set as active',
  );

  it.todo(
    // 已记住（isDeleted）的词应当进入 deleted 集合（现状不变）
    'sends an isDeleted word as deleted',
  );

  it.todo(
    // 停用词（isIgnored）即便 isDeleted 为 false，也应当进入 deleted 集合——这是 #138 新增的行为
    'sends an isIgnored word as deleted even though isDeleted is false',
  );

  it.todo(
    // 查无翻译（isUntranslatable）即便其余两个字段为 false，也应当进入 deleted 集合——这是 #138 新增的行为
    'sends an isUntranslatable word as deleted even though isDeleted and isIgnored are false',
  );

  it.todo(
    // 同时命中多个排除状态的词只应该在 deleted 数组里出现一次，不应重复或分裂成多条
    'sends a word with multiple exclusion flags true as deleted exactly once',
  );

  it.todo(
    // 历史数据缺失 isIgnored/isUntranslatable 字段时应视为 false，归入 active，而不是抛错或误判为排除
    'treats a legacy word missing isIgnored/isUntranslatable fields as active',
  );

  it.todo(
    // 签名计算必须覆盖三个字段：仅 isIgnored 从 false 变 true（isDeleted 不变）也应该触发重新同步，
    // 而不是被旧签名逻辑（只看 isDeleted）误判为"没变化"而跳过
    'resyncs when only isIgnored flips even though isDeleted stays the same',
  );

  it.todo(
    // 两次调用之间单词集合完全没变时，不应该重复发送 matcherSetWords（沿用既有的签名缓存行为）
    'skips resending matcherSetWords when nothing changed between two calls',
  );
});
