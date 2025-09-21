import {
  type IAllWordsStorage,
  type IWordStorage,
  extensionStorage,
  myWords,
} from '@/src/wxtStore.ts'

// 从新核心模块重新导出存储操作函数
export { getWordsList, queryWord, addWordLocal } from '@/src/core/storageManager'
