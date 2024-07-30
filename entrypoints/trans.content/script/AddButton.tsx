import ergodicWords from '@/entrypoints/trans.content/script/ergodicWords.tsx'
import type { IWordStorage } from '@/src/wxtStore.ts'
import { addWordLocal, queryWord } from './storageAction.ts'

export async function selectListen() {
  document.addEventListener('mouseup', async () => {
    // 获取当前选中的文本
    const selection = window.getSelection()
    if (!selection || selection.rangeCount < 1) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()

    // 检查选中的文本是否是一个单词（包括可能的复合词）
    // 使用正则表达式允许单词中包含连字符、短横线、数字和下划线等
    const regex = /^\s*(\b[\w\-]+\b)\s*$/ // 修改后的正则表达式
    const match = selectedText.match(regex)
    if (!match) return // 如果不是单词，则退出

    const pureWord = match[1] // 获取匹配到的单词
    const mySpan: HTMLSpanElement =
      document.createElement('span')
    mySpan.textContent = pureWord
    // 使用deleteContents方法清空原范围的内容，并用<span>替换
    range.deleteContents()
    range.insertNode(mySpan)

    //--------
    await addQueriedWord(pureWord)
    // const wordsList = await getWordsList()
    // console.log(wordsList)
    await ergodicWords()
  })
}

/*
 * 添加已经查询到的单词
 */
async function addQueriedWord(word: string) {
  const word1: IWordStorage | undefined =
    await queryWord(word)
  if (word1) {
    word1.queryTimes += 1
    word1.isDeleted = false
    await addWordLocal(word1)
  } else {
    const wordNew: IWordStorage = {
      word: word,
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    }
    await addWordLocal(wordNew)
  }
}
