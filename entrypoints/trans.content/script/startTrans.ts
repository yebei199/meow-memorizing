import { selectListen } from '@/entrypoints/trans.content/script/AddButton.tsx'
// import { getWordsList } from "@/entrypoints/trans.content/script/storageAction.ts";
// import type { IALlWordsStorage } from "@/src/wxtStore.ts";
import ergodicWords from './ergodicWords.tsx'

export default async function startTrans() {
  // const wordsList: IALlWordsStorage | null =
  //   await getWordsList();

  selectListen().catch(console.error)

  ergodicWords().catch(console.error)
}
