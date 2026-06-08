/**
 * 核心类型定义
 */

export interface IWordStorage {
  word: string;
  definition?: string;
  example?: string;
  isDeleted: boolean;
  queryTimes: number;
  deleteTimes: number;
}

export interface IAllWordsStorage {
  [key: string]: IWordStorage;
}

export interface IWordQuery {
  word: string;
}

/** One word match, mirroring the WASM matcher `{ index, word, end }` contract. */
export interface IWordMatch {
  index: number;
  word: string;
  end: number;
}

/** Active + deleted word lists pushed to the background matcher. */
export interface IMatcherWords {
  active: string[];
  deleted: string[];
}

export interface ExtensionStorageSchema {
  myWords: IAllWordsStorage;
  // 网站主题模式，true表示深色模式，false表示浅色模式
  isWebsiteDarkMode: boolean;
}
