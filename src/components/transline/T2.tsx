import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import HoverTooltip from './HoverTooltip';

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