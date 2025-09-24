import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  vite: () => ({
    ssr: {
      noExternal: [
        '@webext-core/storage',
        '@webext-core/messaging',
        '@webext-core/proxy-service',
      ],
    },
  }),
  targetBrowsers: ['chrome', 'firefox'],
  manifest: {
    description: '记单词的小插件',
    permissions: ['storage'],
    homepage_url:
      'https://github.com/yebei199/meow-memorizing',
  },
  webExt: {
    startUrls: [
      'https://wxt.dev/guide/introduction.html',
      'https://github.com/trending?since=daily',
    ],
  },
});
