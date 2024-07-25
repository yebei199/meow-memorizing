import { getWordsList } from '@/entrypoints/trans.content/script/storageAction.ts'
import { selectListen } from '@/entrypoints/trans.content/script/AddButton.tsx'
import ergodicWords from './ergodicWords.tsx'
import { IALlWordsStorage } from '@/src/wxtStore.ts'

export default async function startTrans() {
  const wordsList: IALlWordsStorage | null =
    await getWordsList()

  selectListen()

  ergodicWords().catch(console.error)
}
