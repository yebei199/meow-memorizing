import '@/public/global.css'
import startTrans from '@/entrypoints/trans.content/script/startTrans.ts'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'manifest',
  runAt: 'document_end',
  async main() {
    startTrans().catch(console.error)
  },
})
