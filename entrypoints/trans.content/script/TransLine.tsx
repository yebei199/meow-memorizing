import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { processPageWords } from '@/entrypoints/trans.content/script/ergodicWords';
import { sendMessage } from '@/src/core/messaging';
import {
  addWordLocal,
  queryWord,
} from '@/src/core/storageManager';
import type { IWordStorage } from '@/src/core/types';
import {
  addQueriedWord,
  deleteWord,
} from '@/src/core/wordProcessor';

// 创建翻译缓存，直接使用对象类型避免额外的接口定义
const translationCache = new Map<
  string,
  { data: string; timestamp: number }
>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存时间

/**
 * 检查并使用缓存数据
 */
function checkAndUseCache(
  word: string,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
): { data: string; timestamp: number } | undefined {
  const cachedEntry = translationCache.get(word);
  if (
    cachedEntry &&
    Date.now() - cachedEntry.timestamp < CACHE_EXPIRY
  ) {
    return cachedEntry;
  } else if (cachedEntry) {
    // 缓存过期，删除它
    translationCache.delete(word);
  }
  return undefined;
}

/**
 * @description 对于每个单词的翻译准备以及鼠标悬停时显示额外内容的组件
 * @param originalWord 原始格式的单词（保持原有大小写）
 * @param lowerCaseWord 小写格式的单词（用于查询）
 * @example <TransLine originalWord={'Hello'} lowerCaseWord={'hello'} />
 */
export default function TransLine({
  originalWord,
  lowerCaseWord,
}: {
  originalWord: string;
  lowerCaseWord: string;
}) {
  return (
    <p
      className='inline m-0 p-0 border-0 bg-transparent text-inherit font-inherit'
      style={{
        display: 'inline',
        margin: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        position: 'relative',
      }}
    >
      <T2
        originalWord={originalWord}
        lowerCaseWord={lowerCaseWord}
      />
    </p>
  );
}

/*
 * @description 组合悬停前和后两个组件,逻辑是鼠标悬停时显示额外内容,
 * 当鼠标离开的时候悬停组件卸载,这样性能更好
 * @param originalWord 原始格式的单词（保持原有大小写）
 * @param lowerCaseWord 小写格式的单词（用于查询）
 * @example <T2 originalWord={'Hello'} lowerCaseWord={'hello'} />
 *
 */
function T2({
  originalWord,
  lowerCaseWord,
}: {
  originalWord: string;
  lowerCaseWord: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [hasTriggered, setHasTriggered] = useState(false); // 新增的状态，用于跟踪是否已经触发过 mouseenter 事件
  const timeoutId = useRef<number | null>(null); // 用于存储 setTimeout 的 ID
  const hoverTimeoutId = useRef<number | null>(null); // 用于存储悬停显示的 setTimeout ID

  const handleMouseEnter = useCallback(
    (
      event: React.MouseEvent<
        HTMLButtonElement,
        MouseEvent
      >,
    ): void => {
      if (!hasTriggered) {
        setTooltipPosition({
          x: event.pageX,
          y: event.pageY,
        });

        // 添加延迟显示，避免快速移动鼠标时的闪烁
        hoverTimeoutId.current = window.setTimeout(() => {
          setIsHovered(true);
          setHasTriggered(true);
        }, 300);
      }

      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    },
    [hasTriggered],
  );

  const handleMouseLeave = useCallback(() => {
    // 清除悬停显示的定时器
    if (hoverTimeoutId.current) {
      clearTimeout(hoverTimeoutId.current);
    }

    // 延迟卸载,避免闪烁
    timeoutId.current = window.setTimeout(() => {
      setIsHovered(false);
      setHasTriggered(false); // 重置触发状态，以便下次可以重新触发
    }, 300);
  }, []);

  // 使用useMemo优化组件渲染
  const tooltipComponent = useMemo(() => {
    return isHovered ? (
      <HoverTooltip
        word={lowerCaseWord}
        x={tooltipPosition.x}
        y={tooltipPosition.y}
      />
    ) : null;
  }, [
    isHovered,
    lowerCaseWord,
    tooltipPosition.x,
    tooltipPosition.y,
  ]);

  useEffect(() => {
    // 清理定时器
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      if (hoverTimeoutId.current) {
        clearTimeout(hoverTimeoutId.current);
      }
    };
  }, []);

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        color: 'inherit',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        cursor: 'pointer',
        position: 'relative',
        display: 'inline', // 确保表现为内联元素
        verticalAlign: 'baseline', // 保持基线对齐
      }}
      type='button'
    >
      <span
        className='relative'
        style={{
          display: 'inline-block',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        {originalWord}
        <span
          style={{
            position: 'absolute',
            bottom: '-2px',
            left: 0,
            width: '100%',
            height: '4px',
            background:
              'linear-gradient(90deg, #FF8C00, #FFA500, #FF8C00)',
            borderRadius: '2px',
          }}
        />
      </span>
      {tooltipComponent}
    </button>
  );
}

