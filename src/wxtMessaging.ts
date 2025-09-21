// 从新核心模块重新导出类型和消息函数
export type { IWordQuery } from './core/types'
export { sendMessage, onMessage } from './core/messaging'