import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { queryWord } from '@/src/core/storageManager';
import HoverTooltip from './HoverTooltip';

interface WordHighlighterProps {
  originalWord: string;
  lowerCaseWord: string;
}

function WordHighlighter({
  originalWord,
  lowerCaseWord,
}: WordHighlighterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const timeoutId = useRef<number | null>(null);
  const hoverTimeoutId = useRef<number | null>(null);

  // 检查单词是否已被删除
  useEffect(() => {
    const checkWordStatus = async () => {
      const wordInfo = await queryWord(lowerCaseWord);
      if (wordInfo && wordInfo.isDeleted) {
        setIsDeleted(true);
      }
    };

    checkWordStatus();
  }, [lowerCaseWord]);

  // 监听删除事件
  useEffect(() => {
    const handleDelete = (event: CustomEvent) => {
      if (event.detail === lowerCaseWord) {
        // 单词被删除，隐藏tooltip并标记为已删除
        setIsHovered(false);
        setHasTriggered(false);
        setIsDeleted(true);
      }
    };

    window.addEventListener(
      'deleteWord',
      handleDelete as EventListener,
    );
    return () => {
      window.removeEventListener(
        'deleteWord',
        handleDelete as EventListener,
      );
    };
  }, [lowerCaseWord]);

  const handleMouseEnter = useCallback(
    (
      event: React.MouseEvent<
        HTMLButtonElement,
        MouseEvent
      >,
    ): void => {
      // 如果单词已被删除，则不显示tooltip
      if (isDeleted) return;

      if (!hasTriggered) {
        setTooltipPosition({
          x: event.pageX,
          y: event.pageY,
        });

        hoverTimeoutId.current = window.setTimeout(() => {
          setIsHovered(true);
          setHasTriggered(true);
        }, 300);
      }

      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    },
    [hasTriggered, isDeleted],
  );

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutId.current) {
      clearTimeout(hoverTimeoutId.current);
    }

    timeoutId.current = window.setTimeout(() => {
      setIsHovered(false);
      setHasTriggered(false);
    }, 300);
  }, []);

  const tooltipComponent = useMemo(() => {
    return isHovered ? (
      <HoverTooltip word={lowerCaseWord} />
    ) : null;
  }, [isHovered, lowerCaseWord]);

  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      if (hoverTimeoutId.current) {
        clearTimeout(hoverTimeoutId.current);
      }
    };
  }, []);

  // 如果单词已被删除，渲染原始文本而不是带下划线的单词
  if (isDeleted) {
    return <span>{originalWord}</span>;
  }

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
        display: 'inline',
        verticalAlign: 'baseline',
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

/*
 * @description 组合悬停前和后两个组件,逻辑是鼠标悬停时显示额外内容,
 * 当鼠标离开的时候悬停组件卸载,这样性能更好
 * @param originalWord 原始格式的单词（保持原有大小写）
 * @param lowerCaseWord 小写格式的单词（用于查询）
 * @example <T2 originalWord={'Hello'} lowerCaseWord={'hello'} />
 *
 */

export default function T2({
  originalWord,
  lowerCaseWord,
}: {
  originalWord: string;
  lowerCaseWord: string;
}) {
  return (
    <WordHighlighter
      originalWord={originalWord}
      lowerCaseWord={lowerCaseWord}
    />
  );
}
