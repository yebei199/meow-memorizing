# 词库存储后端的天花板，以及未来迁往 IndexedDB 的路径

## Status

accepted — 记录结论与触发条件，本次**不改代码**

## 背景

[ADR-0004] 把词库从 `sync` 区的整本 blob 改成 `local` 区一词一条，修掉了 8192 字节单条目
配额导致的静默失效，并按 5 万词的设计目标声明了 `unlimitedStorage`。随后有两个问题需要
回答：这个权限真的必需吗？浏览器内置的 DB 能不能用？

两个问题都用真实扩展实测过（两份 manifest 对照、真实 `chrome.storage` 与 IndexedDB），
下面是数据，不是估算。

## 实测数据

三种存储在 MV3 worker 中的对比：

| | `localStorage` | `chrome.storage.local`（现状） | IndexedDB |
|---|---|---|---|
| worker 中可用 | ❌ `undefined` | ✅ | ✅ |
| 容量上限 | — | **10MB**（`kQuotaBytes`） | **10GB**（`navigator.storage.estimate` 报 10240MB） |
| 无 `unlimitedStorage` 写 25MB | — | ❌ 10,366,893 字节处抛错 | ✅ 成功，用量 13MB |
| 5 万词占用 | — | 7,366,872 字节（7.03MB） | 同等 |
| 选词单条写入（热路径） | — | 24ms | **0ms** |
| 单词读取 | — | 0ms | 0ms |
| 冷启动读全量 5 万词 | — | 182ms | **121ms** |
| 5 万词批量写（仅迁移时） | — | 445ms | 791ms |

补充两个容易踩的事实：

- `localStorage` 是同步 API，**MV3 service worker 里不存在**（实测 `typeof` 为
  `undefined`）。匹配器活在 worker 里（见 [ADR-0002]），所以它从来不是候选项——
  注意它与 `chrome.storage.local` 是两回事，名字像而已。
- `chrome.storage.local.QUOTA_BYTES` 恒返回 `10485760`，**有无 `unlimitedStorage` 都一样**。
  它是静态常量，不反映当前真实上限，代码里不能靠读它判断还能写多少。

## 结论

**`unlimitedStorage` 对 5 万词的设计目标零收益，因此不必需。** 5 万词占 7.03MB，是 10MB
默认上限的 70%，不带该权限也装得下；余下约 3MB 约合再放 2 万词。该权限买的是**7 万词
以上**的空间，不是 5 万词本身。它确实有效（带上后 25MB 写入成功，总量 32.4MB），只是当前
用不上。

**IndexedDB 在每个维度上都不劣于现状，且让权限问题彻底消失**：容量高三个数量级、热路径
更快、冷启动更快，无需任何额外权限。唯一劣势是 5 万词批量写慢一倍（791ms vs 445ms），
而那只在迁移时发生一次，不在热路径上。

**但现状已经够用，所以现在不换。** 换 IndexedDB 需要自己写 open/upgrade/transaction 管道
（`chrome.storage` 有 WXT 的 `storage` 封装现成可用），更重要的是它意味着**第二次动用户
真实词库的迁移**——[ADR-0004] 刚做过一次。为了一个尚未触及的天花板再担一次数据风险，
不值得。

**跨设备同步与本议题无关，且已经没有了。** [ADR-0004] 从 `sync` 区搬走时同步就已失去，
这是当时接受的代价。IndexedDB 在这点上不是新损失——浏览器内置存储里只有
`chrome.storage.sync` 自动同步，而它单条目 8KB / 总量 100KB / 512 条目，约 500 词封顶，
与 5 万词的目标差两个数量级。**"自动同步 + 大容量"在浏览器内置能力里不存在**，真要同步
只能手动导出/导入或自建后端，那是独立的产品决策。

## 触发条件：什么时候该迁 IndexedDB

出现下列任一情况即启动迁移，不必再讨论：

- 词库逼近 **7 万词**（约 10MB）。
- 决定缓存 `definition` 释义字段进词条。目前释义只在内存 `translationCache` 里存 5 分钟
  （见 `src/components/transline/transUtils.ts`），一旦落盘，每条会从约 150 字节涨到上千，
  **几千词就能吃掉 10MB**——这是比词数增长快得多的触发路径。
- 需要按前缀/词频等条件查询词库，而不只是整本读出来过滤。

迁移成本可控：`storageManager.ts` 的公开 API（`getWordsList`/`queryWord`/`addWordLocal`/
`watchWords`）是词库的唯一出入口，所有消费方都走它，因此只需重写其内部实现 + 加一次
`local` → IndexedDB 的迁移，`tests/core/storageManager.test.ts` 与
`storageMigration.test.ts` 的用例基本可原样复用（断言键布局的两条除外）。

**先别加 `unlimitedStorage` 来续命**：它只把天花板从 7 万词推到无限，但那时若真需要无限
容量，IndexedDB 才是正解，加权限只是拖延并留下一个要向商店解释的权限。

## 已知缺陷（本 ADR 不修）

`addWordLocal` 写入失败时抛错，而 `AddButton` 的 `mouseup` 监听器没有兜底，整条选词链
静默中断——这正是 [ADR-0004] 那次 8KB 配额故障的表现放大器。**撞上 10MB 上限时，症状会与
那次一模一样**：选词不翻译不高亮，已有下划线照常显示。天花板换了，失败模式没换。

## 考虑过的替代方案

- **保留 `unlimitedStorage`**：零代码改动，但对 5 万词零收益，且新增一个需向商店审核解释、
  可能出现在安装提示里的权限。收益为零的权限不该留。
- **`sync` 区放精简索引 + `local` 放全量**：想找回同步。100KB 大约只能同步 8000 个裸词串，
  仍不够 5 万，且两处状态会漂移。复杂度最高、上限还是不够，最不推荐。
- **现在就迁 IndexedDB**：技术上更优，但把第二次数据迁移的风险提前到没有实际需求的时候。
  等触发条件到了再做。

[ADR-0002]: ./0002-worker-owns-word-set.md
[ADR-0004]: ./0004-per-word-local-storage.md
