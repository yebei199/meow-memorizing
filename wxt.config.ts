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
  extensionApi: 'chrome',
  manifest: {
    name: 'meow-memorizing',
    version: '0.1.6',
    permissions: ['tabs', 'storage', 'activeTab'],
  },
  runner: {
    startUrls: [
      'https://wxt.dev/get-started/migrate-to-wxt.html',
    ],
  },
})
