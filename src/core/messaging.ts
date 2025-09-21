import { defineExtensionMessaging } from '@webext-core/messaging'
import type { IWordQuery } from './types'

interface ProtocolMap {
  trans(data: IWordQuery): string
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>()