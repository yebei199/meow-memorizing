# 后台 worker 自己拥有词表，取代内容脚本推送 + 签名缓存

## Status

accepted

## 背景与决定

高亮用的 Aho-Corasick 自动机因页面 CSP 只能活在后台 service worker 里（见 [ADR-0001] 的高亮排除逻辑与 `csp-matcher` 回归测试）。原设计由**内容脚本**把 active/deleted 词集 `sendMessage('matcherSetWords')` 推给 worker，并在内容脚本侧用 `lastSig` 签名缓存跳过"词集没变就不重推"。

问题在于 MV3 的 service worker 是**短命的**：Chrome 空闲约 30s 就回收它，`set_words` 建好的自动机随之清零；而 `lastSig` 缓存活在**与页面同寿命**的内容脚本模块里。worker 被回收后，内容脚本仍以为"已同步"，于是跳过重推，之后每次 `matcherFindMatches` 都命中一个空匹配器——整页高亮静默失效，直到整页刷新才复位。这就是"在 karakeep 上点任何词都不再高亮"的根因。

**决定**：让 worker 成为词表的唯一消费者，自己从 storage 补水。worker 冷启动时读一次 `sync:myWords` 建自动机（首次 `find` 会 await 这次读取，杜绝空窗），运行期用 `myWords.watch()` 在词表变化时重建。内容脚本不再推词表，只发文本、收匹配。`splitWordSets`（三标志排除并集，见 [ADR-0001]）下沉到 `src/core` 的纯函数，由 worker 调用。

## 考虑过的替代方案

- **冷启动握手补丁**（曾短暂落地）：worker 对冷启动的 `find` 抛 `MATCHER_COLD`，内容脚本捕获后清 `lastSig`、重推、重试一次。能修但只是给"内容脚本推送"这套脆弱模型打补丁，仍保留了跨上下文状态错位这一整类 bug 的土壤。改为 storage 补水后，`matcherSetWords`、`IMatcherWords`、`MATCHER_COLD`、`ensureWords`/`computeSig`/`lastSig` 全部删除，净减代码。
- **保活 worker**（chrome.alarms / 长连 Port 心跳）：与平台对着干、浪费资源、且脆弱，只是掩盖问题而非消除。

## 连带影响

- deleted-match 链路（`findDeletedWords` + `matcherFindDeleted` 消息 + Rust `find_deleted_matches`/`find_deleted`）本就无人调用，随本次一并端到端删除，`set_words` 从 `(active, deleted)` 收窄为 `(active)`，需重建 WASM。
- worker 每次词表变化整表重建自动机；词库规模（数百至数千）下成本可忽略。

[ADR-0001]: ./0001-split-word-lifecycle-states.md
