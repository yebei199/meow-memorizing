import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  addWordLocal,
} from '@/src/core/storageManager'
import type { IWordStorage } from '@/src/core/types'
import {
  deleteWord,
} from '@/src/core/wordProcessor'
import {
  LoadedPanel,
  LoadingPanel,
} from './PanelComponents'
import {
  HAND_FONT,
  SKETCH_RADIUS,
  type ThemeName,
  THEMES,
} from './tooltipTheme'
import {
  CACHE_EXPIRY,
  fetchData,
  translationCache,
} from './transUtils'
import { processPageWords } from '@/src/content-scripts/ergodicWords'

interface HoverTooltipProps {
  word: string
  mode?: 'stored' | 'selection'
  onClose?: () => void
  style?: React.CSSProperties
}

function fetchWordData(
  word: string,
  mode: 'stored' | 'selection',
  setDataEnd: (data: string) => void,
  setLoading: (loading: boolean) => void,
  setWordLocalInfoOuter: (
    info: IWordStorage | undefined,
  ) => void,
): void {
  fetchData(
    word,
    setDataEnd,
    setLoading,
    setWordLocalInfoOuter,
    addWordLocal,
    deleteWord,
    translationCache,
    CACHE_EXPIRY,
    mode,
  ).catch(console.error)
}

function useWordDelete(
  wordLocalInfoOuter: IWordStorage | undefined,
  onClose?: () => void,
) {
  return useCallback(async () => {
    if (!wordLocalInfoOuter) {
      return
    }

    onClose?.()

    const event = new CustomEvent('deleteWord', {
      detail: wordLocalInfoOuter.word,
    })
    window.dispatchEvent(event)

    setTimeout(async () => {
      await deleteWord(wordLocalInfoOuter.word)
      await processPageWords()
    }, 10)
  }, [onClose, wordLocalInfoOuter])
}

/**
 * Render a translation card for a saved or transient selection word.
 */
export default function HoverTooltip({
  word,
  mode = 'stored',
  onClose,
  style,
}: HoverTooltipProps) {
  const [wordLocalInfoOuter, setWordLocalInfoOuter] =
    useState<IWordStorage>()
  const [dataEnd, setDataEnd] = useState('')
  const [loading, setLoading] = useState(true)
  // Hand-drawn card defaults to dark mode; the top-right toggle flips it.
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const theme = THEMES[themeName]

  useEffect(() => {
    fetchWordData(
      word,
      mode,
      setDataEnd,
      setLoading,
      setWordLocalInfoOuter,
    )
  }, [mode, word])

  const handleDeleteWord = useWordDelete(
    wordLocalInfoOuter,
    onClose,
  )

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const panelContent = useMemo(() => {
    if (loading) {
      return <LoadingPanel theme={theme} />
    }

    return (
      <LoadedPanel
        word={word}
        dataEnd={dataEnd}
        wordLocalInfoOuter={wordLocalInfoOuter}
        handleDeleteWord={handleDeleteWord}
        mode={mode}
        theme={theme}
      />
    )
  }, [
    dataEnd,
    handleDeleteWord,
    loading,
    mode,
    theme,
    word,
    wordLocalInfoOuter,
  ])

  const toolbarButtonStyle: React.CSSProperties = {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: `2px solid ${theme.ink}`,
    background: theme.toolbarBg,
    color: theme.ink,
    fontSize: '15px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }

  return (
    <div
      data-meow-ignore='true'
      data-meow-tooltip-root={mode}
      className='overflow-hidden'
      style={{
        position: 'relative',
        background: theme.surface,
        border: `2.5px solid ${theme.border}`,
        borderRadius: SKETCH_RADIUS,
        boxShadow: theme.shadow,
        width: '340px',
        minWidth: '340px',
        maxWidth: '340px',
        fontFamily: HAND_FONT,
        fontSize: '14px',
        lineHeight: '1.55',
        color: theme.ink,
        zIndex: 9999,
        transform: 'rotate(-0.5deg)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 1,
        }}
      >
        <button
          type='button'
          aria-label={
            themeName === 'dark' ? '切换到亮色' : '切换到暗色'
          }
          title={themeName === 'dark' ? '切换到亮色' : '切换到暗色'}
          onClick={toggleTheme}
          style={toolbarButtonStyle}
        >
          {themeName === 'dark' ? '🌙' : '☀️'}
        </button>
        <button
          type='button'
          aria-label='关闭翻译卡片'
          onClick={onClose}
          style={{ ...toolbarButtonStyle, fontSize: '18px' }}
        >
          ×
        </button>
      </div>
      {panelContent}
    </div>
  )
}
