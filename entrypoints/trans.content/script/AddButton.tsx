import ergodicWords from '@/entrypoints/trans.content/script/ergodicWords.tsx';
import type { IWordStorage } from '@/src/wxtStore.ts';
import {
  addWordLocal,
  queryWord,
} from './storageAction.ts';

/**
 * listen to the mouseup event to select the text and add it to the local storage
 */
export async function selectListen() {
  document.addEventListener('mouseup', async () => {
    // 获取当前选中的文本
    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    // if the selected text is not a valid word, return
    console.log(
      'first',
      await filterWord(selectedText.toLowerCase()),
    );
    if (await filterWord(selectedText)) return;

    const mySpan: HTMLSpanElement =
      document.createElement('span');
    mySpan.textContent = selectedText;
    // 使用deleteContents方法清空原范围的内容，并用<span>替换
    range.deleteContents();
    range.insertNode(mySpan);

    // add the word to the local storage and update the queryTimes
    await addQueriedWord(selectedText);
    selection.removeAllRanges();
    await ergodicWords();
  });
}

/**
 * @returns if the word is valid return false, else return true
 */
async function filterWord(word: string): Promise<boolean> {
  // 检查单词长度是否大于2
  if (word.length <= 2) return true;

  // 使用正则表达式检查单词是否符合要求
  const regex = /^\s*(\b[a-zA-Z-]+\b)\s*$/;
  if (!regex.test(word)) return true;

  const query1 = await queryWord(word);
  // if it exists in the local storage and not deleted, return true
  return query1 !== undefined && !query1.isDeleted;
}

/**
 * add the word of queried by the user to the local storage and update the queryTimes
 */
async function addQueriedWord(word: string) {
  const word1: IWordStorage | undefined =
    await queryWord(word);

  if (word1) {
    // if the word is already in the local storage, but the delete staute is true, update the queryTimes
    word1.queryTimes += 1;
    word1.isDeleted = false;
    word1.deleteTimes += 1;
    await addWordLocal(word1);
  } else {
    const wordNew: IWordStorage = {
      word: word,
      queryTimes: 1,
      isDeleted: false,
      deleteTimes: 0,
    };
    await addWordLocal(wordNew);
  }
}
