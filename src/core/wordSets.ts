import type { IAllWordsStorage } from './types';

/**
 * 一个词是否被排除出高亮：已记住（isDeleted）、停用词（isIgnored）、
 * 查无翻译（isUntranslatable）三者取并集。三态语义见 CONTEXT.md 与
 * docs/adr/0001-split-word-lifecycle-states.md。
 */
export function isExcluded(entry: {
  isDeleted?: boolean;
  isIgnored?: boolean;
  isUntranslatable?: boolean;
}): boolean {
  return Boolean(
    entry.isDeleted ||
      entry.isIgnored ||
      entry.isUntranslatable,
  );
}

/**
 * 从整张词表里挑出应当在页面上高亮的词（即未被排除的词）。
 * 后台 worker 用它把 storage 里的词表喂给匹配器自动机。
 * 历史数据缺失新字段时按 false 处理（见 [ADR-0001] 兼容策略）。
 */
export function activeWords(
  wordsList: IAllWordsStorage,
): string[] {
  const active: string[] = [];
  for (const key of Object.keys(wordsList)) {
    const entry = wordsList[key];
    if (!entry || typeof entry.word !== 'string') continue;
    if (!isExcluded(entry)) active.push(entry.word);
  }
  return active;
}
