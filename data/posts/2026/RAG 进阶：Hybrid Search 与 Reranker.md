---
title: RAG 进阶：Hybrid Search 与 Reranker
date: 2024-09-01 10:00:00
tags:
  - AI
  - LLM
  - RAG
  - Hybrid Search
  - Reranker
summary: 单独使用关键词或向量检索都容易漏掉关键信息。本文从两种检索的差异出发，讲清混合召回、分数融合、Reranker、延迟预算和离线评测。
categories:
  - 人工智能
  - 架构教程
---

{/*
 * [INPUT]: 依赖 BM25、Embedding、向量检索、混合搜索、Reranker 与 RAG 评测概念
 * [OUTPUT]: 对外提供 Hybrid Search 与 Reranker 的检索流程、分数融合、工程实现和参数评测方法
 * [POS]: 大模型工程系列的 RAG 进阶文章，承接 RAG 基础与检索入门，服务后续 GraphRAG 和数据管道主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

# RAG 进阶：Hybrid Search 与 Reranker

RAG 最初的 Demo 往往只用向量检索：把问题转成向量，再找距离最近的几个片段。用户换一种说法，系统也许仍然能找到相关内容，这种体验很惊艳。

但一旦接入真实知识库，向量检索的短板会慢慢暴露。用户问“错误码 E1042 怎么处理”，最有价值的可能正是一段包含精确字符串 `E1042` 的文档；用户问“为什么订单会被系统拒绝”，答案却可能分散在几段语义相近但不完全相同的说明里。前者关键词更可靠，后者语义更重要。

我做过一个只用向量检索的系统，最初召回率很不错，后来发现产品名、版本号、错误码和人名经常被排到后面。把 BM25 加进来以后，又出现了另一个问题：关键词命中了字面相同但语义不相关的段落。最后我们不得不承认，检索不是在寻找一种永远正确的方法，而是在不同信号之间做证据组合。

Hybrid Search 负责从多个检索器扩大候选范围，Reranker 负责用更精细的模型重新排序。两者结合，通常比单独把某一个检索器调到极致更稳，但也会增加延迟、成本和系统复杂度。

## 一、关键词检索和向量检索看的是不同东西

关键词检索关注词项是否出现、出现频率和文档稀有程度。BM25 对产品名、错误码、版本号、专有名词特别有用，用户输入和原文有字面重合时往往表现很好。

向量检索把文本映射到语义空间，关注意思是否相近。它可以跨越同义表达和词序变化，但对精确标识符、数字、否定词和短查询可能不够敏感。

```text
问题：E1042 在 v3.2 如何修复

BM25：重视 E1042、v3.2 这些精确词
向量：理解“如何修复”与故障排查语义
```

两种检索器的分数不能直接相加。BM25 分数受文档长度和词频影响，向量相似度可能在 0 到 1 之间，量纲和分布完全不同。混合检索的第一步不是写 `scoreA + scoreB`，而是先把候选结果和分数处理成可比较的形式。

## 二、Hybrid Search 的基本流程

```text
用户问题
   ├─ 关键词检索 → 候选 A
   ├─ 向量检索   → 候选 B
   └─ 元数据过滤 → 候选范围
          ↓
       合并去重
          ↓
       分数融合 / RRF
          ↓
       Reranker 重排
          ↓
       取 Top K 给模型
```

关键词和向量检索可以并行执行，减少墙钟时间。两边的候选数量通常比最终交给大模型的数量大，例如各取 20 条，合并后交给 Reranker 重新排序，再取前 5 条。

```ts
type Candidate = {
  id: string
  text: string
  sourceId: string
  rank?: number
  score?: number
  source: 'keyword' | 'vector'
}

async function hybridRetrieve(query: string) {
  const [keyword, vector] = await Promise.all([
    keywordIndex.search(query, { limit: 20 }),
    vectorIndex.search(query, { limit: 20 }),
  ])

  const merged = deduplicateByChunkId([
    ...keyword.map((item, index) => ({ ...item, rank: index + 1, source: 'keyword' as const })),
    ...vector.map((item, index) => ({ ...item, rank: index + 1, source: 'vector' as const })),
  ])

  return rerank(query, merged).then((items) => items.slice(0, 8))
}
```

去重不能只按文本字符串。相同片段可能来自不同版本或不同权限范围，应该使用稳定的 chunk ID，同时保留来源和版本信息。合并时也要避免把已删除或用户无权访问的内容带进候选。

## 三、分数融合的三种思路

### 1. 加权分数

先把两类分数归一化，再按任务设置权重：

```text
hybridScore = α × normalizedBM25 + (1 - α) × normalizedVector
```

它直观、可调，但需要稳定的分数分布。不同查询、不同索引和不同语言可能导致归一化失真。`α` 也不应该对所有任务固定：错误码查询更偏关键词，概念问答更偏向量。

### 2. Reciprocal Rank Fusion

RRF 不直接比较原始分数，而是根据排名融合：

```text
RRF(d) = Σ 1 / (k + rank_i(d))
```

同一文档在多个检索器中都排名靠前，就能得到较高分。它对分数尺度不敏感，作为第一版混合策略很实用，但它只知道排名，不知道两个候选之间实际差距多大。

```ts
function rrfScore(ranks: number[], k = 60) {
  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0)
}
```

### 3. 学习排序

当积累了足够的点击、人工相关性和任务结果数据，可以训练排序模型学习不同信号的组合。它的潜力更大，但标签质量、数据偏差和线上分布变化都会增加维护成本。早期先用 RRF 或可解释权重，通常更容易定位问题。

## 四、Reranker 为什么还能再排一次

Embedding 检索通常把问题和文档分别编码，再用向量距离比较，速度快，适合从大规模库中召回候选。Reranker 则把“问题 + 候选文本”一起交给更精细的交互模型，直接判断二者相关性。

```text
千万级文档 ──向量 / 关键词──→ 50 个候选
50 个候选 ──Reranker──────→ 5 个高质量片段
```

Reranker 不应该直接扫描全库，因为每个候选都需要一次更重的交互计算。它的价值是在一个较小候选集上做精排，弥补第一阶段召回模型的排序误差。

```ts
type RerankInput = {
  query: string
  candidates: Candidate[]
}

type RerankResult = Candidate & {
  relevanceScore: number
}

async function rerank(
  query: string,
  candidates: Candidate[],
): Promise<RerankResult[]> {
  const scores = await reranker.score(
    candidates.map((candidate) => ({ query, text: candidate.text })),
  )

  return candidates
    .map((candidate, index) => ({
      ...candidate,
      relevanceScore: scores[index],
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}
```

Reranker 分数也不是“事实正确率”。它表示相关性，不能保证片段内容真实、最新或有权限。最终答案仍然需要来源、版本和业务校验。

## 五、候选数量和最终 K 怎么选

候选太少，正确片段可能在第一阶段就被漏掉，Reranker 没有机会修复；候选太多，精排成本和延迟会增加，噪声也可能进入上下文。

可以先做候选覆盖率实验：固定最终 `K`，逐步增加关键词和向量候选数量，观察相关片段是否进入候选集。只有候选覆盖率足够高，Reranker 的排序质量才有意义。

```text
Recall@candidateK：正确片段是否进入精排候选
Precision@finalK：最终交给模型的片段有多少真正相关
```

最终 K 也要结合上下文预算。取 20 个片段未必比取 5 个好，重复、冲突和无关内容会让模型更难判断。可以让 Reranker 选出若干候选后，再做多样性去重、长度压缩和相邻片段合并。

## 六、查询改写和混合检索要配合

用户问题可能很短或依赖上文。先做查询改写可以补全实体、时间和上下文，再分别送给关键词和向量检索。但查询改写本身可能改变原意，尤其是否定、数字和专有名词不能被模型随意替换。

```ts
type QueryPlan = {
  original: string
  keywordQuery: string
  semanticQuery: string
  filters: Record<string, string>
}

function buildQueryPlan(question: string, history: string[]): QueryPlan {
  return {
    original: question,
    keywordQuery: preserveIdentifiers(question),
    semanticQuery: expandContext(question, history),
    filters: extractSafeFilters(question),
  }
}
```

关键词查询要保留错误码、版本和人名等标识符，语义查询可以补充同义词和上下文，元数据过滤则应该从结构化字段中获得。三者职责不同，不能让一次自由改写覆盖全部信息。

## 七、过滤要在检索层，不要交给 Reranker

权限、租户、时间范围、文档状态和语言等条件，应尽量在第一阶段检索时过滤。Reranker 不是权限系统，模型也不是权限系统。把无权文档先检索出来，再指望后面的模型不使用，是一种严重的边界错误。

```ts
type RetrievalScope = {
  tenantId: string
  userId: string
  allowedGroups: string[]
  includeArchived: boolean
}

async function searchWithinScope(query: string, scope: RetrievalScope) {
  const filter = {
    tenantId: scope.tenantId,
    groups: scope.allowedGroups,
    status: scope.includeArchived ? ['published', 'archived'] : ['published'],
  }
  return Promise.all([
    keywordIndex.search(query, { limit: 20, filter }),
    vectorIndex.search(query, { limit: 20, filter }),
  ])
}
```

过滤条件要在两种检索器中一致，缓存键也要包含租户和权限范围。否则一个用户生成的召回结果可能被另一个用户命中缓存，形成数据泄露。

## 八、离线评测要拆开看

混合检索上线前，至少要分别测三个阶段：关键词和向量的候选召回、融合后的候选质量、Reranker 的最终排序。不要只看最后的答案，因为答案错了可能是召回漏了，也可能是 Reranker 排错，还可能是模型生成时忽略了证据。

```ts
type RetrievalReport = {
  keywordRecallAt20: number
  vectorRecallAt20: number
  hybridRecallAt40: number
  rerankNdcgAt5: number
  citationAccuracy: number
  p95RetrievalMs: number
  p95RerankMs: number
}
```

测试集要包含精确标识符、同义表达、长问题、无答案、冲突文档和权限边界。用户反馈可以作为补充，但要警惕点击偏差：用户点击了第一个结果，不代表它就是正确答案。

每次修改切分、Embedding、BM25 参数、RRF 常数、Reranker 或最终 K，都要保留配置版本。检索系统的质量变化往往很细，没版本记录就无法知道哪次调整真的有效。

## 九、延迟预算决定是否值得使用 Reranker

如果产品要求首 Token 在 500 毫秒内出现，Reranker 的几十或几百毫秒就需要认真评估；如果是后台报告生成，延迟预算更宽，可以换取更好的排序质量。

```text
总延迟
= 查询改写
 + 关键词检索（并行）
 + 向量检索（并行）
 + 合并去重
 + Reranker
 + 上下文压缩
 + LLM 生成
```

可以使用缓存、批量精排、轻量 Reranker、按查询难度选择是否精排，或者在低风险场景跳过 Reranker。不要为了一个离线指标，把所有实时请求都塞进最重的路径。

性能优化也不能牺牲可解释性。记录每个阶段的耗时、候选数和最终分数，出现延迟回归时才知道是向量库、Reranker 还是上下文处理变慢。

## 十、什么时候 Hybrid Search 仍然不够

混合检索解决的是召回信号互补，不会自动解决文档解析错误、知识过期、关系多跳、权限遗漏和答案幻觉。如果正确答案根本没有入库，增加检索器也找不到；如果表格结构已被破坏，Reranker 只会更精确地挑出坏片段。

对于多跳关系问题，需要图谱或结构化查询；对于精确数值，需要数据库和计算器；对于实时状态，需要直接查询业务系统。检索只是证据获取的一种方式，不要把所有问题都压成“找几个相似片段”。

## 十一、我的总结：先扩大机会，再集中判断

Hybrid Search 和 Reranker 的基本分工很清楚：前者尽量别漏掉可能相关的证据，后者在有限候选中更认真地判断相关性。关键词保留精确实体，向量理解语义变化，Reranker 处理问题与片段之间更细的关系。

但这套系统的价值不在于组件数量，而在于每一层都知道自己的边界。第一阶段负责召回，不负责最终事实；Reranker 负责排序，不负责授权；生成模型负责组织证据，不负责替来源背书。权限、版本、删除和业务状态仍然要由确定性系统管理。

我现在做检索优化，会先拿一组真实失败样本，分别测关键词、向量、混合和精排到底在哪一步改善。能用 RRF 解决的问题，不急着训练复杂排序模型；能靠元数据过滤解决的问题，不交给模型判断；没有数据证明收益时，不为了架构图好看增加一层服务。

RAG 的质量不是某一个分数的胜利，而是从“有没有找到”到“排得是否合理”再到“答案能否被证据支持”的连续链路。把候选覆盖率、最终排序、延迟、成本和引用准确率一起看，Hybrid Search 与 Reranker 才会从两个热门名词，变成真正能让知识库回答更稳的工程工具。
