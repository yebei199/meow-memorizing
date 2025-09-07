import LiePromise from 'lie'
import { selectListen } from '@/entrypoints/trans.content/script/AddButton.tsx'
import ergodicWords from './ergodicWords.tsx'

export default async function startTrans() {
  //延迟几秒再加载
  await new LiePromise((resolve) =>
    setTimeout(resolve, 2000),
  )
  console.log('startTrans')

  ergodicWords().catch(console.error)
  selectListen().catch(console.error)
}
