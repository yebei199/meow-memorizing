import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  vite: () => ({
    // wasm-bindgen generated JS uses `new URL('matcher_bg.wasm',
    // import.meta.url)`. Without this, Vite doesn't recognise .wasm and
    // hangs during dev "Preparing..." while trying to resolve the asset.
    assetsInclude: ['**/*.wasm'],
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
    // 词库一词一条存在 local 区,10MB 默认上限约合 7 万词,5 万词的设计目标
    // 装得下(实测占 70%),所以不申请 unlimitedStorage——零收益的权限不留。
    // 真撞到天花板时正解是 IndexedDB,见 docs/adr/0005。
    permissions: ['storage'],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
    homepage_url:
      'https://github.com/yebei199/meow-memorizing',
  },
  webExt: {
    startUrls: [
      'https://wxt.dev/guide/introduction.html',
      'https://github.com/trending?since=daily',
    ],
    chromiumArgs: [],
  },
  zip: {
    excludeSources: [
      'target/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
});
