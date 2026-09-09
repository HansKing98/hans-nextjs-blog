---
title: GraphRAG：知识图谱如何补足向量检索
date: 2024-09-15 10:00:00
tags:
  - AI
  - LLM
  - RAG
  - GraphRAG
  - 知识图谱
summary: 向量检索擅长找相似内容，知识图谱擅长表达实体关系和多跳路径。本文解释 GraphRAG 的适用场景、图谱构建、查询流程、成本和常见误区。
categories:
  - 人工智能
  - 架构教程
---

{/*
 * [INPUT]: 依赖 RAG、Embedding、向量检索、实体关系抽取、知识图谱与图查询概念
 * [OUTPUT]: 对外提供 GraphRAG 的核心原理、数据建模、混合检索、查询编排与落地判断
 * [POS]: 大模型工程系列的 RAG 架构文章，承接 Hybrid Search 与 Reranker，服务后续 RAG 数据管道主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# GraphRAG：知识图谱如何补足向量检索

做 RAG 时，很多人第一反应是把文档切成片段，生成 Embedding，然后用相似度找到最接近的问题。这个方法对“关于退款政策的说明在哪”很有效，但遇到另一类问题就开始吃力：“负责支付系统的团队有哪些？这些团队最近两次发布分别影响了哪些服务？如果服务 A 依赖服务 B，而 B 的负责人又发生了变更，当前应该通知谁？”

这些问题不是单纯找一段相似文字，而是在追踪实体之间的关系。向量检索擅长回答“哪些内容和这个问题像”，知识图谱擅长回答“谁和谁有什么关系、关系经过了几跳、这条路径是否成立”。GraphRAG 的价值，不是把向量数据库换成图数据库，而是让两种检索方式在合适的地方互相补足。

我第一次搭图谱时也有过浪漫想象：把所有文档抽成节点和边，模型就能像查地图一样理解企业知识。后来发现，图谱最难的不是画出一张漂亮的关系图，而是决定哪些关系值得保存、关系从哪份证据来、冲突时相信谁，以及查询成本是否值得。

## 一、向量检索和图检索各自擅长什么

```text
向量检索：问题 → 相似片段
知识图谱：实体 → 关系 → 实体 → 关系 → 目标
```

向量检索适合语义相似、答案集中在一段文本里的问题。用户换一种说法，系统仍然有机会召回相关内容。它对开放表达很友好，建设成本也相对低。

图检索适合实体明确、关系重要、多跳路径和全局聚合问题。例如查“某个部门负责的所有系统”，或者找“同时依赖两个有风险组件的服务”。它能显式表达关系类型、方向、时间和权重，不必让模型从多段文本里自己拼图。

图谱也有明显代价：需要定义本体和实体类型，抽取关系会出错，更新和冲突处理复杂，图查询的结果还要回到原文验证。不是所有 RAG 都需要 GraphRAG，只有当关系结构本身决定答案时，增加图层才值得。

## 二、先定义图谱中的实体和关系

不要一上来让模型“抽取所有知识”。先从一个具体业务问题出发，定义最小本体：

```ts
type EntityType = 'person' | 'team' | 'service' | 'document' | 'project'

type RelationType =
  | 'OWNS'
  | 'DEPENDS_ON'
  | 'MEMBER_OF'
  | 'MENTIONS'
  | 'CHANGED_BY'
  | 'RELATED_TO'

type Entity = {
  id: string
  type: EntityType
  canonicalName: string
  aliases: string[]
  sourceRefs: string[]
}

type Relation = {
  id: string
  from: string
  type: RelationType
  to: string
  validFrom?: string
  validTo?: string
  confidence: number
  sourceRefs: string[]
}
```

`sourceRefs` 是图谱可信度的关键。一个关系不是因为“模型抽出来了”就变成事实，它必须能回到文档、页码、段落或数据库记录。`validFrom` 和 `validTo` 也不能省略，负责人、系统依赖和项目状态都会变化，图谱不是永恒不变的地图。

本体要尽量小。实体类型越多、关系越细，抽取和维护成本越高；如果查询用不上，先不要加入。图谱建设最容易陷入过度设计：团队花几周定义一套完美 ontology，最后却没有一个真实问题依赖它。

## 三、从文档抽取关系时，模型只是候选生成器

关系抽取通常经历：文档解析、实体识别、实体归一化、关系候选生成、冲突校验和写入图数据库。模型可以帮助识别候选，但不能单独决定最终事实。

```text
原文
 ↓
实体识别：支付服务、订单服务
 ↓
实体归一化：payment-api = 支付服务
 ↓
关系候选：订单服务 DEPENDS_ON 支付服务
 ↓
规则 / 数据库 / 人工核验
 ↓
写入图谱并保存来源
```

```ts
type RelationCandidate = {
  fromText: string
  relation: RelationType
  toText: string
  evidence: string
  confidence: number
  sourceId: string
}

function acceptCandidate(candidate: RelationCandidate) {
  if (candidate.confidence < 0.8) return false
  if (!candidate.evidence.trim()) return false
  return allowedRelationTypes.has(candidate.relation)
}
```

置信度不能盲信模型自己给出的数字。它更适合做排序和人工抽检优先级，真正的接受规则还要结合句法证据、来源等级、时间和领域约束。比如“可能依赖”与“正式依赖”表达的关系强度不同，不能都写成同一条确定边。

## 四、实体归一化比抽取更容易被低估

同一个实体可能有简称、旧名、大小写差异、不同语言名称或环境后缀。若没有实体归一化，图谱会出现多个“支付服务”，查询路径被分裂，结果看起来不完整。

```ts
type EntityAlias = {
  alias: string
  entityId: string
  source: 'manual' | 'directory' | 'model' | 'rule'
  confidence: number
}

function canonicalKey(name: string) {
  return name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[ _-]+/g, '')
}
```

归一化可以结合目录、唯一 ID、规则和人工维护。不要只用字符串相似度合并实体，两个名字相似的服务可能属于不同团队；错误合并会制造比漏关系更危险的路径。

实体合并也要可回滚。保存别名来源、合并理由和版本，发现错误时可以拆分或恢复。图谱中的错误关系会被多跳查询放大，一条错误边可能让几十个问题得到看似合理的错误答案。

## 五、GraphRAG 的查询流程

一个实用的 GraphRAG 查询通常不是“图或向量二选一”，而是先判断问题结构，再分别取证：

```text
用户问题
   ↓
问题分类与实体识别
   ├─ 语义检索 → 相关文档片段
   ├─ 图查询 → 实体、关系和多跳路径
   └─ 结构化过滤 → 时间、权限、状态
          ↓
       结果合并与去重
          ↓
       回到原文核验
          ↓
       生成带引用的回答
```

图查询适合先缩小实体范围，向量检索适合补充关系证据和自然语言上下文。两边结果必须带来源和版本，不能把图数据库返回的边直接当成无需验证的事实。

```ts
type RetrievalBundle = {
  entities: Entity[]
  relations: Relation[]
  passages: Array<{
    text: string
    sourceId: string
    score: number
  }>
}

async function retrieveForQuestion(question: string) {
  const entities = await entityResolver.resolve(question)
  const graph = await graphStore.expand(entities, { maxHops: 2, limit: 50 })
  const passages = await vectorStore.search(question, { limit: 8 })

  return mergeAndDeduplicate({ entities, ...graph, passages })
}
```

`maxHops` 和 `limit` 是必要的护栏。无限扩展图谱会产生大量无关邻居，既增加查询时间，也把上下文变成一张噪声地图。多跳不是越多越聪明，通常两到三跳已经足以解决很多业务问题。

## 六、图查询要回答“为什么”，不只是“是什么”

GraphRAG 的回答最好带一条可读路径：

```text
订单服务
  ── DEPENDS_ON ──> 支付服务
  ── OWNS ────────> 结算团队
  ── CHANGED_BY ──> 张三
```

每条边都关联原文证据，最终答案可以说明“根据哪份架构文档，订单服务依赖支付服务；根据哪条组织记录，结算团队负责支付服务”。用户不只需要一个结论，也需要知道结论如何被推出来。

如果图谱中存在冲突，例如一份旧文档说 A 负责，最新目录说 B 负责，查询层应该按时间、来源等级和有效状态处理，而不是把两条边都交给模型让它自己猜。冲突本身也可以作为回答的一部分：说明资料不一致，并请求人工确认。

## 七、社区发现适合全局问题，但要谨慎解释

当用户问“组织里有哪些主题社区”“哪些系统形成了紧密依赖簇”，单条路径查询不够，可以使用图的社区发现、连通分量或中心性分析，先找出全局结构，再让模型总结。

```text
图谱
  ↓
社区 / 簇分析
  ↓
每个簇的实体、关系和代表文档
  ↓
模型生成摘要
```

这种方法适合总结大型知识库，但聚类结果不是业务事实。图算法会受边权、时间窗口、缺失数据和实体合并影响，不能把“在同一个簇里”直接解释成“有正式组织关系”。生成摘要时要明确这是统计发现还是来源明确的业务关系。

## 八、权限必须同时存在于图和文本检索

图谱会保存实体、关系和来源，任何一层泄露都可能暴露内部信息。查询时要根据用户身份过滤实体、关系和原文片段；不能先查全图，再让模型负责隐藏不该显示的结果。

```ts
type GraphAccess = {
  tenantId: string
  allowedGroups: string[]
  visibleClassifications: Array<'public' | 'internal' | 'restricted'>
}

async function queryGraph(question: string, access: GraphAccess) {
  const entities = await entityResolver.resolve(question)
  return graphStore.expand(entities, {
    maxHops: 2,
    filter: {
      tenantId: access.tenantId,
      groups: access.allowedGroups,
      classifications: access.visibleClassifications,
    },
  })
}
```

图谱中的聚合信息也可能泄露。即使隐藏了具体员工姓名，返回“某团队负责所有支付系统”也可能是敏感信息。权限策略要覆盖节点、边、路径和聚合结果。

## 九、更新和冲突是图谱的长期难题

文档会修改、服务会下线、负责人会变更，图谱必须支持增量更新和历史版本。每条边都应该能被撤销、替换或标记过期；删除源文档时，相关关系不能继续作为当前事实返回。

```text
源文档变化
   ↓
重新解析受影响实体和关系
   ↓
比较边的来源、时间和内容哈希
   ├─ 新增 → 写入
   ├─ 修改 → 新版本替换
   ├─ 删除 → 失效或软删除
   └─ 冲突 → 标记并进入审核
```

不要每次全量重建整张图，规模大以后成本和停机风险都很高；也不要只追加新边而不处理旧边，最终查询会得到多个互相矛盾的当前状态。图谱需要类似数据库的迁移、索引和回滚机制。

## 十、什么时候不该上 GraphRAG

如果问题主要是“找到和问题相关的一段说明”，普通向量或混合检索通常更简单。以下情况也要谨慎：数据量很小、关系变化极快、实体没有稳定 ID、关系无法可靠抽取、没有人维护本体、或者团队没有能力评测多跳答案。

GraphRAG 的额外成本包括关系抽取、实体对齐、图存储、查询编排、权限过滤和冲突维护。如果它没有显著提高关键任务的召回或答案完整性，就不值得仅仅因为概念热门而增加一层系统。

可以先做一个窄实验：选一种关系、一个业务问题、几十份文档，比较纯向量检索和向量加图查询的 Recall、引用准确率、延迟与维护成本。用结果决定是否扩大，不要从“全公司知识图谱”开始。

## 十一、如何评测 GraphRAG

评测要分别看实体识别、关系抽取、图查询和最终答案：

```ts
type GraphRagReport = {
  entityResolutionAccuracy: number
  relationPrecision: number
  relationRecall: number
  pathValidity: number
  answerFaithfulness: number
  citationAccuracy: number
  p95LatencyMs: number
  graphMaintenanceCost: number
}
```

测试集应包含单跳、多跳、关系不存在、关系冲突、时间变化和权限边界问题。尤其要测试“图谱里没有这条边”时系统是否诚实拒答，而不是让模型根据相似文档脑补一条关系。

人工评测时，不只看最后结论，还要检查路径是否真实存在、每条边的来源是否支持、时间是否正确。一个结论碰巧答对，但路径包含一条虚构边，系统仍然不可靠。

## 十二、我的总结：图谱不是向量检索的替代品

GraphRAG 最有价值的地方，是把“相似内容”之外的关系结构带回了问答系统。向量检索负责从开放文本中找到相关证据，知识图谱负责表达实体、方向、时间和多跳路径，二者结合后，系统才有机会回答那些“需要把几份资料连起来”的问题。

但图谱不是自动长出来的真相。实体会重名，关系会抽错，文档会过期，权限会变化，查询路径也可能因为一条错误边而走向错误结论。模型可以帮助抽取和总结，却不能替代来源、版本、校验和权限。

我现在判断是否采用 GraphRAG，只看一个标准：关系结构是否真的决定任务成败。如果答案依赖多跳关系、全局连接或实体约束，图层值得认真建设；如果只是找相似段落，先把普通 RAG 的解析、切分、召回和评测做好。

好的 GraphRAG 不是让架构图变得更复杂，而是让系统在回答“为什么”“通过谁”“依赖什么”“发生过哪些变化”时，有一条可以追溯的路径。把每条关系都当成需要证据的主张，把每次查询都当成需要权限和版本的事实，知识图谱才会从一张漂亮的图，变成真正能帮助模型少猜、让用户能核验的知识基础设施。
