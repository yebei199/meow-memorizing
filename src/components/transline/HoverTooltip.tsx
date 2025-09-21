import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  addWordLocal,
  queryWord,
} from '@/src/core/storageManager';
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
}: {
  word: string;
  style?: {
    position: string;
    top: string;
    left: string;
    transform: string;
    marginTop: string;
    zIndex: number;
  };
}) {
  const word3 = word;
  const [wordLocalInfoOuter, setWordLocalInfoOuter] =
    useState<IWordStorage>();
  const [dataEnd, setDataEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const handleDeleteWord = useCallback(async () => {
    if (wordLocalInfoOuter) {
      // 先隐藏面板，然后再删除单词
      const event = new CustomEvent('deleteWord', {
        detail: wordLocalInfoOuter.word,
      });
      window.dispatchEvent(event);

      // 延迟一小段时间确保面板被卸载后再删除单词
      setTimeout(async () => {
        await deleteWord(wordLocalInfoOuter.word);
        // deleteWord函数内部已经调用了restoreOriginalTextNode来恢复单词为原始状态
        // 不需要再调用processPageWords
      }, 10);
    }
  }, [wordLocalInfoOuter]);

  const handleAddQuery = useCallback(async () => {
    if (wordLocalInfoOuter) {
      await addQueriedWord(wordLocalInfoOuter.word);
      const updatedWordInfo = await queryWord(
        wordLocalInfoOuter.word,
      );
      if (updatedWordInfo) {
        setWordLocalInfoOuter(updatedWordInfo);
      }
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
      () => Promise.resolve(), // 不再需要处理页面单词
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

  // 监听删除事件，隐藏面板
  useEffect(() => {
    const handleDelete = (event: CustomEvent) => {
      if (event.detail === word) {
        // 隐藏面板的逻辑可以在这里添加
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
  }, [word]);

  return (
    <div
      className={
        'position-absolute overflow-auto z-99 rounded-2xl p-6'
      }
      style={{
        position: 'absolute',
        left: '50%',
        top: '100%',
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '18px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        width: '300px', // 固定宽度为300px
        minWidth: '300px',
        maxWidth: '300px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.4',
        zIndex: 9999,
        transform: 'translateX(-50%)', // 居中对齐
        marginTop: '5px', // 单词下方5px的间距
      }}
    >
      {panelContent}
    </div>
  );
}
