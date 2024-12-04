const ALL_WORD_TYPE = [
  'n\\.', // 使用双反斜杠来转义点字符
  'web\\.',
  'v\\.',
  'adj\\.',
  'adv\\.',
  'prep\\.',
  'pron\\.',
  'conj\\.',
  'intj\\.',
].join('|')

export function addLineBreak(str: string): string {
  // 构建正则表达式以匹配任意一个词性缩写，并且前面可能有空格或其他非字母字符
  const regex = new RegExp(
    `(?<=^|[^a-zA-Z])(${ALL_WORD_TYPE})(?=\\s|$)`,
    'g',
  )

  // 使用正则表达式全局替换，在每个匹配到的词性缩写前插入换行符
  return str.replace(regex, '\n$1').trimStart() // trimStart 移除开头的换行符
}

const test1 =
  'n. （国家或机构的）基础设施; web. 基础建设；基础结构；基础架构'
console.log(addLineBreak(test1))
