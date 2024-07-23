import React from 'react'
import ReactDOM from 'react-dom/client'
import TransLine from './TransLine.tsx'

export default function main() {
  const targetWord: string[] = ['you', 'is']
  const R1 = new ReplaceMain(targetWord)
  R1.walk()

  for (let i of targetWord) {
    const list1 = document.getElementsByClassName(
      R1.classNamePrefix + i
    )
    let id = ''
    for (let i2 of list1) {
      id = i2.toString() + '1'
      const root = ReactDOM.createRoot(i2 as HTMLLIElement)
      root.render(<TransLine word={i} key={id} />)
    }
  }
}

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
