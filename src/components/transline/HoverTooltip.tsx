import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { processPageWords } from '@/src/content-scripts/ergodicWords.tsx';
import { addWordLocal } from '@/src/core/storageManager';
import type { IWordStorage } from '@/src/core/types';
import {
  addQueriedWord,
  deleteWord,
} from '@/src/core/wordProcessor';
import {
  LoadedPanel,
  LoadingPanel,
} from './PanelComponents';
import {
  CACHE_EXPIRY,
  fetchData,
  translationCache,
} from './transUtils';

/**
 * @description 鼠标悬停时显示额外内容
 * 逻辑是先发送消息到后台,然后后台返回html片段,最后将html片段渲染出来
 * @param word 单词
 * @example <HoverTooltip word={'hello'} />
 */
export default function HoverTooltip({
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
  const [loading, setLoading] = useState<boolean>(true);

  const handleDeleteWord = useCallback(async () => {
    if (wordLocalInfoOuter) {
      await deleteWord(wordLocalInfoOuter.word);
      setWordLocalInfoOuter({
        ...wordLocalInfoOuter,
        isDeleted: true,
        deleteTimes: wordLocalInfoOuter.deleteTimes + 1,
      });
      await processPageWords();
    }
  }, [wordLocalInfoOuter]);

  const handleAddQuery = useCallback(async () => {
    if (wordLocalInfoOuter) {
      await addQueriedWord(wordLocalInfoOuter.word);
      setWordLocalInfoOuter({
        ...wordLocalInfoOuter,
        queryTimes: wordLocalInfoOuter.queryTimes + 1,
      });
    }
  }, [wordLocalInfoOuter]);

  useEffect(() => {
    fetchData(
      word3,
      setDataEnd,
      setLoading,
      setWordLocalInfoOuter,
      addWordLocal,
      deleteWord,
      processPageWords,
      translationCache,
      CACHE_EXPIRY,
    ).catch(console.error);

    return () => {};
  }, [word3]);

  // 面板内容组件
  const panelContent = useMemo(() => {
    if (loading) {
      return <LoadingPanel />;
    }

    return (
      <LoadedPanel
        word={word}
        dataEnd={dataEnd}
        wordLocalInfoOuter={wordLocalInfoOuter}
        handleAddQuery={handleAddQuery}
        handleDeleteWord={handleDeleteWord}
      />
    );
  }, [
    loading,
    word,
    dataEnd,
    wordLocalInfoOuter,
    handleAddQuery,
    handleDeleteWord,
  ]);

  return (
    <div
      className={
        'position-absolute overflow-auto z-99 w-90 h-auto rounded-2xl p-6'
      }
      style={{
        position: 'fixed',
        left: `${x - 70}px`,
        top: `${y + 30}px`,
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '18px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        maxWidth: '400px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.4',
        zIndex: 9999,
      }}
    >
      {panelContent}
      <button
        type='button'
        className={
          'absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-red-500 font-bold transition-all hover:bg-red-100'
        }
        onClick={handleDeleteWord}
        title='删除单词'
        style={{
          background: 'transparent',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          lineHeight: '1',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          margin: '0',
        }}
      >
        ×
      </button>
    </div>
  );
}
