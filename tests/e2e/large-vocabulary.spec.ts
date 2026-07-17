// 大词库回归:真实扩展 + 真实 chrome.storage 配额。
//
// 这一层是配额故障唯一的可测之处——vitest 的 fakeBrowser 是内存存储,不施加
// 8192 字节的 kQuotaBytesPerItem 限制,所以整本词库存在 sync 单条目里的旧设计
// 能一路通过单元测试,却在真实浏览器里于约 54 词后死掉(见
// docs/adr/0004-per-word-local-storage.md)。
import {
  expect,
  test,
  type Worker,
} from '@playwright/test';
import type { IWordStorage } from '../../src/core/types';
import {
  STARTUP_MS,
  selectWord,
  setupBundleHarness,
} from './bundleHarness';

/** #142 三态字段之后的真实词条形状(约 150 字节/条,键名计入)。 */
function makeWord(word: string): IWordStorage {
  return {
    word,
    queryTimes: 3,
    isDeleted: false,
    deleteTimes: 0,
    isIgnored: false,
    isUntranslatable: false,
    lastAttemptAt: 0,
  };
}

/** 造一本 `count` 个填充词的词库,词本身不出现在测试页面上。 */
function fillerVocabulary(
  count: number,
): Record<string, IWordStorage> {
  const words: Record<string, IWordStorage> = {};
  for (let i = 0; i < count; i++) {
    const word = `vocabfiller${String(i).padStart(5, '0')}`;
    words[word] = makeWord(word);
  }
  return words;
}

/** 老形状:整本词库塞进 sync 区的单个 myWords 条目。 */
async function seedLegacySyncBlob(
  worker: Worker,
  words: Record<string, IWordStorage>,
): Promise<void> {
  await worker.evaluate(
    (seed: unknown) =>
      (
        globalThis as unknown as {
          chrome: {
            storage: {
              sync: { set(v: unknown): Promise<void> };
            };
          };
        }
      ).chrome.storage.sync.set({ myWords: seed }),
    words,
  );
}

test('selecting a new word still saves and highlights with a vocabulary that overflows the sync quota', async () => {
  // 54 词 ≈ 8.1KB,正好越过 sync 单条目 8192 字节的线——线上故障的规模。
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: fillerVocabulary(54),
  });

  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(h.page, 'body', 'world');

  // 翻译卡片必须弹出(旧实现里 addQueriedWord 抛配额错误,整条链静默中断)。
  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toContainText('已加入词库');

  // 新词必须真的入库,并在页面上高亮。
  await expect(
    h.page.locator('[data-word="world"]'),
  ).toHaveCount(1, { timeout: 15000 });
  const stored = await h.worker.evaluate(() =>
    (
      globalThis as unknown as {
        chrome: {
          storage: {
            local: {
              get(
                k: string,
              ): Promise<Record<string, unknown>>;
            };
          };
        };
      }
    ).chrome.storage.local.get('word:world'),
  );
  expect(stored['word:world']).toBeTruthy();

  await h.close();
});

test('keeps highlighting existing words while the vocabulary is huge', async () => {
  // 锁死这次误诊的表象:高亮只依赖读,读不受配额限制,所以旧实现下已有词的
  // 下划线照常显示、只有写入死掉——看起来极像上一个 PR 的 worker 回收问题。
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      ...fillerVocabulary(54),
      hello: makeWord('hello'),
    },
  });

  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 15000 });

  await h.close();
});

test('handles a vocabulary far beyond the sync total quota', async () => {
  // 5000 词 ≈ 750KB,超 sync 区 102400 字节总量上限 7 倍、512 条目上限 10 倍。
  // 证明 local + 分键 + unlimitedStorage 真的解除了容量天花板(5 万词的实测
  // 成本见 ADR-0004,不在 CI 里每次重付)。
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      ...fillerVocabulary(5000),
      hello: makeWord('hello'),
    },
  });

  // 大词库下自动机照常工作。
  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 20000 });

  // 而且还能继续加词。
  await h.page.waitForTimeout(STARTUP_MS);
  await selectWord(h.page, 'body', 'world');
  await expect(
    h.page.locator('[data-word="world"]'),
  ).toHaveCount(1, { timeout: 20000 });

  await h.close();
});

test('migrates a legacy sync vocabulary to local on startup without losing words', async () => {
  // 老用户升级的真实路径:词库只存在于 sync 区的旧 blob 里。
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
  });

  await seedLegacySyncBlob(h.worker, {
    hello: makeWord('hello'),
    reddit: makeWord('reddit'),
  });
  // 重载让 worker 冷启动跑迁移,并让内容脚本重新扫描。
  await h.page.reload({ waitUntil: 'load' });

  // 迁移后的词照常高亮。
  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 15000 });
  await expect(
    h.page.locator('[data-word="reddit"]'),
  ).toHaveCount(2, { timeout: 15000 });

  // local 区已逐词持有迁移结果,一个都不少。
  const migrated = await h.worker.evaluate(() =>
    (
      globalThis as unknown as {
        chrome: {
          storage: {
            local: {
              get(
                k: null,
              ): Promise<Record<string, unknown>>;
            };
          };
        };
      }
    ).chrome.storage.local.get(null),
  );
  expect(Object.keys(migrated).sort()).toEqual(
    expect.arrayContaining(['word:hello', 'word:reddit']),
  );

  await h.close();
});
