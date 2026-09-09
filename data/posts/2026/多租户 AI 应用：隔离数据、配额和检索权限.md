---
title: 多租户 AI 应用：隔离数据、配额和检索权限
date: 2026-03-08 10:00:00
tags:
  - AI
  - LLM
  - 多租户
  - RAG
  - 权限管理
summary: 多租户 AI 应用不只是给请求加上 tenantId，还要把身份、数据、检索、缓存、配额、日志和计费放进同一条隔离链路。
categories:
  - 人工智能
  - 技术教程
---

{/*
 * [INPUT]: 依赖认证授权、关系数据库、向量检索、缓存、限流与 LLM 调用的工程概念
 * [OUTPUT]: 对外提供多租户 AI 应用的数据隔离、配额管理与检索权限设计方法
 * [POS]: 大模型工程系列的多租户架构文章，承接生产级 RAG，服务后续隐私与合规主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# 多租户 AI 应用：隔离数据、配额和检索权限

我见过一个很典型的 AI 项目：单个客户使用时一切正常，回答速度快，知识库也能搜到。后来产品改成 SaaS，要服务几十家公司，开发同学做的第一件事，是在表里加了一列 `tenantId`。查询时补上 `where tenant_id = ?`，向量入库时也加一个 metadata 字段，看上去万事大吉。

几周以后，问题来了。

有的客户发现问同一个问题，答案里出现了另一家公司的内部术语；有的客户上传了一批大文件，整个平台的 Embedding 任务排队；还有客户发现自己明明没有权限，却能通过旧缓存拿到已经被撤销的资料。

这不是某一个 SQL 漏写的问题，而是我们一开始把“租户”想得太简单了。多租户不是给每个请求贴一个标签，而是要保证一个租户的身份、数据、计算资源和账单，都不会意外穿过边界。

## 一、先定义清楚：什么叫隔离

在 AI 应用里，至少有四种边界：

1. **租户边界**：公司 A 永远看不到公司 B 的文档和对话。
2. **用户边界**：同一家公司里，普通员工不能看到管理员或其他部门的内容。
3. **项目边界**：同一个用户参与多个项目时，项目一的知识不能自动出现在项目二。
4. **资源边界**：一个租户不能因为大量上传文档或连续调用模型，拖垮其他租户。

所以，一次 RAG 请求真正需要的上下文，不只是一个 `tenantId`，而是一组经过服务端确认的身份信息：

```ts
type RequestScope = {
  tenantId: string
  userId: string
  roles: string[]
  projectIds: string[]
  documentScopes: string[]
}
```

最重要的一句话是：`RequestScope` 必须来自登录态和服务端授权结果，不能相信客户端传来的值。前端传来的 `tenantId` 只能当作一个请求参数，不能当作权限证明。否则用户把它改成别人的 ID，隔离就结束了。

## 二、数据隔离：不要只靠开发者记得加 where

### 1. 共享表是便宜而实用的起点

大多数 SaaS 产品不会一开始就给每个租户建一套数据库。更常见的做法是共享表、共享数据库，在每张业务表中保存 `tenant_id`：

```sql
create table documents (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  owner_id uuid not null,
  title text not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

create index documents_tenant_project_idx
  on documents (tenant_id, project_id);
```

这个方案成本低、迁移简单，但它有一个致命依赖：每一个查询都不能漏掉租户条件。人会犯错，代码会被重构，未来还会有新同事写出一个“临时查询”。只靠大家小心一点，并不是安全策略。

### 2. 用数据库能力做第二道保险

如果使用 PostgreSQL，可以考虑 Row-Level Security（RLS），让数据库也参与隔离：

```sql
alter table documents enable row level security;

create policy documents_tenant_policy on documents
  using (tenant_id = current_setting('app.tenant_id')::uuid)
  with check (tenant_id = current_setting('app.tenant_id')::uuid);
```

请求开始时，服务端在事务里设置当前租户：

```ts
await db.transaction(async (tx) => {
  await tx.query('select set_config($1, $2, true)', [
    'app.tenant_id',
    scope.tenantId,
  ])

  return tx.documents.findMany({
    where: { projectId: projectId },
  })
})
```

RLS 不是万能的。使用超级用户连接、绕过 ORM 的管理脚本、跨租户报表任务，都可能绕过策略。所以生产环境要把普通业务连接和管理连接分开，并且对管理脚本做审计。安全设计不是找到一个神奇开关，而是让错误尽量难发生、发生后尽量能被发现。

## 三、向量检索：最容易被忽略的租户边界

关系数据库里漏一个条件，代码评审有机会发现；向量检索则更隐蔽。很多向量数据库允许在相似度搜索时传 metadata filter，但这个 filter 必须由服务端根据授权范围生成：

```ts
const filter = {
  tenantId: scope.tenantId,
  projectId: { $in: scope.projectIds },
  visibility: { $in: ['tenant', 'project'] },
}

const hits = await vectorStore.search({
  vector: queryEmbedding,
  topK: 20,
  filter,
})
```

不要把完整 filter 从前端传进来，也不要只过滤 `tenantId` 而忽略项目、部门和文档可见性。正确的权限判断应该在检索前完成，召回后还要再做一次服务端校验。这个“多做一次”看起来有点啰嗦，但 RAG 的上下文一旦交给模型，就已经很难补救了。

还有一个经常发生的错误：应用层做了过滤，但 Reranker 使用的是过滤前的结果，或者搜索服务先召回了跨租户内容再在返回前删除。这样虽然最终答案可能没有直接泄漏，但跨租户文档已经进入模型上下文或日志，边界仍然被破坏。

建议把 `tenantId`、`projectId`、`documentId`、`documentVersion` 直接写进每个 chunk 的 metadata，并把“授权过滤”封装成唯一入口：

```ts
async function searchForScope(
  question: string,
  scope: RequestScope
) {
  const queryVector = await embed(question)
  const hits = await vectorStore.search({
    vector: queryVector,
    topK: 20,
    filter: buildSearchFilter(scope),
  })

  return hits.filter((hit) => canReadChunk(hit.metadata, scope))
}
```

调用方不应该自己拼过滤条件。把权限逻辑散落在十几个服务里，短期看是灵活，长期一定会出现一处忘记过滤。

## 四、缓存隔离：答案缓存也会泄漏

很多人只检查数据库和向量库，却忘了 Redis。假设缓存键是：

```text
rag:answer:退款需要多久
```

那么第一个租户问出来的答案，可能被第二个租户直接复用。正确的缓存键至少要包含租户、用户权限版本、知识库版本和问题规范化结果：

```ts
const cacheKey = [
  'rag-answer',
  scope.tenantId,
  scope.userId,
  scope.permissionVersion,
  knowledgeBaseVersion,
  normalize(question),
].join(':')
```

是否需要放 `userId`，取决于答案是否包含用户专属权限。如果同一租户的答案对所有员工都一样，可以只放租户和权限集合的版本；如果不同部门能看到不同内容，就不能只按租户缓存。

缓存失效也必须纳入权限设计。员工离职、项目成员变化、文档撤回以后，旧缓存不能继续活着。宁可缓存时间短一点，也不要为了命中率保留无法解释的旧答案。

## 五、配额和限流：公平不是把所有人都拒之门外

多租户系统最难受的事故之一，是某个客户无意中把平台打满。比如用户一次上传五万份文档，后台同时发起五万次 Embedding；或者前端重试逻辑写错，一个按钮触发几十次模型调用。

配额至少分三层：

- **请求配额**：每分钟允许多少次对话、检索和上传。
- **计算配额**：每天或每月允许多少输入 Token、输出 Token 和 Embedding 数量。
- **并发配额**：同时运行多少个生成请求、索引任务和文件解析任务。

限流不能只在网关做。网关可以限制请求数量，但无法准确知道一次请求会消耗多少 Token。应用层应该在调用模型前做预算检查：

```ts
const estimate = estimateTokens(prompt, context)
const quota = await quotaService.get(scope.tenantId)

if (quota.inputTokens + estimate > quota.inputTokenLimit) {
  throw new QuotaExceededError('本月输入 Token 配额已用尽')
}
```

模型返回后，再用真实用量结算。预估值用于挡住明显超限，真实值用于计费和统计。两者不要混为一谈。

任务型操作最好进入按租户分组的队列，并设置公平调度。例如每个租户一个逻辑队列，单个租户最多占用固定并发数；高优先级客户可以有更高权重，但不能无限吞噬公共资源。否则“付费等级”最后会变成“谁先把机器打死”。

## 六、日志和计费：隔离不仅是看不见，还要算得清

每条日志都应该能回答三个问题：这是哪个租户的请求？消耗了哪些资源？发生了什么结果？建议记录：

```ts
type UsageEvent = {
  traceId: string
  tenantId: string
  userId: string
  model: string
  inputTokens: number
  outputTokens: number
  embeddingCount: number
  latencyMs: number
  status: 'success' | 'error' | 'quota_exceeded'
}
```

但是，`tenantId` 不代表可以把用户问题原文无限期写入日志。问题里可能有合同、病历、客户联系方式。日志要做脱敏、分级和留存期限控制；调试抽样也应该有权限，不能因为“内部系统”四个字就默认人人可看。

计费事件要具备幂等键。网络重试可能让同一次模型调用上报两次，如果没有 `traceId + operationId` 这样的唯一键，账单会重复。配额扣减和使用记录最好由一个明确的服务负责，不要让聊天服务、索引服务、后台脚本各自维护一套余额。

## 七、用测试证明隔离，而不是用信心证明

多租户功能必须有专门的隔离测试。最基本的测试矩阵是：

1. A 租户的用户不能读取 B 租户的文档。
2. A 租户的项目一不能检索到项目二的私有文档。
3. 权限撤销后，旧缓存不能返回原答案。
4. 向量检索、关键词检索和 Reranker 都使用同一权限范围。
5. A 租户超额时，B 租户仍能正常请求。
6. 删除文档后，旧索引和旧版本都不能继续召回它。
7. 管理员跨租户查询有明确审计记录。

测试数据不要只用“公司 A”“公司 B”这种一眼假的名字。可以放入内容相同、关键词相近但答案不同的文档，验证系统是真的按权限过滤，而不是碰巧没有搜到错误内容。

## 总结：把租户当成系统边界，而不是业务字段

我最后总结出一个很朴素的判断方法：只要一个函数接收了 `tenantId`，就要问一句——这个 ID 是谁给的？有没有经过授权？它有没有继续传到数据库、向量库、缓存、队列、日志和账单？如果答案是“这里应该不会出问题”，那通常意味着问题还没有被真正设计出来。

多租户 AI 应用的本质，是把信任边界贯彻到底：身份决定范围，范围决定检索，检索决定上下文，上下文决定答案；资源配额则保证一个租户的浪潮不会淹没其他租户。数据隔离解决“不能看”，权限检索解决“不能搜”，配额管理解决“不能拖垮”，审计和计费解决“出了事能解释”。

当你把这些东西都补齐以后，系统可能没有 Demo 阶段那么轻巧，代码也不再只有几百行。但这不是复杂度失控，而是业务真实世界终于进入了系统。真正成熟的 AI 产品，不是模型回答得多么神奇，而是它知道谁可以知道什么、谁应该为多少资源付费，以及在发生错误时，团队能不能迅速把边界重新关上。