/**
 * @description 鼠标悬停时显示额外内容
 * 逻辑是先发送消息到后台,然后后台返回html片段,最后将html片段渲染出来
 * @param word 单词
 * @example <HoverTooltip word={'hello'} />
 */
function HoverTooltip({
  word,
  x,
  y,
}: {
  word: string;
  x: number;
  y: number;
}) {
  const word3 = word;
  const [wordLocalInfoOuter, setWordLocalInfoOuter] =
    useState<IWordStorage>();
  const [dataEnd, setDataEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const handleDeleteWord = useCallback(async () => {
    if (wordLocalInfoOuter) {
      await deleteWord(wordLocalInfoOuter.word);
      setWordLocalInfoOuter({
        ...wordLocalInfoOuter,
        isDeleted: true,
        deleteTimes: wordLocalInfoOuter.deleteTimes + 1,
      });
      await processPageWords();
    }
  }, [wordLocalInfoOuter]);

  const handleAddQuery = useCallback(async () => {
    if (wordLocalInfoOuter) {
      await addQueriedWord(wordLocalInfoOuter.word);
      setWordLocalInfoOuter({
        ...wordLocalInfoOuter,
        queryTimes: wordLocalInfoOuter.queryTimes + 1,
      });
    }
  }, [wordLocalInfoOuter]);

  useEffect(() => {
    fetchData(
      word3,
      setDataEnd,
      setLoading,
      setWordLocalInfoOuter,
      addWordLocal,
      deleteWord,
      processPageWords,
      translationCache,
      CACHE_EXPIRY,
    ).catch(console.error);

    return () => {};
  }, [word3]);

  // 面板内容组件
  const panelContent = useMemo(() => {
    if (loading) {
      return <LoadingPanel />;
    }

    return (
      <LoadedPanel
        word={word}
        dataEnd={dataEnd}
        wordLocalInfoOuter={wordLocalInfoOuter}
        handleAddQuery={handleAddQuery}
        handleDeleteWord={handleDeleteWord}
      />
    );
  }, [
    loading,
    word,
    dataEnd,
    wordLocalInfoOuter,
    handleAddQuery,
    handleDeleteWord,
  ]);

  return (
    <div
      className={
        'position-absolute overflow-auto z-99 w-90 h-auto rounded-2xl p-6'
      }
      style={{
        position: 'fixed',
        left: `${x - 70}px`,
        top: `${y + 30}px`,
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '18px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        maxWidth: '400px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.4',
        zIndex: 9999,
      }}
    >
      {panelContent}
      <button
        type='button'
        className={
          'absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-red-500 font-bold transition-all hover:bg-red-100'
        }
        onClick={handleDeleteWord}
        title='删除单词'
        style={{
          background: 'transparent',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          margin: '0',
        }}
      >
        ×
      </button>
    </div>
  );
}

/**
 * 获取单词信息并处理缓存检查
 */
async function fetchData(
  word: string,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
  deleteWord: (word: string) => Promise<void>,
  processPageWords: () => Promise<void>,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
) {
  const wordLocalInfo = await queryWord(word);
  if (!wordLocalInfo) return;

  // 先检查缓存
  const cachedResult = await handleCachedData(
    word,
    wordLocalInfo,
    translationCache,
    CACHE_EXPIRY,
    setDataEnd,
    setLoading,
    setWordLocalInfoOuter,
    addWordLocal,
  );

  if (cachedResult) return;

  // 缓存未命中或过期，从网络获取数据
  await fetchAndProcessNetworkData(
    word,
    setDataEnd,
    setLoading,
    wordLocalInfo,
    setWordLocalInfoOuter,
    addWordLocal,
    deleteWord,
    processPageWords,
    translationCache,
  );
}

/**
 * 处理缓存数据
 */
async function handleCachedData(
  word: string,
  wordLocalInfo: any,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
  CACHE_EXPIRY: number,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
): Promise<boolean> {
  const cachedEntry = checkAndUseCache(
    word,
    translationCache,
    CACHE_EXPIRY,
  );
  if (cachedEntry) {
    setDataEnd(cachedEntry.data);
    setLoading(false);

    // 更新查询次数
    if (wordLocalInfo) {
      wordLocalInfo.queryTimes += 1;
      setWordLocalInfoOuter(wordLocalInfo);
      await addWordLocal(wordLocalInfo);
    }
    return true;
  }
  return false;
}

/**
 * 从网络获取并处理数据
 */
async function fetchAndProcessNetworkData(
  word: string,
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  wordLocalInfo: any,
  setWordLocalInfoOuter: (info: any) => void,
  addWordLocal: (info: any) => Promise<void>,
  deleteWord: (word: string) => Promise<void>,
  processPageWords: () => Promise<void>,
  translationCache: Map<
    string,
    { data: string; timestamp: number }
  >,
) {
  try {
    const htmlString = await sendMessage('trans', { word });
    const element = parseBingDict(htmlString);
    if (element) {
      // 缓存结果
      const cacheEntry = {
        data: element,
        timestamp: Date.now(),
      };
      translationCache.set(word, cacheEntry);
      setDataEnd(element);
    } else {
      await deleteWord(word);
      await processPageWords();
      setDataEnd('未找到翻译');
    }
  } catch (error) {
    console.error('获取翻译失败:', error);
    setDataEnd('获取翻译失败');
  } finally {
    setLoading(false);
  }

  if (wordLocalInfo) {
    wordLocalInfo.queryTimes += 1;
    setWordLocalInfoOuter(wordLocalInfo);
    await addWordLocal(wordLocalInfo);
  }
}

/**
 * 解析html字符串
 */
function parseBingDict(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    htmlString,
    'text/html',
  );

  const element = doc
    .querySelector('#clientnewword')
    ?.getAttribute('data-definition');

  if (!element) {
    return '没找到';
  }

  // 使用通用正则表达式匹配词性格式（字母加点的模式）
  // 在每个词性前添加换行（除了第一个）
  return element.replace(
    /(\s)([a-zA-Z]+\.)(?=\s)/g,
    '$1\n$2',
  );
}

