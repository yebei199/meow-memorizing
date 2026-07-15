import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { IWordStorage } from '../../../src/core/types';

const sendMessage = vi.fn(
  async (_type: string, _data?: unknown) => '',
);
const queryWord = vi.fn(
  async (_word: string) =>
    undefined as IWordStorage | undefined,
);

vi.mock('@/src/core/messaging', () => ({
  sendMessage: (type: string, data?: unknown) =>
    sendMessage(type, data),
}));

vi.mock('@/src/core/storageManager', () => ({
  queryWord: (word: string) => queryWord(word),
}));

// parseBingDict() uses the real DOMParser; the unit-test environment is
// 'node' (no jsdom), so stub just enough of it to extract the
// data-definition attribute the way the real DOM parser would.
class StubDOMParser {
  parseFromString(html: string, _type: string) {
    const match = html.match(/data-definition="([^"]*)"/);
    return {
      querySelector: (_selector: string) =>
        match ? { getAttribute: () => match[1] } : null,
    };
  }
}
(
  globalThis as unknown as { DOMParser: unknown }
).DOMParser = StubDOMParser;

// fetchAndProcessNetworkData dispatches a window CustomEvent so already-
// mounted T2 highlighter instances can react immediately; stub the DOM-only
// `window` global (this unit-test environment is 'node', not a browser/jsdom).
(globalThis as unknown as { window: unknown }).window = {
  dispatchEvent: vi.fn(),
};

const { fetchData } = await import(
  '../../../src/components/transline/transUtils'
);

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

function makeDeps() {
  return {
    setDataEnd: vi.fn(),
    setLoading: vi.fn(),
    setWordLocalInfoOuter: vi.fn(),
    addWordLocal: vi.fn(async () => undefined),
    markUntranslatable: vi.fn(async () => undefined),
    onUntranslatable: vi.fn(),
    clearUntranslatable: vi.fn(async () => undefined),
    translationCache: new Map<
      string,
      { data: string; timestamp: number }
    >(),
  };
}

async function callFetchData(
  word: string,
  deps: ReturnType<typeof makeDeps>,
  mode: 'stored' | 'selection' = 'stored',
) {
  await fetchData(
    word,
    deps.setDataEnd,
    deps.setLoading,
    deps.setWordLocalInfoOuter,
    deps.addWordLocal,
    deps.markUntranslatable,
    deps.onUntranslatable,
    deps.clearUntranslatable,
    deps.translationCache,
    5 * 60 * 1000,
    mode,
  );
}

beforeEach(() => {
  sendMessage.mockReset();
  queryWord.mockReset();
});

describe('fetchData failure handling (#139)', () => {
  it(// 正常查到释义：setDataEnd 收到释义文本，不触发 onUntranslatable/markUntranslatable
  'sets the definition on a successful lookup', async () => {
    queryWord.mockResolvedValue(
      makeWord({ word: 'apple' }),
    );
    sendMessage.mockResolvedValue(
      '<div id="clientnewword" data-definition="fruit"></div>',
    );
    const deps = makeDeps();

    await callFetchData('apple', deps);

    expect(deps.setDataEnd).toHaveBeenCalledWith('fruit');
    expect(deps.onUntranslatable).not.toHaveBeenCalled();
    expect(deps.markUntranslatable).not.toHaveBeenCalled();
  });

  it(// 词典查无结果：不展示任何错误文案（setDataEnd 不被调用），
  // 而是调用 onUntranslatable 静默关闭面板，并调用 markUntranslatable 打上冷却标记
  'silently signals onUntranslatable and marks the word when no definition is found', async () => {
    queryWord.mockResolvedValue(makeWord({ word: 'zzz' }));
    sendMessage.mockResolvedValue('<div></div>');
    const deps = makeDeps();

    await callFetchData('zzz', deps);

    expect(deps.setDataEnd).not.toHaveBeenCalled();
    expect(deps.onUntranslatable).toHaveBeenCalledTimes(1);
    expect(deps.markUntranslatable).toHaveBeenCalledWith(
      'zzz',
    );
  });

  it(// 网络请求本身抛错：视同查无翻译，同样静默关闭 + 标记，而不是展示"获取翻译失败"文案
  'silently signals onUntranslatable and marks the word when the request throws', async () => {
    queryWord.mockResolvedValue(makeWord({ word: 'oops' }));
    sendMessage.mockRejectedValue(
      new Error('network down'),
    );
    const deps = makeDeps();

    await callFetchData('oops', deps);

    expect(deps.setDataEnd).not.toHaveBeenCalled();
    expect(deps.onUntranslatable).toHaveBeenCalledTimes(1);
    expect(deps.markUntranslatable).toHaveBeenCalledWith(
      'oops',
    );
  });

  it(// 已记住（isDeleted）的词：保持现状——展示"该单词已被删除"文案，不发起网络请求，
  // 不触发 onUntranslatable/markUntranslatable
  'keeps showing the memorized-word message for isDeleted words without any network call', async () => {
    queryWord.mockResolvedValue(
      makeWord({ word: 'memorized', isDeleted: true }),
    );
    const deps = makeDeps();

    await callFetchData('memorized', deps, 'stored');

    expect(deps.setDataEnd).toHaveBeenCalledWith(
      '该单词已被删除，不再显示翻译',
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deps.onUntranslatable).not.toHaveBeenCalled();
    expect(deps.markUntranslatable).not.toHaveBeenCalled();
  });

  it(// selection 模式下即使没有走 isDeleted 判断分支也能正常查到并展示释义（回归测试）
  'resolves a definition normally in selection mode', async () => {
    queryWord.mockResolvedValue(makeWord({ word: 'is' }));
    sendMessage.mockResolvedValue(
      '<div id="clientnewword" data-definition="verb form"></div>',
    );
    const deps = makeDeps();

    await callFetchData('is', deps, 'selection');

    expect(deps.setDataEnd).toHaveBeenCalledWith(
      'verb form',
    );
  });

  it(// 冷却重试后成功查到释义：应清除 isUntranslatable 标记，恢复该词的正常高亮/弹窗（#140）
  'clears the untranslatable flag on a successful retry', async () => {
    queryWord.mockResolvedValue(
      makeWord({
        word: 'zzz',
        isUntranslatable: true,
        lastAttemptAt: 1,
      }),
    );
    sendMessage.mockResolvedValue(
      '<div id="clientnewword" data-definition="now translatable"></div>',
    );
    const deps = makeDeps();

    await callFetchData('zzz', deps);

    expect(deps.setDataEnd).toHaveBeenCalledWith(
      'now translatable',
    );
    expect(deps.clearUntranslatable).toHaveBeenCalledWith(
      'zzz',
    );
  });

  it(// 命中缓存时直接用缓存数据展示，不发起网络请求，也不触发 onUntranslatable（回归测试）
  'uses the cache without making a network request', async () => {
    queryWord.mockResolvedValue(
      makeWord({ word: 'cached' }),
    );
    const deps = makeDeps();
    deps.translationCache.set('cached', {
      data: 'cached definition',
      timestamp: Date.now(),
    });

    await callFetchData('cached', deps);

    expect(deps.setDataEnd).toHaveBeenCalledWith(
      'cached definition',
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(deps.onUntranslatable).not.toHaveBeenCalled();
  });
});
