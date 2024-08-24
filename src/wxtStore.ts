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
}

// utils/storage.ts
export const myWords = storage.defineItem<IAllWordsStorage>(
  'sync:myWords',
  {
    fallback: {},
  },
)
export const extensionStorage =
  defineExtensionStorage<ExtensionStorageSchema>(
    browser.storage.sync,
  )
