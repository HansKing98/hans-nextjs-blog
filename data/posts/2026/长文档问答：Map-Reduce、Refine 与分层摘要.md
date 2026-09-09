---
title: 长文档问答：Map-Reduce、Refine 与分层摘要
date: 2024-04-14 10:00:00
tags:
  - AI
  - LLM
  - 长上下文
  - RAG
  - 文档问答
summary: 长文档问答不是把整本资料一次塞进上下文。本文比较 Map-Reduce、Refine 与分层摘要三种方法，讲清上下文预算、信息损失、并行、引用与质量评测。
categories:
  - 人工智能
  - 架构教程
---

{/*
 * [INPUT]: 依赖 LLM 上下文窗口、文档切分、摘要、Map-Reduce、Refine、RAG 与引用评测概念
 * [OUTPUT]: 对外提供长文档问答的三种编排模式、上下文预算、摘要质量、并行处理与评测方法
 * [POS]: 大模型工程系列的长上下文架构文章，承接 Context Window 与长文本主题，服务后续 Claude 3 与 RAG 进阶文章
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

# 长文档问答：Map-Reduce、Refine 与分层摘要

长上下文模型出现以后，很多人会自然地想：既然窗口足够大，把整份合同、整本手册或一年的会议记录直接塞进去，不就可以问了吗？

短文档确实可以这样做。文档一长，问题就会一起出现：输入 Token 和成本迅速上升，模型可能忽略中间内容，多个章节的冲突变得难以处理，答案还很难说明究竟依据了哪一页。上下文窗口变大，解决的是“能不能放进去”，没有解决“模型能不能稳定地找到、理解和引用”。

我做长文档问答时，最先学到的教训是：不要把长文档处理成一个巨大的字符串，而要把它当成一个需要编排的计算任务。不同任务可以使用 Map-Reduce、Refine 或分层摘要；选择哪一种，取决于是否需要全局视角、是否需要保持顺序、能否并行、对细节和引用有多高要求。

## 一、先定义长文档问题的类型

“总结这份报告”与“合同里关于违约责任的条款是什么”是两类不同任务。前者需要覆盖全文并抽象主题，后者需要精确定位并保留原文证据。

```text
全局总结：所有部分都有贡献，需要合并主题
局部问答：少数片段关键，需要精确定位
跨段推理：多个章节共同决定答案，需要保留关系
时间回顾：按顺序处理事件，需要维护时间线
```

在选择架构之前，先写清成功标准：答案完整还是精确？是否需要引用页码？能否接受摘要损失？延迟和成本上限是多少？没有这些约束，三种方法都可能“看起来能跑”，却无法比较。

## 二、Map-Reduce：先分开处理，再合并结果

Map-Reduce 把长文档切成多个片段，每个片段独立交给模型处理，最后再把局部结果交给一个汇总模型。

```text
长文档
 ├─ chunk 1 → 局部摘要 / 局部答案 ┐
 ├─ chunk 2 → 局部摘要 / 局部答案 ├→ 汇总模型 → 最终结果
 ├─ chunk 3 → 局部摘要 / 局部答案 ┘
 └─ chunk N → 局部摘要 / 局部答案
```

它的最大优点是可以并行。文档拆成 20 段后，Map 阶段可以同时处理，适合批量报告和全局摘要。局部任务之间互不依赖，某个片段失败也可以单独重试。

缺点是信息会在 Map 阶段被压缩。两个事实分别位于不同片段时，局部模型可能都认为自己没有足够上下文，最终 Reduce 阶段只拿到已经丢失细节的摘要。

```ts
type ChunkSummary = {
  chunkId: string
  summary: string
  keyFacts: string[]
  sourceRefs: string[]
  confidence: number
}

async function mapReduce(
  chunks: Array<{ id: string; text: string }>,
) {
  const partials: ChunkSummary[] = await Promise.all(
    chunks.map(async (chunk) => ({
      chunkId: chunk.id,
      ...(await summarizeChunk(chunk.text)),
    })),
  )

  const groups = groupByTokenBudget(partials, 6000)
  let current = groups

  while (current.length > 1) {
    current = await Promise.all(
      current.map((group) => reduceSummaries(group)),
    )
  }

  return current[0]
}
```

Reduce 阶段也可能因为局部摘要总量太大而超出上下文，所以常常需要多轮归并。每轮归并都会损失一些细节，不能只看最终文本是否流畅。

## 三、Refine：按顺序逐步改进答案

Refine 先用第一段文档生成一个初始答案，随后依次读取下一段，把已有答案和新片段一起交给模型，让它决定是否修正或补充。

```text
chunk 1 → 初始答案
             ↓ + chunk 2
          更新答案
             ↓ + chunk 3
          再次更新
             ↓
          最终答案
```

Refine 保留了处理顺序，适合时间线、章节顺序和需要持续累积上下文的任务。它也能在新片段出现冲突时要求模型重新判断，而不是等最后才合并。

```ts
type RefineState = {
  answer: string
  sourceRefs: string[]
  processedChunks: number
  conflicts: string[]
}

async function refineDocument(
  chunks: Array<{ id: string; text: string }>,
): Promise<RefineState> {
  let state: RefineState = {
    answer: '',
    sourceRefs: [],
    processedChunks: 0,
    conflicts: [],
  }

  for (const chunk of chunks) {
    state = await refineWithChunk(state, chunk)
    state.processedChunks += 1
  }

  return state
}
```

Refine 的问题也很明显：它通常是串行的，文档越长，延迟越长；早期错误可能被后续步骤继承；模型每次都要重复看到当前答案，输入 Token 会不断累计。如果处理顺序影响答案，必须记录顺序和版本，不能随意并行。

## 四、分层摘要：先建立地图，再深入细节

分层摘要把文档组织成树：先对段落做摘要，再把段落摘要合成章节摘要，最后合成全局摘要。用户提问时，可以先在高层摘要中定位相关章节，再回到原文或低层摘要获取细节。

```text
原始段落 ─→ 段落摘要 ─→ 章节摘要 ─→ 文档摘要
    ↑          ↑             ↑
  精确证据   局部理解      全局主题
```

它兼顾了全局导航和局部细节，适合长报告、手册和持续更新的知识库。代价是构建和维护复杂，需要处理树节点版本、父子关系、摘要过期和引用回溯。

```ts
type SummaryNode = {
  id: string
  parentId?: string
  level: 'paragraph' | 'section' | 'document'
  text: string
  childIds: string[]
  sourceRefs: string[]
  contentHash: string
  version: string
}
```

摘要节点不能替代原文。它是导航和压缩层，最终涉及金额、日期、责任和规则的结论，仍然应该回到原文片段核验。

## 五、三种方法如何选择

| 维度 | Map-Reduce | Refine | 分层摘要 |
|---|---|---|---|
| 处理方式 | 并行局部后汇总 | 串行逐步更新 | 预构建多层表示 |
| 适合任务 | 全文总结、批量处理 | 时间线、顺序累积 | 长期知识库、反复问答 |
| 延迟 | Map 可并行，Reduce 多轮 | 随片段数增长 | 查询快，构建成本高 |
| 信息风险 | 局部摘要丢跨段关系 | 早期错误被继承 | 摘要层层压缩损失细节 |
| 引用能力 | 需保留每个 chunk 来源 | 易跟踪处理顺序 | 需要父子节点回溯 |
| 更新方式 | 重新处理受影响片段 | 从变化处继续或重算 | 增量更新受影响分支 |

不要按“哪个算法更先进”选择，而要按任务约束选择。一个应用也可以组合它们：先用分层摘要做导航，再用向量检索找相关片段，最后用 Refine 或一次性回答处理少量证据。

## 六、切分是所有长文档方案的地基

切分太大，局部处理仍然超出预算；切分太小，标题、限定条件和上下文关系会丢失。建议优先按文档结构切分：标题、章节、段落、列表和表格，而不是只按固定字符数。

```ts
type DocumentChunk = {
  id: string
  text: string
  headingPath: string[]
  page?: number
  startOffset: number
  endOffset: number
  tokenCount: number
}
```

每个 chunk 带上祖先标题和页码，既帮助模型理解，也便于引用。相邻片段之间可以有少量重叠，但重叠太大，会让 Map 阶段重复计算、Reduce 阶段重复信息。

表格和代码要使用专门策略。表格需要保留表头、单位和行列关系；代码要保持文件、类、函数和行号。把它们一律按句号切分，会让后续问答比原文更不可靠。

## 七、上下文预算不是只有一个数字

长文档处理需要同时管理输入、输出和中间结果预算：

```text
一次调用预算
= 输入 Token
 + 预留输出 Token
 + 系统提示 Token
 + 引用和元数据 Token
```

Map 阶段的输出越详细，Reduce 阶段输入越大；摘要越短，细节损失越多。应该根据任务设置压缩比例，并记录每一级摘要的 Token 和覆盖率。

```ts
type ContextBudget = {
  maxInputTokens: number
  reservedOutputTokens: number
  maxSourceTokens: number
  maxCitationTokens: number
}

function fitsBudget(
  inputTokens: number,
  budget: ContextBudget,
) {
  return inputTokens + budget.reservedOutputTokens <= budget.maxInputTokens
}
```

不要把模型宣传的最大上下文当成稳定工作区。最大窗口可能带来更高成本、更长延迟和注意力退化，应用应保留安全余量。

## 八、引用和证据要从第一步保留

如果局部摘要只返回一段文字，最后很难知道它来自哪一页。每个中间产物都要带来源引用：

```ts
type Evidence = {
  sourceId: string
  locator: { page?: number; heading?: string; startOffset?: number }
  quote: string
  relevance: number
}

type AnswerWithEvidence = {
  answer: string
  evidence: Evidence[]
  uncertainty?: string
}
```

汇总时不能只合并文本，还要合并证据。最终回答中的引用必须来自实际处理过的来源，不能让模型根据摘要内容随意生成页码或 URL。

冲突信息要显式保留。旧版本说“30 天”，新版本说“15 天”，系统应标记冲突并按时间和来源规则处理，必要时向用户说明，而不是让最后一次看到的文本静默覆盖前面事实。

## 九、Map-Reduce 的并行并不等于无限并发

并行 Map 可以降低墙钟时间，但会同时消耗模型 API 配额、GPU、网络和日志存储。需要使用有界并发和失败重试：

```ts
type ConcurrencyPolicy = {
  maxInFlight: number
  maxRetries: number
  timeoutMs: number
  backoffMs: number
}
```

某个 chunk 失败时，重试同一 chunk，不要重跑整个文档。多个片段使用相同 Prompt 和模型版本，结果才容易比较；模型或策略版本变化后，旧摘要要标记版本，不能和新摘要混合归并。

## 十、Refine 要防止答案漂移

Refine 每一步都可能改写已有答案。模型为了吸收新片段，可能删除原本正确的细节，或者把不相关内容逐步带入。可以让它显式输出保留、增加、删除和冲突项：

```ts
type RefineDelta = {
  kept: string[]
  added: string[]
  removed: string[]
  conflicts: string[]
  evidence: Evidence[]
}
```

每几步做一次独立校验，或者与上一版本做差异比较。高风险答案不要让一次串行循环直接覆盖旧结果，保留检查点，发现质量下降时能够回退。

## 十一、摘要质量怎么评测

摘要评测不能只看语言流畅。至少关注：

- 事实保真：摘要中的主张是否能被原文支持。
- 覆盖率：关键事实是否被保留。
- 去重率：多层摘要是否重复表达同一内容。
- 引用准确率：来源定位是否真实。
- 冲突保留：不同版本是否被正确区分。
- 长度与成本：压缩是否值得。

```ts
type SummaryReport = {
  factuality: number
  keyFactCoverage: number
  citationAccuracy: number
  conflictRecall: number
  compressionRatio: number
  costPerDocument: number
}
```

可以用人工标注的关键事实集做覆盖评测，用独立模型或规则做辅助判断，但高风险文档仍需要人工抽检。摘要系统一旦把关键限定词丢掉，最后答案可能会变成相反含义。

## 十二、长文档问答不等于长上下文问答

上下文窗口大时，可以减少切分和检索的工作，但不代表所有文档都应该一次性输入。选择架构时还要看文档是否反复查询、更新频率、引用要求、延迟预算和知识权限。

一次性长上下文适合低频、短期、需要全局阅读的任务；分层摘要适合反复查询的稳定资料；RAG 适合局部证据和持续更新；Map-Reduce 适合批处理全局总结；Refine 适合顺序累积和冲突修正。

```text
低频一次性任务 → 长上下文 / 简单分块
高频固定文档 → 分层摘要 + 检索
持续更新知识 → 增量索引 + 局部重算
全文报告生成 → Map-Reduce
时间线 / 连续修订 → Refine
```

## 十三、我的总结：先建立地图，再回答问题

Map-Reduce、Refine 和分层摘要不是三种互相竞争的魔法，而是三种不同的长文档编排方式。Map-Reduce 擅长把独立工作并行化，Refine 擅长沿顺序累积和修正，分层摘要擅长建立从全局到局部的导航地图。

我现在处理长文档，会先判断问题需要全局覆盖、精确定位、跨段关系还是时间顺序；然后根据成本、延迟、更新和引用要求选择方案。无论使用哪种方法，都把原文来源、版本、页码和中间产物保留下来，给摘要设置预算和质量门禁。

最重要的一点是：摘要不是事实本身，上下文窗口也不是理解能力。压缩会丢信息，串行会产生漂移，并行会增加资源压力，长输入会让模型忽略关键位置。只有让中间结果可以追溯、最终答案可以验证，长文档问答才不会变成“模型读过很多字，所以应该知道答案”的幻觉。

真正成熟的系统，不是把更多文字塞进模型，而是知道哪些信息先压缩、哪些关系必须保留、哪些证据需要回到原文确认。把长文档变成一张可导航、可检索、可核验的地图，模型才能在有限预算里回答得更完整，也更诚实。
