import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  // entrypointLoader: 'jiti',
  vite: () => ({
    ssr: {
      noExternal: [
        '@webext-core/storage',
        '@webext-core/messaging',
        '@webext-core/proxy-service',
      ],
    },




  }),
  targetBrowsers: [ 'chrome','firefox' ],
  manifest: {
    description: '记单词的小插件',
    permissions: [ 'storage', 'activeTab'],
  },
  webExt: {
    startUrls: [
      'https://wxt.dev/get-started/migrate-to-wxt.html',
    ],
  },
})
