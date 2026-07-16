import { describe, expect, it } from 'vitest';
import type { IWordStorage } from '../../src/core/types';
import { activeWords, isExcluded } from '../../src/core/wordSets';

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

describe('isExcluded', () => {
  it(// 三个生命周期标志都为 false 的普通词不应被排除
  'keeps a word with no lifecycle flags set', () => {
    expect(isExcluded(makeWord({ word: 'apple' }))).toBe(
      false,
    );
  });

  it(// 任一排除标志为 true 都应被排除（已记住/停用词/查无翻译）
  'excludes a word when any lifecycle flag is set', () => {
    expect(isExcluded({ isDeleted: true })).toBe(true);
    expect(isExcluded({ isIgnored: true })).toBe(true);
    expect(isExcluded({ isUntranslatable: true })).toBe(
      true,
    );
  });

  it(// 历史数据缺失新字段时按 false 处理，不应误判为排除
  'treats missing flags as false', () => {
    expect(isExcluded({})).toBe(false);
  });
});

describe('activeWords', () => {
  it(// 只挑出未被排除的词喂给匹配器高亮
  'returns only the non-excluded words', () => {
    const list = {
      apple: makeWord({ word: 'apple' }),
      memorized: makeWord({
        word: 'memorized',
        isDeleted: true,
      }),
      is: makeWord({ word: 'is', isIgnored: true }),
      zzz: makeWord({
        word: 'zzz',
        isUntranslatable: true,
      }),
      banana: makeWord({ word: 'banana' }),
    };

    expect(activeWords(list).sort()).toEqual([
      'apple',
      'banana',
    ]);
  });

  it(// 历史数据缺失 isIgnored/isUntranslatable 字段应归入 active
  'treats a legacy word missing new fields as active', () => {
    const legacy = {
      word: 'legacy',
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    } as IWordStorage;

    expect(activeWords({ legacy })).toEqual(['legacy']);
  });

  it(// 词表为空时返回空数组，而不是抛错
  'returns an empty array for an empty word list', () => {
    expect(activeWords({})).toEqual([]);
  });
});
