import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 启用全局测试API，无需导入
    globals: true,

    // 指定测试环境
    environment: 'node',

    // 匹配测试文件的模式
    include: ['tests/**/*.{test,spec}.{ts,js}'],

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
})
