import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    ssr: {
      noExternal: [
        '@webext-core/storage',
        '@webext-core/messaging',
      ],
    },
  }),
  extensionApi: 'chrome',
  manifest: {
    name: 'Meow-translate',
    version: '0.1',
    permissions: ['tabs', 'storage', 'activeTab'],
  },
  runner: {
    startUrls: [
      'https://github.com/trending/typescript?since=daily',
    ],
  },
})
