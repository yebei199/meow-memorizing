
# Meow Memorizing

> 🐈️  一个简单易用的记单词浏览器插件 ([讨论](https://github.com/yebei199/meow-memorizing/discussions))

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing.svg?type=small)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing?ref=badge_small)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing.svg?type=shield&issueType=security)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing?ref=badge_shield&issueType=security)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing?ref=badge_shield&issueType=license)
![License](https://img.shields.io/github/license/yebei199/meow-memorizing.svg)

![ts](https://img.shields.io/badge/typescript-blue?logo=typescript&logoColor=white)
![react](https://img.shields.io/badge/react-blue?logo=react&logoColor=white)
![biome](https://img.shields.io/badge/biome-red?logo=biome&logoColor=white)
![Linux](https://img.shields.io/badge/-Linux-yellow?logo=linux&logoColor=white)
![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)
![MacOS](https://img.shields.io/badge/-macOS-black?&logo=apple&logoColor=white)

<hr/>

# 已上架谷歌商店
https://chromewebstore.google.com/detail/ginipindgefglbpiaogadmdknaaojdhp?utm_source=item-share-cb
# 使用方法如下

![example.gif](https://upload.cryptorust.uk/u/67HVap.gif)

## 打包

```shell
bun run build
```

产物位置:
- Chrome zip: `.output/meow-memorizing-<version>-chrome.zip`
- Firefox zip: `.output/meow-memorizing-<version>-firefox.zip`
- Source zip: `.output/meow-memorizing-<version>-sources.zip`
- Chrome 已解压目录: `.output/chrome-mv3-build`

之后谷歌浏览器开发者模式可直接安装已解压目录；商店或发布流程使用对应 zip。

## 高性能词匹配 (Rust + WASM)

整页扫描单词的热点计算下沉到 Rust 编译的 WASM 后端
(`crates/wasm-matcher`)，用 Aho-Corasick 自动机一次扫描全部命中，
替代原先 `O(文本 × 单词数)` 的 `indexOf` 嵌套循环，匹配性能与单词表
规模无关 (大词表下实测约 22×)。自动机按单词表缓存复用；WASM 以 base64
内联进 content script。无 JS 兜底：不支持 WASM 的浏览器即不支持本插件。
详见 `crates/wasm-matcher/README.md` 与 `src/wasm/README.md`。

构建会自动先生成 WASM (`bun run wasm`)，需要 `wasm32-unknown-unknown`
目标与匹配版本的 `wasm-bindgen-cli`（当前固定为 `0.2.122`）。

# 依赖
- 框架: WXT + React
- 高性能计算: Rust + WASM (aho-corasick)
- 格式化: biome
- 包管理: bun
- 测试: vitest (单元) + Playwright (e2e/基准，`bun run test:e2e`)
- [版本日志](./docs/CHANGELOG.md)

# 其他
欢迎提交issue,提交pr,或者[聊天吹水](https://github.com/yebei199/meow-memorizing/discussions)

之后的计划是懒得优化, 还是有很多bug, 但够用就行了

## License
Code: (c) 2024 - Present - yebei199

**License**: GPL-3.0-only

**License Text**: [View License Text](LICENSE)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyebei199%2Fmeow-memorizing?ref=badge_large)
