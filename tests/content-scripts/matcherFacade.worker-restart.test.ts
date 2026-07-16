import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  IWordMatch,
  IWordStorage,
} from '../../src/core/types';

// 复现 karakeep 上"点击任何词都不再高亮"的根因：
// WASM 匹配器的词表状态活在 MV3 后台 service worker 里，而 worker 会被浏览器
// 在空闲约 30s 后回收；内容脚本的 matcherFacade 却把 lastSig 缓存在与页面同寿命
// 的模块状态里。worker 重启后自动机为空，但 lastSig 仍认为"已同步"，于是
// ensureWords 跳过 matcherSetWords，之后所有 matcherFindMatches 都命中空匹配器，
// 页面彻底不再高亮，直到整页刷新才复位。
//
// 这个 fake worker 忠实模拟真实契约：模块级 synced 标志在"重启"后回到 false
// （新 worker 实例会重新求值模块顶层），冷启动的 find 应当发出 cold 信号，
// 让 facade 有机会重新下发词表。

const AUTOMATON_TEXT = 'the quick brown fox';
// Mirrors src/core/messaging.ts MATCHER_COLD; the module is mocked below so the
// facade imports this value, and the fake worker throws it on a cold find.
const MATCHER_COLD = 'matcher-cold';

// 后台 worker 的可回收状态（对应 background.ts 的模块级变量 + WASM thread_local）
let workerActive: string[] = [];
let workerSynced = false;

/** 模拟浏览器回收并冷启动一个新的 service worker：清空一切进程内状态。 */
function restartWorker(): void {
  workerActive = [];
  workerSynced = false;
}

const sendMessage = vi.fn(
  async (type: string, data?: unknown) => {
    if (type === 'matcherSetWords') {
      workerActive = (data as { active: string[] }).active;
      workerSynced = true;
      return undefined;
    }
    if (
      type === 'matcherFindMatches' ||
      type === 'matcherFindDeleted'
    ) {
      // 冷启动的 worker 从未收到过 setWords：真实自动机为空，向调用方
      // 抛出 cold 信号（而不是静默返回空），这样 facade 能区分"匹配器冷启动"
      // 与"确实没有匹配"，从而重新下发词表并重试。
      if (!workerSynced) {
        throw new Error(MATCHER_COLD);
      }
      const text = (data as { text: string }).text;
      const matches: IWordMatch[] = [];
      for (const word of workerActive) {
        const index = text.indexOf(word);
        if (index >= 0) {
          matches.push({
            index,
            word,
            end: index + word.length,
          });
        }
      }
      return matches;
    }
    return undefined;
  },
);

vi.mock('../../src/core/messaging', () => ({
  MATCHER_COLD,
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

async function loadFacade() {
  return import('../../src/content-scripts/matcherFacade');
}

beforeEach(() => {
  vi.resetModules();
  sendMessage.mockClear();
  restartWorker();
});

describe('matcher survives an MV3 background worker restart', () => {
  it(// 基线：worker 存活时，词表下发后能正常匹配到高亮
  'highlights a word while the worker stays warm', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = { quick: makeWord({ word: 'quick' }) };

    const matches = await findMatchingWords(
      AUTOMATON_TEXT,
      wordsList,
    );

    expect(matches.map((m) => m.word)).toEqual(['quick']);
  });

  it(// 复现 + 回归：worker 被回收后，词表未变的重新扫描仍必须能高亮。
  // 修复前 lastSig 命中导致跳过 setWords，冷 worker 返回空 → 断言失败。
  'still highlights an unchanged word set after the worker is recycled', async () => {
    const { findMatchingWords } = await loadFacade();
    const wordsList = { quick: makeWord({ word: 'quick' }) };

    // 首次扫描：词表同步进 worker，正常高亮。
    await findMatchingWords(AUTOMATON_TEXT, wordsList);

    // 浏览器空闲回收了后台 worker，自动机状态全部丢失。
    restartWorker();

    // 页面（SPA，未刷新）再次扫描同一批词——lastSig 仍认为已同步。
    const matches = await findMatchingWords(
      AUTOMATON_TEXT,
      wordsList,
    );

    expect(matches.map((m) => m.word)).toEqual(['quick']);
  });
});
