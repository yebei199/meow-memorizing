import LiePromise from 'lie'
import { addWordLocal, queryWord } from './storageManager'
import type { IWordStorage } from './types'

/**
 * 过滤单词是否有效
 * @returns 如果单词有效返回 false，否则返回 true
 */
export async function filterWord(word: string): Promise<boolean> {
  const cleanWord = word.trim().toLowerCase()
  
  // 检查单词长度是否大于2
  if (cleanWord.length <= 2) return true

  // 使用正则表达式检查单词是否符合要求
  const regex = /^\s*(\b[a-zA-Z-]+\b)\s*$/
  if (!regex.test(cleanWord)) return true

  const queryResult = await queryWord(cleanWord)
  // 如果单词已存在且未被删除，返回 true
  return queryResult !== undefined && !queryResult.isDeleted
}

/**
 * 添加用户查询的单词到本地存储并更新查询次数
 */
export async function addQueriedWord(word: string): Promise<void> {
  const cleanWord = word.trim().toLowerCase()
  const existingWord: IWordStorage | undefined = await queryWord(cleanWord)

  if (existingWord) {
    // 如果单词已经在本地存储中，但删除状态为true，更新查询次数
    existingWord.queryTimes += 1
    existingWord.isDeleted = false
    existingWord.deleteTimes += 1
    await addWordLocal(existingWord)
  } else {
    // 创建新单词记录
    const newWord: IWordStorage = {
      word: cleanWord,
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    }
    await addWordLocal(newWord)
  }
}

/**
 * 删除单词（标记为已删除）
 */
export async function deleteWord(word: string): Promise<void> {
  const cleanWord = word.trim().toLowerCase()
  const existingWord: IWordStorage | undefined = await queryWord(cleanWord)
  
  if (existingWord) {
    // 复制对象以避免直接修改状态
    const updatedWordInfo = {
      ...existingWord,
      isDeleted: true,
      deleteTimes: existingWord.deleteTimes + 1,
    }
    await addWordLocal(updatedWordInfo)
  }
}

/**
 * 延迟执行函数
 */
export async function delay(ms: number): Promise<void> {
  await new LiePromise((resolve) => setTimeout(resolve, ms))
}

