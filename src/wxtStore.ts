// 历史入口:只做重新导出。词库存储与类型的唯一定义在 core/ 下,这里曾经
// 重复声明过一份(含指向已废弃 sync:myWords 的 defineItem 与缺少三态字段的
// IWordStorage),留着只会让下一个改存储的人改错地方。
export { onMessage, sendMessage } from './core/messaging';
export * from './core/storageManager';
export type {
  IAllWordsStorage,
  IWordQuery,
  IWordStorage,
} from './core/types';
