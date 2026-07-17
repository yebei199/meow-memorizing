// 词库写满时的降级行为:真实扩展 + 真实 chrome.storage 配额。
//
// 写入失败必须只让「保存」失败,不能连累「翻译」——后者根本不依赖写入。
// 这是 ADR-0004 那次 8KB 故障真正的放大器:病因(配额)修了,病症(整条选词链
// 静默中断)没修,所以撞上 10MB 上限时症状会一模一样。
//
// 用「压舱物」把 local 区顶到离上限几十字节,比灌 6.6 万个真词快得多;
// 压舱键不带 word: 前缀,不会混进词库(见 storageManager.getWordsList)。
import {
  expect,
  test,
  type Worker,
} from '@playwright/test';
import {
  STARTUP_MS,
  selectWord,
  setupBundleHarness,
} from './bundleHarness';

/**
 * 把 local 区顶到离配额上限只剩 margin 字节,使下一次词条写入必定抛
 * kQuotaBytes。按真实用量自适应计算,不写死体积。
 */
async function fillStorageToQuota(
  worker: Worker,
): Promise<void> {
  const filled = await worker.evaluate(async () => {
    const local = (
      globalThis as unknown as {
        chrome: {
          storage: {
            local: {
              QUOTA_BYTES: number;
              getBytesInUse(k: null): Promise<number>;
              set(v: unknown): Promise<void>;
            };
          };
        };
      }
    ).chrome.storage.local;

    // 留 60 字节:小于一条词记录(约 150 字节),所以词条写入必然越界。
    const margin = 60;
    const used = await local.getBytesInUse(null);
    const size =
      local.QUOTA_BYTES -
      used -
      'ballast'.length -
      2 -
      margin;
    await local.set({ ballast: 'x'.repeat(size) });
    return local.getBytesInUse(null);
  });

  // 前置条件成立才有意义:确实已顶到上限附近。
  expect(filled).toBeGreaterThan(10_485_000);
}

test('still shows the translation card when a word cannot be saved', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
  });
  await h.page.waitForTimeout(STARTUP_MS);
  await fillStorageToQuota(h.worker);

  await selectWord(h.page, 'body', 'world');

  // 保存失败不该连累翻译:卡片照常弹出并给出释义。
  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  await expect(tooltip).toContainText('world');
  await expect(tooltip).toContainText('lucky discovery', {
    timeout: 15000,
  });

  await h.close();
});

test('tells the truth about a word it failed to save', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
  });
  await h.page.waitForTimeout(STARTUP_MS);
  await fillStorageToQuota(h.worker);

  await selectWord(h.page, 'body', 'world');

  const tooltip = h.page.locator(
    '[data-meow-tooltip-root="selection"]',
  );
  await expect(tooltip).toHaveCount(1, { timeout: 15000 });
  // 没存进去就不能宣称存进去了。
  await expect(tooltip).toContainText('未收录');
  await expect(tooltip).not.toContainText('已加入词库');

  await h.close();
});

test('keeps existing highlights while writes are rejected', async () => {
  const h = await setupBundleHarness({
    url: 'http://127.0.0.1:5199/sample.html',
    seedWords: {
      hello: {
        word: 'hello',
        queryTimes: 1,
        isDeleted: false,
        deleteTimes: 0,
        isIgnored: false,
        isUntranslatable: false,
        lastAttemptAt: 0,
      },
    },
  });
  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 15000 });

  await fillStorageToQuota(h.worker);

  // 读取不受配额限制,所以写入被拒时下划线照常显示——正是这个半死不活的
  // 表象让人误判为 worker 回收问题。
  await selectWord(h.page, 'body', 'world');
  await expect(
    h.page.locator('[data-word="hello"]'),
  ).toHaveCount(2, { timeout: 15000 });

  await h.close();
});
