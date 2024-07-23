import { defineExtensionMessaging } from '@webext-core/messaging'
import { IWordQuery } from '@/entrypoints/trans.content/TransLine.tsx'

interface ProtocolMap {
  trans(data: IWordQuery): string
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>()
