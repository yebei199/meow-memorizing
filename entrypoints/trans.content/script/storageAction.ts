import {
  extensionStorage,
  IALlWordsStorage,
  IWordStorage,
} from '@/src/wxtStore.ts'

/*
 * 从浏览器本地获取单词列表
 */
export async function getWordsList(): Promise<IALlWordsStorage | null> {
  const wordsList =
    await extensionStorage.getItem('myWords')
  if (!wordsList) return null
  return wordsList
}

export async function queryWord(
  word: string
): Promise<IWordStorage | undefined> {
  const wordsList: IALlWordsStorage | null =
    await getWordsList()
  return wordsList?.[word]
}

/*
 * 添加单词到本地
 *
 * @param word 单词
 * @returns 无
 */
export async function addWordLocal(
  wordNeedAdd: IWordStorage
): Promise<void> {
  const wordsList: IALlWordsStorage | null =
    await getWordsList()

  if (!wordsList) {
    const initial: IALlWordsStorage = {}
    initial[wordNeedAdd.word] = wordNeedAdd
    await extensionStorage.setItem('myWords', initial)
    return
  }
  wordsList[wordNeedAdd.word] = wordNeedAdd
  await extensionStorage.setItem('myWords', wordsList)
}
