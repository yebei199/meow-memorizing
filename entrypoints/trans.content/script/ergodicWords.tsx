import type React from 'react'
import { createRoot } from 'react-dom/client'
import TransLine from '@/entrypoints/trans.content/script/TransLine'
import { getWordsList } from '@/src/core/storageManager'

/**
 * 处理页面中的单词
 */
export async function processPageWords(): Promise<void> {
  try {
    // 获取单词列表
    const wordsList = await getWordsList()
    if (!wordsList) return

    // 获取页面所有文本节点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
    )

    const textNodes: Text[] = []
    let node: Node | null

    // 收集所有文本节点
    node = walker.nextNode()
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        textNodes.push(node as Text)
      }
      node = walker.nextNode()
    }

    // 处理每个文本节点
    for (const textNode of textNodes) {
      await processTextNode(textNode, wordsList)
    }
  } catch (error) {
    console.error('处理页面单词时出错:', error)
  }
}

/**
 * 处理单个文本节点
 */
async function processTextNode(
  textNode: Text,
  wordsList: Record<string, any>,
): Promise<void> {
  const text = textNode.textContent || ''
  if (!text.trim()) return

  // 检查父元素是否已经处理过
  const parent = textNode.parentNode
  if (!parent) return
  
  // 检查是否已经有处理过的标记
  if (parent instanceof Element && parent.querySelector('p[data-word]')) {
    return // 已经处理过，跳过
  }

  const words = Object.keys(wordsList)
    .filter((wordKey) => !wordsList[wordKey].isDeleted)
    .map((wordKey) => wordsList[wordKey].word)
    .sort((a, b) => b.length - a.length) // 按长度排序，优先匹配长单词

  // 查找所有匹配的单词
  const matches: { index: number; word: string; end: number }[] = []
  
  // 使用一个更精确的匹配算法，避免重叠匹配
  let lastIndex = 0
  const textLower = text.toLowerCase()
  
  outer: while (lastIndex < text.length) {
    for (const word of words) {
      const wordLower = word.toLowerCase()
      const index = textLower.indexOf(wordLower, lastIndex)
      
      if (index >= 0) {
        // 检查是否是单词边界
        const beforeChar = index > 0 ? text[index - 1] : ' '
        const afterChar = index + word.length < text.length ? text[index + word.length] : ' '
        const isWordBoundary = /^[^a-zA-Z]$/.test(beforeChar) && /^[^a-zA-Z]$/.test(afterChar)
        
        if (isWordBoundary) {
          matches.push({
            index: index,
            word: text.substring(index, index + word.length), // 保持原始大小写
            end: index + word.length
          })
          lastIndex = index + word.length
          continue outer
        } else {
          lastIndex = index + 1
        }
      }
    }
    lastIndex++
  }
  
  // 如果没有匹配的单词，直接返回
  if (matches.length === 0) return
  
  // 按索引排序匹配项
  matches.sort((a, b) => a.index - b.index)
  
  // 创建文档片段来保持原有结构
  const fragment = document.createDocumentFragment()
  let lastProcessedIndex = 0
  
  // 处理匹配的单词
  for (const match of matches) {
    // 添加匹配单词之前的文本
    if (match.index > lastProcessedIndex) {
      const textBefore = text.substring(lastProcessedIndex, match.index)
      fragment.appendChild(document.createTextNode(textBefore))
    }
    
    // 直接使用 p 标签包裹单词，避免嵌套
    const wordElement = document.createElement('p')
    wordElement.setAttribute('data-word', match.word.toLowerCase())
    wordElement.textContent = match.word
    wordElement.style.display = 'inline'
    wordElement.style.verticalAlign = 'baseline'
    wordElement.style.margin = '0'
    wordElement.style.padding = '0'
    wordElement.style.border = 'none'
    wordElement.style.background = 'none'
    wordElement.style.color = 'inherit'
    wordElement.style.font = 'inherit'
    
    fragment.appendChild(wordElement)
    
    // 为单词创建React组件
    const root = createRoot(wordElement)
    root.render(<TransLine word={match.word.toLowerCase()} />)
    
    lastProcessedIndex = match.end
  }
  
  // 添加最后剩余的文本
  if (lastProcessedIndex < text.length) {
    const textAfter = text.substring(lastProcessedIndex)
    fragment.appendChild(document.createTextNode(textAfter))
  }
  
  // 替换原文本节点
  parent.replaceChild(fragment, textNode)
}