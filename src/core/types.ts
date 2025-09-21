/**
 * 核心类型定义
 */

export interface IWordStorage {
  word: string
  definition?: string
  example?: string
  isDeleted: boolean
  queryTimes: number
  deleteTimes: number
}

export interface IAllWordsStorage {
  [key: string]: IWordStorage
}

export interface IWordQuery {
  word: string
}

export interface ExtensionStorageSchema {
  myWords: IAllWordsStorage
  // 网站主题模式，true表示深色模式，false表示浅色模式
  isWebsiteDarkMode: boolean
}

