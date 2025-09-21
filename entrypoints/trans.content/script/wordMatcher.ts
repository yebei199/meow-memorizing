/**
 * 查找文本中的匹配单词
 */
export function findMatchingWords(
  text: string,
  wordsList: Record<string, any>,
): { index: number; word: string; end: number }[] {
  const words = Object.keys(wordsList)
    .filter((wordKey) => !wordsList[wordKey].isDeleted)
    .map((wordKey) => wordsList[wordKey].word)
    .sort((a, b) => b.length - a.length); // 按长度排序，优先匹配长单词

  // 查找所有匹配的单词
  const matches: {
    index: number;
    word: string;
    end: number;
  }[] = [];

  // 使用一个更精确的匹配算法，避免重叠匹配
  let lastIndex = 0;
  const textLower = text.toLowerCase();

  outer: while (lastIndex < text.length) {
    for (const word of words) {
      const wordLower = word.toLowerCase();
      const index = textLower.indexOf(wordLower, lastIndex);

      if (index >= 0) {
        // 检查是否是单词边界
        const beforeChar =
          index > 0 ? text[index - 1] : ' ';
        const afterChar =
          index + word.length < text.length
            ? text[index + word.length]
            : ' ';
        const isWordBoundary =
          /^[^a-zA-Z]$/.test(beforeChar) &&
          /^[^a-zA-Z]$/.test(afterChar);

        if (isWordBoundary) {
          matches.push({
            index: index,
            word: text.substring(
              index,
              index + word.length,
            ), // 保持原始大小写
            end: index + word.length,
          });
          lastIndex = index + word.length;
          continue outer;
        } else {
          lastIndex = index + 1;
        }
      }
    }

    lastIndex++;
  }

  // 如果没有匹配的单词，直接返回
  if (matches.length === 0) return [];

  // 按索引排序匹配项
  matches.sort((a, b) => a.index - b.index);

  return matches;
}
