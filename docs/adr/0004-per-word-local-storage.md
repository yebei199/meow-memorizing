# 词库改存 local 区、一词一条，取代 sync 区的整本 blob

## Status

accepted

## 背景与决定

词库原先整本存在 `sync:myWords` 一个条目里。`chrome.storage.sync` 的单条目上限是
**8192 字节**（`kQuotaBytesPerItem`），而 [ADR-0001] 给每条词记录新增了
`isIgnored`/`isUntranslatable`/`lastAttemptAt` 三个字段，一条约 150 字节——**约 54 个词
就顶到上限**，之后 `addWordLocal` 的每次写入都抛 `Resource::kQuotaBytesPerItem quota
exceeded`。

故障表现极具迷惑性：选词链路是 `mouseup → addQueriedWord（写词库）→ processPageWords →
弹翻译面板`，第一步抛错后整条链在事件监听器里静默中断，所以**选中任何词都不翻译也不
高亮**；而已有下划线只依赖"读 storage + 后台匹配"，读不受配额限制，**照常显示**。这个
"半死不活"的表象很像 [ADR-0002] 修的 worker 回收问题，实际无关。开发模式下 profile 是
空的，词库远未到 54 词，所以一切正常——这是数据量问题，不是代码问题。

**决定**：词库改存 `local` 区，且**一词一条**（`local:word:<单词>`）。

- **换 local**：解除 sync 的 8KB 单条目 / 100KB 总量 / 512 条目三重上限。代价是失去
  Chrome 账号跨设备同步；按 5 万词的设计目标，sync 无论如何都装不下（实测 5 万词约
  6.97MB）。
- **一词一条**：整本 blob 下每次选词都要"读整本 → 改一条 → 写整本"。实测 5 万词时这个
  往返 **536ms**，且随词库线性增长，而它落在每次 mouseup 的热路径上；分键后只写那一条，
  **24ms**（22 倍）。worker 冷启动仍需读全量建自动机（约 190ms），两种形状一样——那是
  自动机要全部词导致的，与存储形状无关，且不在热路径上。
- **不申请 `unlimitedStorage`**：本 ADR 初稿曾声明该权限，理由是"5 万词占 10MB 上限的
  70%，没有余量"。实测推翻了这个理由——不带它也装得下，余下约 3MB 约合再放 2 万词，
  该权限买的是 **7 万词以上**的空间，而非 5 万词本身。零收益的权限不留；天花板真到了，
  正解是 IndexedDB 而不是加权限续命。完整实测与触发条件见 [ADR-0005]。

数据均在真实扩展 + 真实 `chrome.storage` 下实测，非估算。

## 连带影响

- **迁移**：`migrateLegacySyncWords()` 在 worker 冷启动、首次 `find` 之前跑一次，把
  `sync:myWords` 整本拆成逐词的 local 键。靠 `local:wordsMigratedFromSync` 标记判断是否
  已迁移，而非"local 是否为空"——否则用户迁移后删掉的词会在下次启动时复活。已存在于
  local 的词不覆盖（本地的才是更新的那份）。不删 sync 原数据：那 8KB 另作他用不了，留着
  当安全网。
- **修掉一个共享 fallback 别名 bug**：`storage.defineItem('sync:myWords', { fallback: {} })`
  的 `fallback` 是模块级的同一个对象，空存储时 `getValue()` 返回的就是它本身，而
  `addWordLocal` 的"读整本→改→写回"会就地修改它。于是词库为空时新增的词会永久污染
  fallback，一旦存储再次变空（全新安装、同步重置）这些词会自己复活。分键后
  `getWordsList()` 每次从快照现建对象、`queryWord` 不用共享 fallback，该 bug 随形状改造
  消失，并由 `does not resurrect words the user deleted after migrating` 用例把守。
- **修掉一个扫描竞态**：`AddButton` 是 `await addQueriedWord()` 后立刻 `processPageWords()`。
  存储写入的 ack 回到内容脚本、与 `storage.onChanged` 送达 worker 是两条独立 IPC，**没有
  顺序保证**；整页只扫这一次，抢输了刚加的词就永远不高亮。词表小时重建抢得赢，所以该
  竞态自 [ADR-0002] 起一直潜伏，直到 5000 词用例（读快照约 200ms）才必现。新增
  `matcherReloadWords` 消息作为有序屏障：`processPageWords` 先 await 它，worker 重读词表
  后才应答后续 `find`。`watchWords` 仍保留，负责其他上下文（词汇书页面）改动词库时让活着
  的 worker 保持新鲜。
- **测试分层**：8192 字节配额由真实 `chrome.storage` 施加，vitest 的 `fakeBrowser` 是内存
  存储、不模拟配额——这正是旧设计能一路通过单元测试却在真实浏览器里死掉的原因。故配额
  回归只能落在 e2e（`tests/e2e/large-vocabulary.spec.ts`）。e2e 用 5000 词（已超 sync 总量
  上限 7 倍）验证天花板解除；5 万词的成本已在本 ADR 记录，不必让 CI 每次重付。
- `src/wxtStore.ts` 里那份重复的 `sync:myWords` 定义与缺少三态字段的 `IWordStorage` 一并
  删除，只留重新导出——留着它只会让下一个改存储的人改错地方。

## 考虑过的替代方案

- **local + 单 blob**（改动最小）：能治当前故障，几千词内体验正常，但 5 万词时选词 536ms、
  占配额 70%，将来需要第二次迁移。迁移代码动的是用户真实词库，写两遍就要担两遍数据丢失
  的风险，故一次到位。
- **sync 分键**：保留跨设备同步且单条目永不超限，但 sync 总共 512 条目、100KB，词汇量上限
  约 500 词，且每分钟写入限 120 次——与 5 万词的设计目标直接冲突。
- **IndexedDB**：容量与查询能力都更强，当前瓶颈不在此，先不引入。

  > **后续修正（见 [ADR-0005]）**：本 ADR 初稿推测"冷启动读全量那笔跑不掉，IndexedDB
  > 无优势"，实测推翻了——它冷启动读 5 万词反而更快（121ms vs 182ms），热路径写入也更快
  > （0.06ms vs 24ms），容量高三个数量级且不需要任何权限。不引入的真正理由是**现状对 5 万
  > 词的设计目标已经够用**，而它要放弃 WXT 现成的存储封装、自写事务管道——不是性能。
  > 触发条件见 [ADR-0005]。

[ADR-0001]: ./0001-split-word-lifecycle-states.md
[ADR-0002]: ./0002-worker-owns-word-set.md

[ADR-0005]: ./0005-storage-backend-ceiling-and-indexeddb.md
