import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Trending Typescript',
    permissions: [
      'tabs',
      'storage',
      '<all_urls>',
      'activeTab',
      'dns',
    ],
  },
  runner: {
    startUrls: [
      'https://github.com/trending/typescript?since=daily',
    ],
  },
})
