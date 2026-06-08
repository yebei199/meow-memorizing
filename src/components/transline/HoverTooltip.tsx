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

const tooltipStyle: React.CSSProperties = {
  background:
    'linear-gradient(155deg, rgba(255,255,255,0.97), rgba(255,246,231,0.95))',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  borderRadius: '24px',
  boxShadow:
    '0 24px 60px rgba(26, 26, 26, 0.16), 0 8px 24px rgba(255, 179, 71, 0.14)',
  border: '1px solid rgba(255, 179, 71, 0.24)',
  width: '340px',
  minWidth: '340px',
  maxWidth: '340px',
  fontFamily:
    '"Avenir Next", "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#2f2418',
  zIndex: 9999,
  overflow: 'hidden',
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

  const panelContent = useMemo(() => {
    if (loading) {
      return <LoadingPanel />
    }

    return (
      <LoadedPanel
        word={word}
        dataEnd={dataEnd}
        wordLocalInfoOuter={wordLocalInfoOuter}
        handleDeleteWord={handleDeleteWord}
        mode={mode}
        onClose={onClose}
      />
    )
  }, [
    dataEnd,
    handleDeleteWord,
    loading,
    mode,
    onClose,
    word,
    wordLocalInfoOuter,
  ])

  return (
    <div
      data-meow-ignore='true'
      data-meow-tooltip-root={mode}
      className='position-absolute overflow-auto p-0'
      style={{ ...tooltipStyle, ...style }}
    >
      {panelContent}
    </div>
  )
}
