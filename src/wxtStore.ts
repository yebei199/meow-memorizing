import { defineExtensionStorage } from '@webext-core/storage'
import { browser } from 'wxt/browser'

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

export interface ExtensionStorageSchema {
  myWords: IAllWordsStorage
  // 网站主题模式，true表示深色模式，false表示浅色模式
  isWebsiteDarkMode: boolean
}

// utils/storage.ts
export const myWords = storage.defineItem<IAllWordsStorage>(
  'sync:myWords',
  {
    fallback: {},
  },
)

// 网站主题模式存储
export const isWebsiteDarkMode = storage.defineItem<boolean>(
  'local:isWebsiteDarkMode',
  {
    fallback: false,
  },
)

export const extensionStorage =
  defineExtensionStorage<ExtensionStorageSchema>(
    browser.storage.sync,
  )

