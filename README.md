# Meow Memorizing

> 一个简单易用的记单词浏览器插件：在日常浏览网页时自动高亮生词，选词即可查询和加入词库，让背单词融入真实阅读场景。([讨论](https://github.com/yebei199/meow-memorizing/discussions))

![License](https://img.shields.io/github/license/yebei199/meow-memorizing.svg)

![ts](https://img.shields.io/badge/typescript-blue?logo=typescript&logoColor=white)
![react](https://img.shields.io/badge/react-blue?logo=react&logoColor=white)
![biome](https://img.shields.io/badge/biome-red?logo=biome&logoColor=white)
![Linux](https://img.shields.io/badge/-Linux-yellow?logo=linux&logoColor=white)
![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)
![MacOS](https://img.shields.io/badge/-macOS-black?&logo=apple&logoColor=white)

<hr/>

## 项目简介

Meow Memorizing 是一个基于 WXT + React 的跨浏览器扩展，面向希望通过英文网页阅读积累词汇的用户。插件会把用户保存的单词同步到页面扫描流程中，在网页正文里自动标出已收藏单词；用户也可以直接选中页面上的新词，查看释义并加入自己的词库。

项目的核心设计目标是：使用门槛低、页面侵入少、匹配性能稳定。词匹配热点逻辑由 Rust 编译到 WASM，通过 Aho-Corasick 自动机一次扫描完成多词匹配，避免在大词表下用 JavaScript 对每个单词反复 `indexOf` 带来的性能退化。

## 已上架 Chrome Web Store

https://chromewebstore.google.com/detail/ginipindgefglbpiaogadmdknaaojdhp?utm_source=item-share-cb

## 使用演示

![example.gif](https://upload.cryptorust.uk/u/67HVap.gif)

## 功能亮点

- 自动高亮词库单词：打开网页后自动扫描文本节点，并标出用户已保存的单词。
- 划词查询与收藏：在页面中选中新词即可弹出释义卡片，并支持加入词库。
- 词库管理：在扩展弹窗中查看、搜索、筛选已保存单词，结合查询次数和删除次数辅助复习。
- 删除状态处理：被删除的单词会进入独立匹配流程，避免页面上的旧高亮状态残留。
- 深浅色适配：根据页面环境处理高亮与释义卡片的显示体验。
- Chrome / Firefox 打包：通过 WXT 统一维护浏览器扩展入口和发布产物。

## 技术栈

| 方向 | 技术 |
| --- | --- |
| 扩展框架 | WXT、Manifest V3 |
| 前端界面 | React 19、TypeScript、Ant Design、Tailwind CSS |
| 扩展能力 | `@webext-core/storage`、`@webext-core/messaging` |
| 高性能匹配 | Rust、WASM、aho-corasick、wasm-bindgen |
| 包管理与构建 | Bun、Vite、TypeScript |
| 代码质量 | Biome、oxlint、Cargo fmt、Clippy |
| 测试 | Vitest、Playwright e2e / benchmark、Cargo test |

## 架构优势

### Rust + WASM 高性能词匹配

整页扫描单词的热点计算下沉到 Rust 编译的 WASM 后端
(`crates/wasm-matcher`)，用 Aho-Corasick 自动机一次扫描全部命中，
替代原先 `O(文本 × 单词数)` 的 `indexOf` 嵌套循环，匹配性能与单词表
规模无关。自动机按单词表缓存复用；WASM 以 base64 内联进扩展包，
不需要额外 fetch，也不需要配置 `web_accessible_resources`。

无 JS 兜底：不支持 WASM 的浏览器即不支持本插件。这个取舍可以让运行路径更简单，也避免维护两套匹配语义。

详见 `crates/wasm-matcher/README.md` 与 `src/wasm/README.md`。

### MV3 CSP 兼容

WASM 初始化运行在 background service worker 中，content script 通过消息调用 matcher。这样可以避开宿主页 CSP 对 `WebAssembly.Module` 的限制，在 GitHub、X 等严格 CSP 页面上仍能稳定高亮。

### 自包含发布产物

`scripts/build-wasm.sh` 会用 release 模式构建 wasm32 目标，再由
`scripts/inline-wasm.ts` 把 `.wasm` 嵌入生成文件。扩展运行时不需要
再拉取额外的 WASM 资源，发布产物更容易在扩展商店和本地安装环境中保持一致。

## 开发

安装依赖：

```shell
bun install
```

启动开发环境：

```shell
bun run dev
```

Firefox 开发环境：

```shell
bun run dev:firefox
```

生成 WASM：

```shell
bun run wasm
```

## 打包

```shell
bun run build
```

产物位置：

- Chrome zip: `.output/meow-memorizing-<version>-chrome.zip`
- Firefox zip: `.output/meow-memorizing-<version>-firefox.zip`
- Source zip: `.output/meow-memorizing-<version>-sources.zip`
- Chrome 已解压目录: `.output/chrome-mv3-build`

之后谷歌浏览器开发者模式可直接安装已解压目录；商店或发布流程使用对应 zip。

构建会自动先生成 WASM (`bun run wasm`)，需要 `wasm32-unknown-unknown`
目标与匹配版本的 `wasm-bindgen-cli`（当前固定为 `0.2.122`）。

## 常用命令

```shell
bun run compile
bun run check:rust
bun run lint:rust
cargo test -p wasm-matcher
bun run test:e2e
```

说明：

- `bun run compile`：TypeScript 类型检查。
- `bun run check:rust`：检查 WASM crate 的 wasm32 编译目标。
- `bun run lint:rust`：执行 `cargo fmt --all --check` 与 Clippy。
- `cargo test -p wasm-matcher`：运行 Rust matcher 单元测试。
- `bun run test:e2e`：运行 Playwright e2e 与基准测试。

## 相关文档

- [版本日志](./docs/CHANGELOG.md)
- [WASM matcher](./crates/wasm-matcher/README.md)
- [WASM 前端胶水层](./src/wasm/README.md)
- [构建脚本](./scripts/README.md)

## 参与贡献

欢迎提交 issue、PR，或者在 [Discussions](https://github.com/yebei199/meow-memorizing/discussions) 里交流使用体验和改进建议。

## License

Code: (c) 2024 - Present - yebei199

**License**: GPL-3.0-only

**License Text**: [View License Text](LICENSE)
