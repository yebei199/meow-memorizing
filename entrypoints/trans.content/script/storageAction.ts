import {
  type IAllWordsStorage,
  type IWordStorage,
  extensionStorage,
} from '@/src/wxtStore.ts'

import { storage } from 'wxt/storage'
/**
 * get words list from local storage
 */
export async function getWordsList(): Promise<IAllWordsStorage | null> {
  try {
    const wordsList =
      await storage.getItem<IAllWordsStorage>(
        'sync:myWords',
      )
    return wordsList
  } catch (error) {
    // can't get local storage
    console.error(error)
    return null
  }
}

/**
 *  query from local storage
 */
export async function queryWord(word: string) {
  try {
    const wordsList: IAllWordsStorage | null =
      await getWordsList()
    return wordsList?.[word]
  } catch (error) {
    console.error(error)
    return undefined
  }
}

/**
 *
 * add word to local storage
 * @param wordNeedAdd the word of need to add to word list
 * @returns void
 */
export async function addWordLocal(
  wordNeedAdd: IWordStorage,
): Promise<void> {
  let wordsList: IAllWordsStorage | null = null

  try {
    wordsList = await getWordsList()
  } catch (error) {
    console.error('Error fetching words list:', error)
  }

  if (!wordsList) {
    // if local storage is empty, create a new object
    wordsList = {}
    wordsList[wordNeedAdd.word] = wordNeedAdd
  } else {
    wordsList[wordNeedAdd.word] = wordNeedAdd
  }

  await extensionStorage.setItem('myWords', wordsList)
  // await extensionStorage.onChange(key, cb)
}
