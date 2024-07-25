import React from 'react'
import ReactDOM from 'react-dom/client'
import TransLine from './TransLine.tsx'
import { IALlWordsStorage } from '@/src/wxtStore.ts'
import { getWordsList } from '@/entrypoints/trans.content/script/storageAction.ts'

/*
 * 遍历DOM树，替换目标单词
 */
export default async function ergodicWords() {
  //筛选
  const wordsList = await getWordsList()
  if (!wordsList) return

  const delWords: IALlWordsStorage = {}
  for (let i in wordsList) {
    if (wordsList[i].isDeleted) {
      delWords[i] = wordsList[i]
    }
  }
  const wordsListStr = Object.keys(wordsList)
  const delWordsListStr = Object.keys(delWords)
  const R1 = new ReplaceMain(wordsListStr)
  R1.walk()

  for (let i of wordsListStr) {
    const list1 = document.getElementsByClassName(
      R1.classNamePrefix + i
    )
    let id = ''
    for (let i2 of list1) {
      id = i2.toString() + '1'
      const root = ReactDOM.createRoot(i2 as HTMLLIElement)

      if (delWordsListStr.includes(i)) {
        root.render(<span> {i} </span>)
      } else {
        root.render(<TransLine word={i} key={id} />)
      }
    }
  }
}

/*
 * @description 替换的操作类
 * 1. 遍历DOM树，找到目标单词
 * 2. 替换目标单词
 * 3. 添加className，防止重复
 *
 * @param targetWordList 目标单词列表
 * @example new ReplaceMain(['hello', 'world']).walk()
 */
class ReplaceMain {
  public readonly classNamePrefix: string = 'w%3@D'

  //已经去重了的目标单词列表
  public targetWordList: string[]
  public targetWordSet: Set<string>

  public startNode: HTMLElement = document.body

  constructor(targetWordList: string[]) {
    this.targetWordSet = new Set(targetWordList)
    this.targetWordList = Array.from(this.targetWordSet)
  }

  public walk(node: Node = this.startNode) {
    let child, next

    switch (node.nodeType) {
      case 1: // Element
      case 9: // Document
      case 11: // Document fragment
        child = node.firstChild
        while (child) {
          next = child.nextSibling
          this.walk(child)
          child = next
        }
        break
      case 3: // Text node
        this.handleText(node)
        break
    }
  }
  private handleText(textNode: Node) {
    // 跳过空文本节点
    const text = textNode.nodeValue
    if (text === null || text.trim().length === 0) {
      return
    }

    const parent = textNode.parentNode!
    // 判断父节点是否已经替换过
    if (parent instanceof Element) {
      if (parent.className.includes(this.classNamePrefix)) {
        console.log('skip')
        return
      }
    }
    // 文本节点内部文字
    const wordsList = text.split(' ') // 使用空格分词
    const uniqueWords = new Set(wordsList) // 转换为Set以去除重复项

    const intersect1 =
      this.targetWordSet.intersection(uniqueWords)
    // 如果没有匹配到目标单词，则直接跳过
    if (intersect1.size === 0) {
      return
    }

    const spanObj: { [key: string]: HTMLSpanElement } = {}
    for (let interWord of intersect1) {
      spanObj[interWord] =
        this.createReplacementSpan(interWord)
    }

    for (let originWord of wordsList) {
      // 遍历单词列表并替换目标单词
      if (intersect1.has(originWord)) {
        parent.appendChild(spanObj[originWord])
        parent.appendChild(document.createTextNode(' '))
      } else {
        parent.appendChild(
          document.createTextNode(' ' + originWord + ' ')
        )
      }
    }
    parent.removeChild(textNode) // 移除原始文本节点
  }
  public createReplacementSpan(
    targetWord: string
  ): HTMLSpanElement {
    const replacementSpan = document.createElement('span')
    replacementSpan.classList.add(this.classNamePrefix)
    replacementSpan.classList.add(
      this.classNamePrefix + targetWord
    )
    replacementSpan.style.display = 'inline-block'
    return replacementSpan
  }
}
