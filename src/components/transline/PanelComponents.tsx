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
  handleDeleteWord,
}: {
  word: string;
  dataEnd: string;
  wordLocalInfoOuter?: IWordStorage;
  handleAddQuery: () => void;
  handleDeleteWord: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {/* 删除按钮 - 红色X在右上角 */}
      <button
        type='button'
        onClick={handleDeleteWord}
        title='删除单词（不再查询该单词）'
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '24px',
          height: '24px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#ff4444',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          borderRadius: '50%',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            'rgba(255, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            'transparent';
        }}
      >
        ×
      </button>

      <h1
        className={'text-center text-xl font-bold mb-3'}
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          textShadow: '0 1px 1px rgba(255, 255, 255, 0.3)',
          paddingRight: '24px', // 为右上角的X按钮留出空间
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
    </div>
  );
}
