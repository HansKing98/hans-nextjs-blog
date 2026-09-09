---
title: MCP Server 实战：为博客暴露搜索工具
date: 2025-06-08 10:00:00
tags:
  - AI
  - LLM
  - MCP
  - Agent
  - TypeScript
summary: 以博客搜索为例，设计一个可被 Agent 调用的 MCP Server，覆盖能力声明、参数校验、结果引用、错误处理、权限和审计。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖 MCP 协议、工具调用、博客内容索引、JSON Schema、权限与审计概念
 * [OUTPUT]: 对外提供一个博客搜索 MCP Server 的设计、实现骨架与生产边界
 * [POS]: 大模型工程系列的 MCP 实战文章，承接 MCP 协议入门，服务后续 Computer Use 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# MCP Server 实战：为博客暴露搜索工具

当 Agent 需要回答“你之前写过 RAG 的文章吗”时，最笨的办法是把整个博客塞进上下文。文章少的时候还能忍，文章一多，Prompt 变长、成本上升，模型还不一定能找准。更合理的做法，是给 Agent 一个受控的搜索工具，让它需要时自己查询。

MCP 的价值就在这里：把外部能力用统一的方式描述和暴露给模型。它解决了“工具怎么连接”的问题，但没有自动解决“工具是否安全、结果是否可信、权限是否正确”。一个能被调用的工具，和一个值得被调用的工具，之间还差很多工程工作。

本文用博客搜索作为例子，重点不在某个 SDK 的命令，而在一个 MCP Server 应该如何把能力边界讲清楚。

## 一、先定义工具能做什么

博客搜索工具的职责应该足够窄：根据关键词和可选标签，返回已发布文章的标题、摘要、链接和相关片段。它不负责修改文章，不负责访问草稿，也不负责替用户猜测没有检索到的内容。

```ts
type SearchBlogInput = {
  query: string
  tags?: string[]
  limit?: number
  includeDrafts?: false
}

type SearchBlogResult = {
  results: Array<{
    id: string
    title: string
    summary: string
    url: string
    snippet: string
    score: number
  }>
  searchedAt: string
  indexVersion: string
}
```

`includeDrafts: false` 不是为了好看，而是把禁止访问写进协议。草稿、私密文章和后台数据不应该因为 Agent 生成了一个布尔值就被暴露。

## 二、能力声明要让客户端知道边界

MCP Server 启动时，需要声明自己提供哪些工具、工具参数是什么、需要什么权限。工具描述应该写“什么时候使用”和“什么时候不要使用”：

```text
工具：search_blog
用途：搜索公开发布的博客文章
适用：用户询问博客内容、技术主题或文章链接
不适用：查询草稿、修改文章、推断未收录内容
副作用：无，只读
```

描述不是安全控制，但它会影响模型选择。写得模糊，模型更容易把搜索工具当成通用数据库接口；写得清楚，模型至少有机会在正确的场景使用正确的能力。

## 三、参数 Schema 是第一道边界

工具输入必须限制长度、枚举和数量：

```ts
const searchBlogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['query'],
  properties: {
    query: { type: 'string', minLength: 1, maxLength: 200 },
    tags: {
      type: 'array',
      maxItems: 5,
      items: { type: 'string', maxLength: 40 },
    },
    limit: { type: 'integer', minimum: 1, maximum: 20 },
  },
}
```

Schema 可以挡住很多明显错误，但不能代替业务检查。查询字符串通过类型校验后，仍然可能包含恶意提示；标签是字符串，也不代表它有权访问后台标签。输入进入搜索层前，要做长度限制、规范化和必要的安全过滤。

## 四、Server 端必须重新确认身份和范围

工具调用请求里可能带有用户身份、租户和授权范围。它们应该由 Server 从可信连接上下文中获取，不能只信模型或客户端传来的字段：

```ts
type ToolContext = {
  userId: string
  tenantId: string
  roles: string[]
  allowedCollections: string[]
  requestId: string
}

function assertSearchScope(context: ToolContext) {
  if (!context.allowedCollections.includes('published-posts')) {
    throw new PermissionError('无权搜索博客内容')
  }
}
```

当前博客是公开内容时，权限可能看起来简单；一旦扩展到私有文章、团队知识库和多租户内容，搜索范围必须在数据库和索引层执行过滤，而不是搜索完成后再删除结果。

## 五、搜索结果要带引用，不要只返回一段大文本

返回标题、URL、片段、文档 ID 和索引版本，比把整个文章内容塞给模型更容易追溯：

```ts
function toSearchResult(post: Post, score: number): SearchBlogResult['results'][number] {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    url: `/blog/${post.slug}`,
    snippet: makeSnippet(post.body, 500),
    score,
  }
}
```

