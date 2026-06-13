import type React from 'react';
import type { IWordStorage } from '@/src/core/types';
import { HAND_FONT, type Theme } from './tooltipTheme';

const surfacePadding = '20px 20px 18px';

const actionButtonStyle: React.CSSProperties = {
  borderRadius: '999px',
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: HAND_FONT,
};

/**
 * Loading state for the translation card.
 */
export function LoadingPanel({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        padding: '30px 22px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: theme.accent,
          marginBottom: '10px',
        }}
      >
        Translating
      </div>
      <div style={{ color: theme.sub }}>
        正在获取释义...
      </div>
    </div>
  );
}

/**
 * Resolved state for the translation card.
 */
export function LoadedPanel({
  word,
  dataEnd,
  wordLocalInfoOuter,
  handleDeleteWord,
  mode,
  theme,
}: {
  word: string;
  dataEnd: string;
  wordLocalInfoOuter?: IWordStorage;
  handleDeleteWord: () => void;
  mode: 'stored' | 'selection';
  theme: Theme;
}) {
  const isSelectionMode = mode === 'selection';
  const isSavedSelection =
    isSelectionMode &&
    wordLocalInfoOuter !== undefined &&
    !wordLocalInfoOuter.isDeleted;

  return (
    <div style={{ padding: surfacePadding }}>
      <div
        style={{
          marginBottom: '12px',
          paddingRight: '72px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.accent,
            marginBottom: '6px',
          }}
        >
          {isSelectionMode ? 'Selected Word' : 'Saved Word'}
        </div>
        <h1
          style={{
            margin: 0,
            color: theme.ink,
            fontSize: '28px',
            lineHeight: '1.1',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {word}
        </h1>
      </div>

      <div
        style={{
          height: '0',
          borderTop: `2px dashed ${theme.divider}`,
        }}
      />

      <p
        className='break-words'
        style={{
          margin: '16px 0',
          color: theme.ink,
          whiteSpace: 'pre-line',
          fontSize: '15px',
        }}
      >
        {dataEnd}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingTop: '14px',
          borderTop: `2px dashed ${theme.divider}`,
        }}
      >
        {isSelectionMode ? (
          <span
            style={{ fontSize: '12px', color: theme.sub }}
          >
            {isSavedSelection
              ? '已加入词库，页面中同词会保持高亮可查。'
              : '未加入词库，页面不会高亮该词。'}
          </span>
        ) : (
          <span
            style={{ color: theme.sub, fontSize: '12px' }}
          >
            查询次数:
            <span
              style={{
                marginLeft: '8px',
                display: 'inline-block',
                minWidth: '28px',
                textAlign: 'center',
                borderRadius: '999px',
                background: theme.chipBg,
                color: theme.chipText,
                padding: '2px 8px',
                fontWeight: 800,
              }}
            >
              {wordLocalInfoOuter?.queryTimes ?? 0}
            </span>
          </span>
        )}

        {isSelectionMode ? (
          <span
            style={{
              borderRadius: '999px',
              background: theme.chipBg,
              color: theme.chipText,
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            {isSavedSelection ? '已加入词库' : '未收录'}
          </span>
        ) : (
          <button
            type='button'
            onClick={handleDeleteWord}
            title='删除单词（不再查询该单词）'
            style={{
              ...actionButtonStyle,
              border: `2px solid ${theme.dangerText}`,
              background: theme.dangerBg,
              color: theme.dangerText,
            }}
          >
            移除单词
          </button>
        )}
      </div>
    </div>
  );
}
