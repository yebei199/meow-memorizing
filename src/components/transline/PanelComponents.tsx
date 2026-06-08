import type React from 'react'
import type { IWordStorage } from '@/src/core/types'

const surfaceStyle: React.CSSProperties = {
  position: 'relative',
  padding: '18px 18px 16px',
  background:
    'radial-gradient(circle at top left, rgba(255,255,255,0.94), transparent 42%), linear-gradient(180deg, rgba(255,252,245,0.98), rgba(255,244,226,0.95))',
}

const actionButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(191, 122, 41, 0.12)',
  borderRadius: '999px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}

/**
 * Loading state for the translation card.
 */
export function LoadingPanel() {
  return (
    <div style={{ ...surfaceStyle, textAlign: 'center', padding: '28px 20px' }}>
      <div
        style={{
          fontSize: '12px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#b77b35',
          marginBottom: '10px',
        }}
      >
        Translating
      </div>
      <div style={{ color: '#4b3a24' }}>正在获取释义...</div>
    </div>
  )
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
  onClose,
}: {
  word: string
  dataEnd: string
  wordLocalInfoOuter?: IWordStorage
  handleDeleteWord: () => void
  mode: 'stored' | 'selection'
  onClose?: () => void
}) {
  const isSelectionMode = mode === 'selection'

  return (
    <div style={surfaceStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#b77b35',
              marginBottom: '6px',
            }}
          >
            {isSelectionMode ? 'Selected Word' : 'Saved Word'}
          </div>
          <h1
            style={{
              margin: 0,
              color: '#2c2015',
              fontSize: '28px',
              lineHeight: '1.1',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            {word}
          </h1>
        </div>

        <button
          type='button'
          aria-label='关闭翻译卡片'
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(191, 122, 41, 0.14)',
            background: 'rgba(255, 255, 255, 0.7)',
            color: '#8f5c1d',
            fontSize: '18px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, rgba(255,179,71,0), rgba(255,179,71,0.65), rgba(255,179,71,0))',
        }}
      />

      <p
        className='break-words'
        style={{
          margin: '16px 0',
          color: '#44311e',
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
          borderTop: '1px solid rgba(191, 122, 41, 0.12)',
        }}
      >
        {isSelectionMode ? (
          <span style={{ fontSize: '12px', color: '#6d5436' }}>
            已加入词库，页面中同词会保持高亮可查。
          </span>
        ) : (
          <span style={{ color: '#6d5436', fontSize: '12px' }}>
            查询次数:
            <span
              style={{
                marginLeft: '8px',
                display: 'inline-block',
                minWidth: '28px',
                textAlign: 'center',
                borderRadius: '999px',
                background: '#ffe6b3',
                color: '#9b5f12',
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
              background: '#ffe6b3',
              color: '#9b5f12',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            已加入词库
          </span>
        ) : (
          <button
            type='button'
            onClick={handleDeleteWord}
            title='删除单词（不再查询该单词）'
            style={{
              ...actionButtonStyle,
              background: 'rgba(255, 92, 92, 0.1)',
              color: '#c43d3d',
            }}
          >
            移除单词
          </button>
        )}
      </div>
    </div>
  )
}
