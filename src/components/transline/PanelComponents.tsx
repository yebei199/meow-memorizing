import type React from 'react';
import type { IWordStorage } from '@/src/core/types';

// 加载中面板组件
export function LoadingPanel() {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      加载中...
    </div>
  );
}

// 已加载面板组件
export function LoadedPanel({
  word,
  dataEnd,
  wordLocalInfoOuter,
  handleAddQuery,
  handleDeleteWord,
}: {
  word: string;
  dataEnd: string;
  wordLocalInfoOuter?: IWordStorage;
  handleAddQuery: () => void;
  handleDeleteWord: () => void;
}) {
  return (
    <>
      <h1
        className={'text-center text-xl font-bold mb-3'}
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          textShadow: '0 1px 1px rgba(255, 255, 255, 0.3)',
        }}
      >
        {word}
      </h1>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <p
        className={'break-words my-4'}
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          whiteSpace: 'pre-line',
        }}
      >
        {dataEnd}
      </p>

      <hr className='border-0 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-30' />
      <span className='flex justify-between items-center'>
        <span style={{ color: 'inherit' }}>
          查询次数:
          <span className='inline break-words ml-2 font-semibold'>
            {wordLocalInfoOuter?.queryTimes}
          </span>
        </span>
      </span>
      <div className='flex justify-between mt-2'>
        <button
          type='button'
          className={
            'px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600'
          }
          onClick={handleAddQuery}
          title='增加查询次数'
        >
          +1 查询
        </button>
        <button
          type='button'
          className={
            'px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600'
          }
          onClick={handleDeleteWord}
          title='删除单词'
        >
          删除单词
        </button>
      </div>
    </>
  );
}