import type React from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { queryWord } from '@/src/core/storageManager';
import {
  dismissTooltip,
  showTooltip,
} from '@/src/content-scripts/tooltipManager';

interface WordHighlighterProps {
  originalWord: string;
  lowerCaseWord: string;
}

// 拆分出的自定义Hook：处理单词状态检查
function useWordStatus(lowerCaseWord: string) {
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const checkWordStatus = async () => {
      const wordInfo = await queryWord(lowerCaseWord);
      if (wordInfo?.isDeleted) {
        setIsDeleted(true);
      }
    };

    checkWordStatus();
  }, [lowerCaseWord]);

  return { isDeleted, setIsDeleted };
}

// 拆分出的自定义Hook：处理删除事件监听
function useDeleteEventListener(
  lowerCaseWord: string,
  setIsDeleted: React.Dispatch<
    React.SetStateAction<boolean>
  >,
  setIsHovered: React.Dispatch<
    React.SetStateAction<boolean>
  >,
  setHasTriggered: React.Dispatch<
    React.SetStateAction<boolean>
  >,
) {
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
  }, [
    lowerCaseWord,
    setIsDeleted,
    setIsHovered,
    setHasTriggered,
  ]);
}

// 拆分出的自定义Hook：处理鼠标事件
function useMouseEvents(
  isDeleted: boolean,
  hasTriggered: boolean,
  setIsHovered: React.Dispatch<
    React.SetStateAction<boolean>
  >,
  setHasTriggered: React.Dispatch<
    React.SetStateAction<boolean>
  >,
  isPanelHovered: React.MutableRefObject<boolean>,
) {
  const timeoutId = useRef<number | null>(null);
  const hoverTimeoutId = useRef<number | null>(null);

  const handleMouseEnter = useCallback((): void => {
    // 如果单词已被删除，则不显示tooltip
    if (isDeleted) return;

    if (!hasTriggered) {
      hoverTimeoutId.current = window.setTimeout(() => {
        setIsHovered(true);
        setHasTriggered(true);
      }, 300);
    }

    // 清除隐藏面板的定时器
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
  }, [hasTriggered, isDeleted, setIsHovered, setHasTriggered]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutId.current) {
      clearTimeout(hoverTimeoutId.current);
      hoverTimeoutId.current = null;
    }

    // 设置延迟隐藏面板，但允许面板上的鼠标事件取消隐藏
    timeoutId.current = window.setTimeout(() => {
      // 只有当鼠标不在面板上时才隐藏
      if (!isPanelHovered.current) {
        setIsHovered(false);
        setHasTriggered(false);
      }
    }, 300);
  }, [setIsHovered, setHasTriggered, isPanelHovered]);

  // 清理定时器
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

  return { handleMouseEnter, handleMouseLeave };
}

// 拆分出的自定义Hook：通过全局单例管理器显示/隐藏tooltip。
// 面板锚定到单词元素本身，滚动时跟随；任意时刻全局只有一个tooltip。
function useTopLevelTooltip(
  isHovered: boolean,
  lowerCaseWord: string,
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>,
  setHasTriggered: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const isPanelHovered = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const tokenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isHovered) {
      if (tokenRef.current !== null) {
        dismissTooltip(tokenRef.current);
        tokenRef.current = null;
      }
      return;
    }

    const reset = () => {
      setIsHovered(false);
      setHasTriggered(false);
    };

    tokenRef.current = showTooltip({
      word: lowerCaseWord,
      mode: 'stored',
      follow: true,
      anchorRect: () =>
        anchorRef.current?.getBoundingClientRect() ?? null,
      onDismiss: reset,
      onHostPointerEnter: () => {
        isPanelHovered.current = true;
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      },
      onHostPointerLeave: () => {
        isPanelHovered.current = false;
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        // 延迟隐藏，给用户时间把鼠标移回单词上
        hideTimeoutRef.current = window.setTimeout(() => {
          if (!isPanelHovered.current) reset();
        }, 300);
      },
    });

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      if (tokenRef.current !== null) {
        dismissTooltip(tokenRef.current);
        tokenRef.current = null;
      }
    };
  }, [
    isHovered,
    lowerCaseWord,
    anchorRef,
    setIsHovered,
    setHasTriggered,
  ]);

  return { isPanelHovered };
}

function WordHighlighter({
  originalWord,
  lowerCaseWord,
}: WordHighlighterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  // 使用拆分后的自定义Hook
  const { isDeleted, setIsDeleted } =
    useWordStatus(lowerCaseWord);
  useDeleteEventListener(
    lowerCaseWord,
    setIsDeleted,
    setIsHovered,
    setHasTriggered,
  );
  const { isPanelHovered } = useTopLevelTooltip(
    isHovered,
    lowerCaseWord,
    anchorRef,
    setIsHovered,
    setHasTriggered,
  );
  const { handleMouseEnter, handleMouseLeave } =
    useMouseEvents(
      isDeleted,
      hasTriggered,
      setIsHovered,
      setHasTriggered,
      isPanelHovered,
    );

  // 如果单词已被删除，渲染原始文本而不是带下划线的单词
  if (isDeleted) {
    return <span>{originalWord}</span>;
  }

  return (
    <button
      ref={anchorRef}
      data-meow-word-trigger='true'
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
