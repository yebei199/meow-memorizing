import React from 'react'
import ReactDOM from 'react-dom/client'
import { ContentScriptContext } from 'wxt/client'
import '@/entrypoints/global.css'
import startTrans from '@/entrypoints/trans.content/script/startTrans.ts'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'manifest',
  runAt: 'document_end',
  async main(ctx) {
    // const ui = await createUi(ctx)
    // ui.mount()
    startTrans().catch(console.error)
  },
})

//
// Mantine doesn't work with shadow roots by default. We have to pass custom
// values for the MantineProvider's `cssVariablesSelector` and `getRootElement`
// options.
//
// We'll point both at the HTML element inside the shadow root WXT creates.
//

function createUi(ctx: ContentScriptContext) {
  return createShadowRootUi(ctx, {
    name: 'mantine-example',
    position: 'inline',
    append: 'first',
    onMount(uiContainer, shadow) {
      // 获取该 DOM 元素
      const app = document.createElement('div')
      uiContainer.append(app)

      // Create a root on the UI container and render a component
      const root = ReactDOM.createRoot(app)
      root.render(<span></span>)
      return root
    },
    onRemove(root) {
      root?.unmount()
    },
  })
}
