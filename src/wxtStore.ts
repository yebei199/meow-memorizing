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
export interface IALlWordsStorage {
  [key: string]: IWordStorage
}

export interface ExtensionStorageSchema {
  myWords: IALlWordsStorage
}

export const extensionStorage =
  defineExtensionStorage<ExtensionStorageSchema>(
    browser.storage.local
  )
