import { queryWord } from '@/src/core/storageManager';
import T2 from './T2';

/**
 * @description 对于每个单词的翻译准备以及鼠标悬停时显示额外内容的组件
 * @param originalWord 原始格式的单词（保持原有大小写）
 * @param lowerCaseWord 小写格式的单词（用于查询）
 * @example <TransLine originalWord={'Hello'} lowerCaseWord={'hello'} />
 */
export default function TransLine({
  originalWord,
  lowerCaseWord,
}: {
  originalWord: string;
  lowerCaseWord: string;
}) {
  // 检查单词是否已被删除

  // 不需要等待异步操作完成，因为我们只在渲染时检查
  // 如果单词被删除，我们应该在T2组件中处理

  return (
    <p
      className='inline m-0 p-0 border-0 bg-transparent text-inherit font-inherit'
      style={{
        display: 'inline',
        margin: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        position: 'relative',
      }}
    >
      <T2
        originalWord={originalWord}
        lowerCaseWord={lowerCaseWord}
      />
    </p>
  );
}
