import { getWordsList } from '@/entrypoints/trans.content/script/storageAction.ts'
import type { IAllWordsStorage } from '@/src/wxtStore.ts'
import React from 'react'
import ReactDOM from 'react-dom/client'
import TransLine from './TransLine.tsx'

/**
  遍历DOM树，替换目标单词
 @example await ergodicWords()
 @returns void
*/
export default async function ergodicWords() {
  //筛选
  const wordsList: IAllWordsStorage = await getWordsList()
  console.log(wordsList)
  const wordsListStr = Object.keys(wordsList)
  if (wordsListStr.length === 0) return

  const delWords: IAllWordsStorage = {}
  for (const i in wordsList) {
    if (wordsList[i].isDeleted) {
      delWords[i] = wordsList[i]
    }
  }
  const delWordsListStr = Object.keys(delWords)

  const R1 = new ReplaceMain(wordsListStr)
  R1.walk()

  for (const i of wordsListStr) {
    const list1 = document.getElementsByClassName(
      R1.classNamePrefix + i,
    )
    for (const i2 of list1) {
      const id = `${i2.toString()}1`
      const root = ReactDOM.createRoot(i2)

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
 * @param targetWordList 目标单词列表
 * @example new ReplaceMain(['hello', 'world']).walk()
 */
class ReplaceMain {
  public readonly classNamePrefix: string = 'w%3@D'

  //已经去重了的目标单词列表
  public targetWordList: string[]
  public targetWordSet: Set<string>

  public startNode: HTMLElement = document.body
  public excludeTags: string[] = [
    'script',
    'CODE',
    'BUTTON',
    'A',
    'a',
  ]

  constructor(targetWordList: string[]) {
    this.targetWordSet = new Set(targetWordList)
    this.targetWordList = Array.from(this.targetWordSet)
  }

  public walk(node: Node = this.startNode) {
    const stack: Node[] = [node]
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue

      try {
        switch (current.nodeType) {
          case 1: // Element
          case 9: // Document
          case 11: {
            // Document fragment
            let child = current.firstChild // 改为从第一个子节点开始
            while (child) {
              if (
                !this.excludeTags.includes(
                  (child as Element).tagName,
                )
              ) {
                stack.push(child)
              }

              child = child.nextSibling // 移动到下一个兄弟节点
            }
            break
          }
          case 3: // Text node
            this.handleText(current as Text)
            break
          default:
            break
        }
      } catch (error) {
        console.error(`Error walking the DOM: ${error}`)
        // 根据需求决定是否要继续遍历或停止
      }
    }
  }

  private handleText(textNode: Text) {
    if (!textNode) {
      console.error('TextNode is null')
      return
    }

    const text = textNode.nodeValue
    if (!text || text.trim().length === 0) {
      return
    }

    const parent = textNode.parentNode as HTMLElement

    if (parent?.classList.contains(this.classNamePrefix)) {
      return
    }

    const wordsList = text.split(' ')
    const uniqueWords = new Set(wordsList)
    const intersect1 =
      this.targetWordSet.intersection(uniqueWords)

    if (intersect1.size === 0) {
      return
    }

    const fragment = document.createDocumentFragment()
    let currentText = ''

    for (const originWord of wordsList) {
      if (intersect1.has(originWord)) {
        if (currentText !== '') {
          fragment.appendChild(
            document.createTextNode(currentText),
          )
          currentText = ''
        }
        const span = this.createReplacementSpan(originWord)
        fragment.appendChild(span)
        fragment.appendChild(document.createTextNode(' '))
      } else {
        currentText += ` ${originWord} `
      }
    }

    if (currentText !== '') {
      fragment.appendChild(
        document.createTextNode(currentText.trim()),
      )
    }

    try {
      parent?.replaceChild(fragment, textNode)
    } catch (error) {
      console.error('Error replacing child nodes:', error)
    }
  }

  public createReplacementSpan(
    targetWord: string,
  ): HTMLSpanElement {
    const replacementSpan = document.createElement('span')
    replacementSpan.classList.add(this.classNamePrefix)
    replacementSpan.classList.add(
      this.classNamePrefix + targetWord,
    )
    replacementSpan.style.display = 'inline-block'
    return replacementSpan
  }
}
