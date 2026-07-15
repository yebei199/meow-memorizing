import { describe, expect, it } from 'vitest';
import { processWordsList } from '../../entrypoints/popup/popup-main/VocabularyBook';
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

function makeWordsList(
  ...words: IWordStorage[]
): IAllWordsStorage {
  const list: IAllWordsStorage = {};
  for (const word of words) list[word.word] = word;
  return list;
}

describe('processWordsList mode filtering (#141)', () => {
  it(// active 标签页：排除已记住和停用词，只展示普通活跃词
  'shows only plain active words for the active tab', () => {
    const wordsList = makeWordsList(
      makeWord({ word: 'apple' }),
      makeWord({ word: 'memorized', isDeleted: true }),
      makeWord({ word: 'is', isIgnored: true }),
      makeWord({
        word: 'zzz',
        isUntranslatable: true,
      }),
    );

    const shown = processWordsList(
      wordsList,
      '',
      undefined,
      undefined,
      undefined,
      undefined,
      'active',
    );

    expect(shown.map((w) => w.word)).toEqual([
      'apple',
      'zzz',
    ]);
  });

  it(// memorized 标签页：只展示 isDeleted 的词
  'shows only isDeleted words for the memorized tab', () => {
    const wordsList = makeWordsList(
      makeWord({ word: 'apple' }),
      makeWord({ word: 'memorized', isDeleted: true }),
      makeWord({ word: 'is', isIgnored: true }),
    );

    const shown = processWordsList(
      wordsList,
      '',
      undefined,
      undefined,
      undefined,
      undefined,
      'memorized',
    );

    expect(shown.map((w) => w.word)).toEqual(['memorized']);
  });

  it(// ignored 标签页：只展示 isIgnored 的停用词
  'shows only isIgnored words for the ignored tab', () => {
    const wordsList = makeWordsList(
      makeWord({ word: 'apple' }),
      makeWord({ word: 'memorized', isDeleted: true }),
      makeWord({ word: 'is', isIgnored: true }),
    );

    const shown = processWordsList(
      wordsList,
      '',
      undefined,
      undefined,
      undefined,
      undefined,
      'ignored',
    );

    expect(shown.map((w) => w.word)).toEqual(['is']);
  });

  it(// 历史数据缺失 isIgnored 字段时应视为 false，归入 active 标签页而不是报错
  'treats a legacy word missing isIgnored as active', () => {
    const legacyWord = {
      word: 'legacy',
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    } as IWordStorage;
    const wordsList = makeWordsList(legacyWord);

    const shown = processWordsList(
      wordsList,
      '',
      undefined,
      undefined,
      undefined,
      undefined,
      'active',
    );

    expect(shown.map((w) => w.word)).toEqual(['legacy']);
  });
});
