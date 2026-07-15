import LiePromise from 'lie';
import { addWordLocal, queryWord } from './storageManager';
import type { IWordStorage } from './types';

/**
 * 过滤单词是否有效
 * @returns 如果单词有效返回 false，否则返回 true
 */
export async function filterWord(
  word: string,
): Promise<boolean> {
  const cleanWord = word.trim().toLowerCase();

  // 检查单词长度是否大于2
  if (cleanWord.length <= 2) return true;

  // 使用正则表达式检查单词是否符合要求
  const regex = /^\s*(\b[a-zA-Z-]+\b)\s*$/;
  if (!regex.test(cleanWord)) return true;

  const queryResult = await queryWord(cleanWord);
  // 如果单词已存在且未被删除，返回 true
  return (
    queryResult !== undefined && !queryResult.isDeleted
  );
}

/**
 * 添加用户查询的单词到本地存储并更新查询次数。
 * 已记住（isDeleted）在重选时照常复位，这是刻意保留的既有行为；
 * 停用词（isIgnored）和查无翻译（isUntranslatable）不受影响，
 * 只能分别通过 ignoreWord/unignoreWord 和冷却重试改变。
 */
export async function addQueriedWord(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord: IWordStorage | undefined =
    await queryWord(cleanWord);

  if (existingWord) {
    existingWord.queryTimes += 1;
    existingWord.isDeleted = false;
    await addWordLocal(existingWord);
  } else {
    // 创建新单词记录
    const newWord: IWordStorage = {
      word: cleanWord,
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
      isIgnored: false,
      isUntranslatable: false,
      lastAttemptAt: 0,
    };
    await addWordLocal(newWord);
  }
}

/**
 * 删除单词（标记为已记住/从词汇书移除）
 */
export async function deleteWord(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord: IWordStorage | undefined =
    await queryWord(cleanWord);

  if (existingWord) {
    // 复制对象以避免直接修改状态
    const updatedWordInfo = {
      ...existingWord,
      isDeleted: true,
      deleteTimes: existingWord.deleteTimes + 1,
    };
    await addWordLocal(updatedWordInfo);

    // 页面中所有该单词的高亮由 T2 监听 deleteWord 事件自行恢复（见 HoverTooltip）。
  }
}

/**
 * 词汇书「已记住」标签页的恢复操作：撤销 deleteWord，与 unignoreWord 对称。
 */
export async function restoreWord(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord = await queryWord(cleanWord);
  if (!existingWord) return;

  await addWordLocal({ ...existingWord, isDeleted: false });
}

/**
 * 标记为停用词（用户主动，永不翻译），与「已记住」「查无翻译」互相独立。
 */
export async function ignoreWord(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord = await queryWord(cleanWord);
  if (!existingWord) return;

  await addWordLocal({ ...existingWord, isIgnored: true });
}

/**
 * 取消停用词标记。
 */
export async function unignoreWord(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord = await queryWord(cleanWord);
  if (!existingWord) return;

  await addWordLocal({ ...existingWord, isIgnored: false });
}

/** 查无翻译的自动重试冷却时长：3 天。 */
export const UNTRANSLATABLE_RETRY_COOLDOWN_MS =
  3 * 24 * 60 * 60 * 1000;

/**
 * 系统自动标记查无翻译，并记录本次尝试时间用于冷却重试判断。
 */
export async function markUntranslatable(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord = await queryWord(cleanWord);
  if (!existingWord) return;

  await addWordLocal({
    ...existingWord,
    isUntranslatable: true,
    lastAttemptAt: Date.now(),
  });
}

/**
 * 冷却重试后翻译成功时调用，清除查无翻译标记。
 */
export async function clearUntranslatable(
  word: string,
): Promise<void> {
  const cleanWord = word.trim().toLowerCase();
  const existingWord = await queryWord(cleanWord);
  if (!existingWord?.isUntranslatable) return;

  await addWordLocal({
    ...existingWord,
    isUntranslatable: false,
  });
}

/**
 * 判断是否应该（重新）尝试翻译：未标记查无翻译，或已过冷却期。
 * 兼容历史数据缺失 lastAttemptAt 字段的情况（视为立即可重试）。
 */
export function shouldRetryTranslation(
  wordInfo: IWordStorage | undefined,
): boolean {
  if (!wordInfo?.isUntranslatable) return true;

  const lastAttemptAt = wordInfo.lastAttemptAt ?? 0;
  return (
    Date.now() - lastAttemptAt >=
    UNTRANSLATABLE_RETRY_COOLDOWN_MS
  );
}

/** 鼠标选中一个词后，翻译面板/提示点应该怎么反应。 */
export type SelectionAction =
  | 'showDot'
  | 'silent'
  | 'showTooltip';

/**
 * 停用词：选中时改为出重译提示点，不弹面板。
 * 冷却期内的查无翻译词：完全静默，什么都不出现。
 * 其余情况（含已记住、普通词）：照常弹出翻译面板。
 */
export function decideSelectionAction(
  wordInfo: IWordStorage | undefined,
): SelectionAction {
  if (wordInfo?.isIgnored) return 'showDot';
  if (
    wordInfo?.isUntranslatable &&
    !shouldRetryTranslation(wordInfo)
  ) {
    return 'silent';
  }
  return 'showTooltip';
}

/**
 * 延迟执行函数
 */
export async function delay(ms: number): Promise<void> {
  await new LiePromise((resolve) =>
    setTimeout(resolve, ms),
  );
}
