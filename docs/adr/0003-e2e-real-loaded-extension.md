# E2E 改用真实加载的扩展，取代 bundle-injection stand-in

## Status

accepted

## 背景与决定

[ADR-0002] 把词表状态的所有权移进后台 service worker，其正确性只有在**真实 MV3 worker 生命周期**下才谈得上——冷启动补水、被回收后自愈。原来的 `bundleHarness` 是"注入内容脚本 bundle"的 stand-in：它用另一个页面直接调 WASM 冒充 worker，从不执行 `background.ts`，且假 `browser.storage` 的 `onChanged` 是空实现。这种台子结构上**测不到** worker 拥有词表这条新路径。

**决定**：e2e 全量迁到真实加载的扩展。用 Playwright `launchPersistentContext` 加 `--load-extension` 载入 `.output/chrome-mv3`，跑真 `background.ts`、真 `chrome.storage`、真消息通道。已实测验证：

- 必须用 Playwright 自带的 **Chromium** 二进制。品牌版 Chrome 137+ 已彻底禁用 `--load-extension`（这正是 stand-in 当初绕开真扩展的原因），本机受管控的 google-chrome 会静默忽略该 flag、扩展列表为空。
- **确定性模拟 worker 回收**：CDP `Target.closeTarget(<service_worker targetId>)` 停掉 SW，下次事件触发时起一个**全新实例**（自定义的 `self.__instanceMark` 变回 undefined，证明模块/全局状态已清空）。因此无需死等 30s 空闲超时，测试稳定不 flaky。
- 词典请求 `trans`（必应）此时由真 background 发出，用 `context.route('**/dict/clientsearch**', …)` 在上下文层拦截（覆盖 SW 发起的网络请求），替代原 harness 的 `transResponse`。
- 去掉了启动参数 `--no-sandbox`（Chromium 会将其报为 unsupported）。

## 考虑过的替代方案

- **只加一个真扩展回归 spec、旧 spec 留在 stand-in**：改动更小，但长期维护两套 harness、两种 storage/`trans` 模型，割裂且易腐化。选择一次性迁移，删掉 stand-in。

## 连带影响

- e2e 依赖一个能被 `--load-extension` 接受的 Chromium 二进制；`playwright.config.ts` 需指向它（`PLAYWRIGHT_CHROME` 或 `npx playwright install chromium`），CI 同理。
- 每个 spec 运行前需先 `bun run build`（或复用已构建的 `.output/chrome-mv3`）。

[ADR-0002]: ./0002-worker-owns-word-set.md
