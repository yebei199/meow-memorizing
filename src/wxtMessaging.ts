import type { IWordQuery } from '@/entrypoints/trans.content/script/TransLine.tsx'
import { defineExtensionMessaging } from '@webext-core/messaging'

interface ProtocolMap {
  trans(data: IWordQuery): string
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>()