// 加载中面板组件
function LoadingPanel() {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      加载中...
    </div>
  );
}

// 已加载面板组件
function LoadedPanel({
  word,
  dataEnd,
  wordLocalInfoOuter,
  handleAddQuery,
  handleDeleteWord,
}: {
  word: string;
  dataEnd: string;
  wordLocalInfoOuter?: IWordStorage;
  handleAddQuery: () => void;
  handleDeleteWord: () => void;
}) {
  return (
    <>
      <h1
        className={'text-center text-xl font-bold mb-3'}
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          textShadow: '0 1px 1px rgba(255, 255, 255, 0.3)',
        }}
      >
        {word}
      </h1>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <p
        className={'break-words my-4'}
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          whiteSpace: 'pre-line',
        }}
      >
        {dataEnd}
      </p>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <span className='flex justify-between items-center'>
        <span style={{ color: 'inherit' }}>
          查询次数:
          <span className='inline break-words ml-2 font-semibold'>
            {wordLocalInfoOuter?.queryTimes}
          </span>
        </span>
      </span>
      <div className='flex justify-between mt-2'>
        <button
          type='button'
          className={
            'px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600'
          }
          onClick={handleAddQuery}
          title='增加查询次数'
        >
          +1 查询
        </button>
        <button
          type='button'
          className={
            'px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600'
          }
          onClick={handleDeleteWord}
          title='删除单词'
        >
          删除单词
        </button>
      </div>
    </>
  );
}
