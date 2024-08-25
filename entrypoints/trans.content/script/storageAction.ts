import {
  type IAllWordsStorage,
  type IWordStorage,
  extensionStorage,
  myWords,
} from '@/src/wxtStore.ts'

/**
 * get words list from local storage
 */
export async function getWordsList(): Promise<IAllWordsStorage> {
  try {
    const wordsList = await myWords.getValue()
    return wordsList
  } catch (error) {
    // can't get local storage
    console.error(error)
    throw new Error('Can not get local storage words list')
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
  const wordsList = await getWordsList()

  wordsList[wordNeedAdd.word] = wordNeedAdd
  // await extensionStorage.setItem('myWords', wordsList)
  await myWords.setValue(wordsList)
}
