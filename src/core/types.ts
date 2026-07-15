/**
 * 核心类型定义
 */

export interface IWordStorage {
  word: string;
  definition?: string;
  example?: string;
  /** 已记住：用户主动从词汇书移除，选中时行为不受影响，可能变回 false（见 wordProcessor.addQueriedWord）。 */
  isDeleted: boolean;
  /** 停用词：用户标记为永不翻译，只能通过 ignoreWord/unignoreWord 修改。 */
  isIgnored: boolean;
  /** 查无翻译：系统自动标记，冷却期见 UNTRANSLATABLE_RETRY_COOLDOWN_MS。 */
  isUntranslatable: boolean;
  /** 上一次查无翻译判定的时间戳（配合 isUntranslatable 冷却重试）。 */
  lastAttemptAt: number;
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
