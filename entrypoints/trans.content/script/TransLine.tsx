import classNames from 'classnames';
import type React from 'react';
import {
  type ReactElement,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import ergodicWords from '@/entrypoints/trans.content/script/ergodicWords.tsx';
import { sendMessage } from '@/src/wxtMessaging.ts';
import type { IWordStorage } from '@/src/wxtStore.ts';
import {
  addWordLocal,
  queryWord,
} from './storageAction.ts';

/**
 * @description 对于每个单词的翻译准备以及鼠标悬停时显示额外内容的组件
 * @param word 单词
 * @example <TransLine word={'hello'} />
 */
export default function TransLine({
  word,
}: {
  word: string;
}) {
  return (
    <div className={'inline'}>
      <T2 word={word} />
    </div>
  );
}

/*
 * @description 组合悬停前和后两个组件,逻辑是鼠标悬停时显示额外内容,
 * 当鼠标离开的时候悬停组件卸载,这样性能更好
 * @param word 单词
 * @example <T2 word={'hello'} />
 *
 */

function T2({ word }: { word: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [hasTriggered, setHasTriggered] = useState(false); // 新增的状态，用于跟踪是否已经触发过 mouseenter 事件
  const timeoutId = useRef<number | null>(null); // 用于存储 setTimeout 的 ID

  function handleMouseEnter(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ): void {
    if (!hasTriggered) {
      setTooltipPosition({
        x: event.pageX,
        y: event.pageY,
      });
      setIsHovered(true);
      setHasTriggered(true); // 设置为已触发状态
    }
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
  }

  const handleMouseLeave = () => {
    // 延迟卸载,避免闪烁
    timeoutId.current = window.setTimeout(() => {
      setIsHovered(false);
      setHasTriggered(false); // 重置触发状态，以便下次可以重新触发
    }, 500);
  };

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
      }}
      type="button"
    >
      <span
        className={classNames(
          'font-mono',
          'relative',
        )}
      >
        {word}
        <span
          style={{
            position: 'absolute',
            bottom: '-2px',
            left: 0,
            width: '100%',
            height: '4px',
            background: 'linear-gradient(90deg, #FF8C00, #FFA500, #FF8C00)',
            borderRadius: '2px',
          }}
        />
      </span>
      <TooltipPortal isVisible={isHovered}>
        {
          <HoverTooltip
            word={word}
            x={tooltipPosition?.x}
            y={tooltipPosition?.y}
          />
        }
      </TooltipPortal>
    </button>
  );
}

export interface IWordQuery {
  word: string;
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

  useEffect(() => {
    async function fetchData() {
      const wordLocalInfo = await queryWord(word3);
      if (!wordLocalInfo) return;

      const word: IWordQuery = { word: word3 };
      const htmlString = await sendMessage('trans', word);
      const element = parseBingDict(htmlString);
      if (element) {
        setDataEnd(element);
      } else {
        const updatedWordInfo = {
          ...wordLocalInfo,
          isDeleted: true,
          deleteTimes: wordLocalInfo?.deleteTimes + 1,
        };
        await addWordLocal(updatedWordInfo); // 假设这个函数会更新服务器或本地存储
        await ergodicWords();
        return;
      }

      if (wordLocalInfo) {
        wordLocalInfo.queryTimes += 1;
        setWordLocalInfoOuter(wordLocalInfo);
        await addWordLocal(wordLocalInfo);
      }
    }
    fetchData().catch(console.error);

    return () => {};
  }, [word3]);

  async function deleteWord() {
    if (wordLocalInfoOuter) {
      // 复制对象以避免直接修改状态
      const updatedWordInfo = {
        ...wordLocalInfoOuter,
        isDeleted: true,
        deleteTimes: wordLocalInfoOuter.deleteTimes + 1,
      };
      await addWordLocal(updatedWordInfo); // 假设这个函数会更新服务器或本地存储
      setWordLocalInfoOuter(updatedWordInfo); // 更新组件状态
      await ergodicWords();
    }
  }
  return (
    <div
      className={classNames(
        'position-absolute overflow-auto z-99',
        'w-90 h-auto',
        'rounded-2xl p-6',
      )}
      style={{
        left: `${x - 70}px`,
        top: `${y + 30}px`,
        background: 'rgba(255, 255, 255, 0.01)', // 进一步提高透明度
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '18px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        maxWidth: '400px',
        fontFamily: 'inherit',
      }}
    >
      {/* 这里是悬停时显示的额外内容 */}
      <h1 className='text-center text-xl font-bold mb-3' style={{ color: 'inherit', fontFamily: 'inherit', textShadow: '0 1px 1px rgba(255, 255, 255, 0.3)' }}>{word}</h1>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <p className='break-words my-4' style={{ color: 'inherit', fontFamily: 'inherit' }}>{dataEnd}</p>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <span className='flex justify-between items-center'>
        <span style={{ color: 'inherit' }}>
          查询次数:
          <span className='inline break-words ml-2 font-semibold'>
            {wordLocalInfoOuter?.queryTimes}
          </span>
        </span>
        {/* 删除按钮改为右上角红色"x" */}
      </span>
      <button
        type='button'
        className={classNames(
          'absolute',
          'top-2',
          'right-2',
          'w-6',
          'h-6',
          'flex',
          'items-center',
          'justify-center',
          'rounded-full',
          'text-red-500',
          'font-bold',
          'transition-all',
          'hover:bg-red-100'
        )}
        onClick={deleteWord}
        title="删除单词"
        style={{
          background: 'transparent',
        }}
      >
        ×
      </button>
    </div>
  );
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
    return null;
  }

  return element;
}

// 创建一个 Portal 组件
export const TooltipPortal = ({
  children,
  isVisible,
}: {
  children: ReactElement;
  isVisible: boolean;
}) => {
  if (!isVisible) return null;

  return createPortal(
    children,
    document.body, // 或者任何其他的 DOM 元素
  );
};


