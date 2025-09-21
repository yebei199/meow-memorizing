import { defineExtensionStorage } from '@webext-core/storage'
import { browser } from 'wxt/browser'
import type { ExtensionStorageSchema, IAllWordsStorage, IWordStorage } from './types'

// 网站主题模式存储
export const isWebsiteDarkMode = storage.defineItem<boolean>(
  'local:isWebsiteDarkMode',
  {
    fallback: false,
  },
)

// 单词存储
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

/**
 * 获取单词列表
 */
export async function getWordsList(): Promise<IAllWordsStorage> {
  try {
    return await myWords.getValue()
  } catch (error) {
    console.error('Failed to get words list:', error)
    throw new Error('Can not get local storage words list')
  }
}

/**
 * 查询单词
 */
export async function queryWord(word: string): Promise<IWordStorage | undefined> {
  try {
    const wordsList: IAllWordsStorage = await getWordsList()
    return wordsList[word.toLowerCase()]
  } catch (error) {
    console.error('Failed to query word:', error)
    return undefined
  }
}

/**
 * 添加或更新单词
 */
export async function addWordLocal(wordNeedAdd: IWordStorage): Promise<void> {
  try {
    const wordsList = await getWordsList()
    wordsList[wordNeedAdd.word.toLowerCase()] = wordNeedAdd
    await myWords.setValue(wordsList)
  } catch (error) {
    console.error('Failed to add word to local storage:', error)
    throw error
  }
}