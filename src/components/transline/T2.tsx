import type React from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { queryWord } from '@/src/core/storageManager';
import HoverTooltip from './HoverTooltip';

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
  setTooltipPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >,
  isPanelHovered: React.MutableRefObject<boolean>,
) {
  const timeoutId = useRef<number | null>(null);
  const hoverTimeoutId = useRef<number | null>(null);

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
          x: event.clientX,
          y: event.clientY,
        });

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
    },
    [
      hasTriggered,
      isDeleted,
      setIsHovered,
      setHasTriggered,
      setTooltipPosition,
    ],
  );

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

// 拆分出的自定义Hook：处理顶层tooltip管理
function useTopLevelTooltip(
  isHovered: boolean,
  lowerCaseWord: string,
  tooltipPosition: { x: number; y: number },
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>,
  setHasTriggered: React.Dispatch<React.SetStateAction<boolean>>
) {
  const tooltipRootRef = useRef<HTMLDivElement | null>(
    null,
  );
  const isPanelHovered = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHovered) {
      // 创建顶层tooltip容器
      let tooltipContainer = document.getElementById(
        'word-tooltip-container',
      );
      if (!tooltipContainer) {
        tooltipContainer = document.createElement('div');
        tooltipContainer.id = 'word-tooltip-container';
        document.body.appendChild(tooltipContainer);
      }

      // 创建tooltip根元素
      tooltipRootRef.current =
        document.createElement('div');
      tooltipRootRef.current.style.position = 'absolute';
      // 将面板定位在鼠标的正下方（居中对齐）
      tooltipRootRef.current.style.left = `${tooltipPosition.x - 150}px`; // 300px宽度的一半
      tooltipRootRef.current.style.top = `${tooltipPosition.y + 10}px`; // 鼠标下方10px
      tooltipRootRef.current.style.zIndex = '10000';
      
      // 添加鼠标事件监听器到面板
      const handlePanelMouseEnter = () => {
        isPanelHovered.current = true;
        // 清除可能正在等待隐藏面板的定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      };
      
      const handlePanelMouseLeave = () => {
        isPanelHovered.current = false;
        // 延迟隐藏面板，给用户一点时间将鼠标移回单词上
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = window.setTimeout(() => {
          if (!isPanelHovered.current) {
            setIsHovered(false);
            setHasTriggered(false);
          }
        }, 300);
      };
      
      tooltipRootRef.current.addEventListener('mouseenter', handlePanelMouseEnter);
      tooltipRootRef.current.addEventListener('mouseleave', handlePanelMouseLeave);

      tooltipContainer.appendChild(tooltipRootRef.current);

      // 渲染tooltip
      const root = createRoot(tooltipRootRef.current);
      root.render(<HoverTooltip word={lowerCaseWord} />);
    } else {
      // 卸载tooltip
      if (tooltipRootRef.current) {
        // 清除隐藏定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        
        // 移除事件监听器
        tooltipRootRef.current.removeEventListener('mouseenter', () => {});
        tooltipRootRef.current.removeEventListener('mouseleave', () => {});
        
        const root = createRoot(tooltipRootRef.current);
        root.unmount();
        tooltipRootRef.current.remove();
        tooltipRootRef.current = null;
      }
    }

    return () => {
      // 清理函数
      if (tooltipRootRef.current) {
        // 清除隐藏定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        
        // 移除事件监听器
        tooltipRootRef.current.removeEventListener('mouseenter', () => {});
        tooltipRootRef.current.removeEventListener('mouseleave', () => {});
        
        const root = createRoot(tooltipRootRef.current);
        root.unmount();
        tooltipRootRef.current.remove();
      }
    };
  }, [isHovered, lowerCaseWord, tooltipPosition, setIsHovered, setHasTriggered]);

  return { tooltipRootRef, isPanelHovered };
}

function WordHighlighter({
  originalWord,
  lowerCaseWord,
}: WordHighlighterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [hasTriggered, setHasTriggered] = useState(false);

  // 使用拆分后的自定义Hook
  const { isDeleted, setIsDeleted } =
    useWordStatus(lowerCaseWord);
  useDeleteEventListener(
    lowerCaseWord,
    setIsDeleted,
    setIsHovered,
    setHasTriggered,
  );
  const { tooltipRootRef, isPanelHovered } = useTopLevelTooltip(
    isHovered,
    lowerCaseWord,
    tooltipPosition,
    setIsHovered,
    setHasTriggered
  );
  const { handleMouseEnter, handleMouseLeave } =
    useMouseEvents(
      isDeleted,
      hasTriggered,
      setIsHovered,
      setHasTriggered,
      setTooltipPosition,
      isPanelHovered,
    );

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
