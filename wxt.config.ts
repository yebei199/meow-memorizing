import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    ssr: {
      noExternal: [
        '@webext-core/storage',
        '@webext-core/messaging',
        '@webext-core/proxy-service',
      ],
    },
  }),
  extensionApi: 'chrome',
  manifest: {
    name: 'Meow-translate',
    version: '0.1.2',
    permissions: ['tabs', 'storage', 'activeTab'],
  },
  runner: {
    startUrls: [
      'https://wxt.dev/guide/go-further/vite.html#basic-vite-configuration',
    ],
  },
})
