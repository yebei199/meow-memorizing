import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  // WxtVitest 提供 wxt.config.ts 里声明的 @/ 路径别名解析、全局变量（如 storage/browser）
  // 以及浏览器扩展 API 的 mock，测试 content-scripts/components 下依赖这些的代码需要它。
  plugins: [WxtVitest()],
  test: {
    // 启用全局测试API，无需导入
    globals: true,

    // 指定测试环境
    environment: 'node',

    // 匹配测试文件的模式（e2e 由 Playwright 运行，排除）
    include: ['tests/**/*.{test,spec}.{ts,js}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
    ],

    // 测试覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['node_modules/', 'tests/'],
    },

    // TypeScript支持配置
    typecheck: {
      enabled: true,
    },

    // 设置测试文件的超时时间（毫秒）
    testTimeout: 10000,

    // 设置钩子函数的超时时间（毫秒）
    hookTimeout: 10000,
  },
});
