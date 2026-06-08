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
    // NixOS: Chrome requires --no-sandbox in a sandboxed environment.
    chromiumArgs: ['--no-sandbox'],
  },
});
