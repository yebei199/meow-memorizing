import { processPageWords } from './ergodicWords';
import { addQueriedWord, filterWord } from '@/src/core/wordProcessor';

/**
 * 监听鼠标抬起事件，选择文本并添加到本地存储
 */
export async function setupSelectionListener(): Promise<void> {
  document.addEventListener('mouseup', async () => {
    // 获取当前选中的文本
    const selection = window.getSelection()
    if (!selection || selection.rangeCount < 1) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString().trim()
    
    // 如果选中的文本不是有效单词，返回
    if (await filterWord(selectedText)) return

    const mySpan: HTMLSpanElement = document.createElement('p')
    mySpan.textContent = selectedText
    mySpan.style.display = 'inline'
    mySpan.style.verticalAlign = 'baseline'
    mySpan.style.margin = '0'
    mySpan.style.padding = '0'
    mySpan.style.border = 'none'
    mySpan.style.background = 'none'
    mySpan.style.color = 'inherit'
    mySpan.style.font = 'inherit'
    
    // 使用deleteContents方法清空原范围的内容，并用<p>替换
    range.deleteContents()
    range.insertNode(mySpan)

    // 添加单词到本地存储并更新查询次数
    await addQueriedWord(selectedText.toLowerCase())
    selection.removeAllRanges()
    await processPageWords()
  })
}