Agent 生成答案时可以引用 URL 和标题；用户点击后回到原文验证。Server 不应该让模型把搜索片段当成无需核验的事实，尤其在文章内容可能更新时，要返回版本或更新时间。

## 六、错误返回要帮助 Agent 做正确的下一步

不要把所有问题都返回“搜索失败”。工具错误至少分为：参数错误、权限错误、索引不可用、没有结果和超时。

```ts
type ToolError = {
  code: 'INVALID_ARGUMENT' | 'FORBIDDEN' | 'INDEX_UNAVAILABLE' | 'NOT_FOUND' | 'TIMEOUT'
  message: string
  retryable: boolean
  requestId: string
}
```

没有结果不是系统错误，Agent 可以据此诚实回答“没有找到相关内容”；索引不可用可能暂时重试；权限错误不应该重试，更不能换参数绕过。清楚的错误类型比一句“请稍后再试”有用得多。

## 七、MCP Server 也需要超时和限流

一个用户问题可能触发多次搜索。Server 要设置单次查询超时、每个连接的并发和全局限流：

```ts
const SEARCH_TIMEOUT_MS = 800
const MAX_RESULTS = 20

async function searchWithGuard(input: SearchBlogInput, context: ToolContext) {
  assertSearchScope(context)
  const normalized = normalizeQuery(input.query)
  return withTimeout(
    searchIndex(normalized, input.tags, Math.min(input.limit ?? 5, MAX_RESULTS)),
    SEARCH_TIMEOUT_MS
  )
}
```

超时后要取消底层查询并释放资源。限流按用户、租户和连接分开计算，不能让一个 Agent 循环搜索拖垮整台服务。

## 八、只读工具也要审计

搜索没有直接副作用，不代表不需要日志。审计记录可以帮助判断工具是否被滥用、哪些查询经常失败、结果是否来自正确索引：

```ts
type ToolAudit = {
  requestId: string
  userId: string
  tool: string
  queryHash: string
  resultCount: number
  indexVersion: string
  latencyMs: number
  status: 'success' | 'empty' | 'error' | 'blocked'
  createdAt: string
}
```

查询原文可能包含敏感信息，普通日志可以只保存哈希和脱敏摘要；需要调试时使用受控短期存储。审计的目的不是记录一切，而是让团队在出现异常时能还原调用链。

## 九、和博客 Contentlayer 索引连接

博客已有 Markdown 和 Contentlayer 生成的文章数据，可以在 Server 启动时建立轻量索引，或者调用现有搜索服务。关键是保持单一来源：文章发布、撤回和更新后，MCP 搜索结果也要同步。

```ts
type SearchIndex = {
  version: string
  posts: Array<{
    id: string
    title: string
    tags: string[]
    body: string
    published: boolean
    updatedAt: string
  }>
}
```

草稿和未发布内容在索引构建时就排除，不能依赖每次查询临时判断。更新时使用文章哈希和索引版本，避免旧数据继续被 Agent 引用。

## 十、测试要覆盖协议和真实行为

至少准备这些测试：

- 缺少 query 时返回参数错误；
- 超长 query 被拒绝；
- `limit` 不会超过服务端上限；
- 草稿和私有内容不会出现在结果里；
- 没有结果时返回明确状态；
- 索引超时可以被识别为可重试错误；
- 同一请求不会泄漏其他租户结果；
- 文章撤回后旧索引不会继续返回；
- 重复调用不会产生额外副作用；
- 审计日志不包含未经处理的敏感原文。

还要做 Agent 级测试：给模型模糊问题、恶意指令和搜索失败，观察它是否正确选择工具、是否引用真实结果、是否在没有证据时拒答。协议通过不等于模型一定会正确使用。

## 总结：暴露能力之前先设计边界

MCP Server 最容易被简化成“注册一个工具，再返回搜索结果”。真正落地时，你需要定义工具职责、参数 Schema、身份和权限、索引版本、结果引用、错误语义、超时限流和审计。协议让连接变得统一，工程约束才让连接变得可靠。

我现在设计一个给 Agent 的工具，会先问：它能访问什么，不能访问什么？返回结果从哪里来，过期怎么办？调用失败时 Agent 应该重试、换路还是诚实停止？虽然它是只读工具，是否仍然可能泄漏敏感信息？

给博客暴露搜索能力只是一个小例子，但它说明了一个更大的原则：工具不是模型的手脚，而是系统对外开放的一扇门。门越方便，越要知道谁能进、能看到什么、出了问题怎么关上。只有把这些边界写进协议、代码和测试，MCP Server 才不是一个能被调用的 Demo，而是一个值得长期接入的工程能力。
