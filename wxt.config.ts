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
  },
  webExt: {
    startUrls: [
      'https://www.google.com/search?q=Tiny+Glade+used+bevy%3F&oq=Tiny+Glade+used+bevy%3F&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDgxMDNqMGo3qAIIsAIB&sourceid=chrome&ie=UTF-8',
    ],
  },
});
