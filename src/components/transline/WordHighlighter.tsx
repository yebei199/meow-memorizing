import React from 'react';
import HoverTooltip from './HoverTooltip';
import { TimerManager } from './TimerManager';
import type {
  WordHighlighterProps,
  WordHighlighterState,
} from './WordHighlighter.types';

export default class WordHighlighter extends React.Component<
  WordHighlighterProps,
  WordHighlighterState
> {
  private timerManager: TimerManager;

  constructor(props: WordHighlighterProps) {
    super(props);
    this.state = {
      tooltipPosition: { x: 0, y: 0 },
      isHovered: false,
      hasTriggered: false,
    };

    this.timerManager = new TimerManager();
  }

  handleMouseEnter = (): void => {
    // 清除隐藏定时器
    this.timerManager.clearTimer('hideTooltip');

    // 如果已经显示，则直接返回
    if (this.state.isHovered) {
      return;
    }

    // 添加延迟显示，避免快速移动鼠标时的闪烁
    this.timerManager.setTimer(
      'showTooltip',
      () => {
        this.setState({
          isHovered: true,
          hasTriggered: true,
        });
      },
      300,
    );
  };

  handleMouseLeave = (): void => {
    // 清除显示定时器
    this.timerManager.clearTimer('showTooltip');

    // 延迟隐藏，避免快速移动鼠标时的闪烁
    this.timerManager.setTimer(
      'hideTooltip',
      () => {
        this.setState({
          isHovered: false,
          hasTriggered: false,
        });
      },
      300,
    );
  };

  componentWillUnmount(): void {
    this.timerManager.clearAllTimers();
  }

  render() {
    const { originalWord, lowerCaseWord } = this.props;
    const { isHovered } = this.state;

    return (
      <button
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
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
            position: 'relative',
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
          {isHovered && (
            <HoverTooltip
              word={lowerCaseWord}
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '4px',
                zIndex: 1000,
              }}
            />
          )}
        </span>
      </button>
    );
  }
}
