// 老用户升级迁移:sync:myWords 整本 blob → local 区一词一条。
// 动的是用户真实词库,只做这一次,所以「不丢词、不覆盖、不复活」三条
// 都必须被钉死。
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  addWordLocal,
  getWordsList,
  migrateLegacySyncWords,
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

/** 老形状:整本词库存在 sync 区的单个 myWords 条目里。 */
async function seedLegacySync(
  words: IAllWordsStorage,
): Promise<void> {
  await storage.setItem('sync:myWords', words);
}

describe('migrateLegacySyncWords', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it(// 迁移主路径:词库只在 sync 区时，迁移后 local 逐词持有全部词条，一个都不能少
  'copies every legacy sync word into per-word local keys', async () => {
    await seedLegacySync({
      apple: makeWord({ word: 'apple', queryTimes: 4 }),
      banana: makeWord({ word: 'banana', isDeleted: true }),
    });

    await migrateLegacySyncWords();

    const list = await getWordsList();
    expect(Object.keys(list).sort()).toEqual([
      'apple',
      'banana',
    ]);
    expect(list.apple?.queryTimes).toBe(4);
    expect(list.banana?.isDeleted).toBe(true);
    expect(
      Object.keys(await storage.snapshot('local')),
    ).toEqual(
      expect.arrayContaining(['word:apple', 'word:banana']),
    );
  });

  it(// 历史数据兼容:#142 之前的记录没有三态字段，迁移不得丢字段或改写状态
  'preserves legacy entries that predate the three-state fields', async () => {
    const legacy = {
      word: 'legacy',
      queryTimes: 2,
      isDeleted: false,
      deleteTimes: 1,
    } as IWordStorage;
    await seedLegacySync({ legacy });

    await migrateLegacySyncWords();

    expect((await getWordsList()).legacy).toEqual(legacy);
  });

  it(// 防回滚:local 已有更新的词条时，sync 里的旧快照不得覆盖它
  'does not overwrite words that already exist locally', async () => {
    await addWordLocal(
      makeWord({ word: 'apple', queryTimes: 9 }),
    );
    await seedLegacySync({
      apple: makeWord({ word: 'apple', queryTimes: 1 }),
    });

    await migrateLegacySyncWords();

    expect((await getWordsList()).apple?.queryTimes).toBe(
      9,
    );
  });

  it(// 幂等性:迁移完成后用户清空词库，再次启动不得把 sync 旧词灌回来
  'does not resurrect words the user deleted after migrating', async () => {
    await seedLegacySync({
      apple: makeWord({ word: 'apple' }),
    });
    await migrateLegacySyncWords();

    // 用户迁移后把词从词库里彻底删掉
    await storage.removeItem('local:word:apple');

    await migrateLegacySyncWords();

    expect(await getWordsList()).toEqual({});
  });

  it(// 全新安装边界:sync 与 local 都为空时不写入任何词条、不抛错
  'is a no-op on a fresh install with no legacy data', async () => {
    await migrateLegacySyncWords();

    expect(await getWordsList()).toEqual({});
  });

  it(// 安全网:不删 sync 原数据，万一迁移有问题用户词库还在
  'leaves the legacy sync blob untouched as a fallback', async () => {
    const legacy = {
      apple: makeWord({ word: 'apple' }),
    };
    await seedLegacySync(legacy);

    await migrateLegacySyncWords();

    expect(await storage.getItem('sync:myWords')).toEqual(
      legacy,
    );
  });
});
