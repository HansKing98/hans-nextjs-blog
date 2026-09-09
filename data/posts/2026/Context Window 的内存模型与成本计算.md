---
title: Context Window 的内存模型与成本计算
date: 2024-03-31 10:00:00
tags:
  - AI
  - LLM
  - Context Window
  - KV Cache
  - 成本优化
summary: 上下文窗口不是一个越大越好的数字。本文从输入输出 Token、KV Cache、并发、缓存、长文档和计费出发，建立一套能用于选型与压测的内存和成本模型。
categories:
  - 人工智能
  - 原理教程
---

{/*
 * [INPUT]: 依赖 Token、Transformer 注意力、上下文窗口、KV Cache、并发、缓存与模型计费概念
 * [OUTPUT]: 对外提供上下文窗口的内存模型、成本估算、长上下文策略、并发压测与预算方法
 * [POS]: 大模型工程系列的上下文原理文章，承接 Gemini 1.5 与长上下文主题，服务后续长文档问答与模型评测文章
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

# Context Window 的内存模型与成本计算

“这个模型支持 128K 上下文。”看到这句话时，很多人会本能地把它理解成：我可以放心塞进 128K Token，模型还能像读短句一样回答，价格和速度也只是略有变化。

真正上线长上下文功能后，账单和延迟会很快纠正这个想象。输入 Token 要计费，输出 Token 要计费，推理服务要为上下文保存 KV Cache，并发越高，内存越容易被占满；即使窗口容纳得下整本手册，模型也不一定能稳定找到埋在中间的关键条件。

我以前也把上下文窗口当成一个“容量参数”，后来把每次请求的 Token、显存和延迟拆开记录，才发现它更像一块需要预算的工作区。窗口大小只是上限，真正的工程问题是：这一块工作区由什么组成？它如何随着并发增长？哪些内容值得放进去？每一次增加的上下文，是否真的换来了任务质量？

## 一、Context Window 包含哪些东西

上下文窗口通常表示一次请求中，模型能够处理的 Token 总上限。它往往包括输入和输出，而不是只指用户输入：

```text
上下文总量
= system Prompt
 + 对话历史
 + 用户本轮输入
 + 检索片段 / 工具结果
 + 预留输出 Token
```

如果模型最大窗口是 `N`，输入已经占了 `N - 1000`，那么最多只能为输出预留约 1000 个 Token。不同 API 对超限、截断和保留策略不同，不能只看宣传页上的数字。

```ts
type ContextBudget = {
  maxContextTokens: number
  systemTokens: number
  historyTokens: number
  retrievedTokens: number
  userTokens: number
  reservedOutputTokens: number
}

function usedInputTokens(budget: ContextBudget) {
  return (
    budget.systemTokens +
    budget.historyTokens +
    budget.retrievedTokens +
    budget.userTokens
  )
}

function fitsContext(budget: ContextBudget) {
  return usedInputTokens(budget) + budget.reservedOutputTokens <= budget.maxContextTokens
}
```

系统必须在调用前计算预算。不要等 API 返回“context length exceeded”才发现历史消息、RAG 片段和输出预留加在一起已经超限。

## 二、Token 不是字符，语言和内容会改变比例

中文、英文、代码、表格和特殊符号使用 Token 的方式不同。同样长度的文本，Token 数可能差很多；不能用字符数精确估算计费和上下文。

```text
字符数 ≠ Token 数
Token 数 → 上下文、价格、延迟和部分内存开销
```

输入管道要使用目标模型的 Tokenizer 做预估。模型更换后，原来的长度阈值可能失效；中文知识库和英文代码库也要分别统计。

```ts
type TokenEstimate = {
  characters: number
  tokens: number
  tokenizer: string
  estimatedCost: number
}

function estimate(text: string, tokenizer: Tokenizer, pricePerToken: number) {
  const tokens = tokenizer.encode(text).length
  return {
    characters: text.length,
    tokens,
    tokenizer: tokenizer.name,
    estimatedCost: tokens * pricePerToken,
  }
}
```

估算用于预算，不等于最终账单。供应商可能对缓存、批处理、推理 Token 和不同模型版本使用不同价格，结算数据应该以实际响应的 usage 为准。

## 三、为什么上下文会占显存

在 Transformer 推理中，模型要保存已经处理过的 Key 和 Value，后续生成 Token 时可以复用，这就是 KV Cache。上下文越长、层数越多、隐藏维度越大，KV Cache 越大；并发请求越多，缓存也会按请求叠加。

```text
KV Cache 内存
≈ 层数 × 序列长度 × KV 头数 × 每头维度 × 2（K 与 V）× dtype 字节数
```

这是一个简化公式，实际还受到 GQA/MQA、分页管理、对齐和框架实现影响，但它说明了三个事实：上下文长度会直接影响内存，输出生成会继续增加缓存，多个并发请求会同时占用工作区。

```ts
type KvEstimate = {
  layers: number
  sequenceTokens: number
  kvHeads: number
  headDim: number
  bytesPerValue: number
}

function estimateKvBytes(input: KvEstimate) {
  return (
    input.layers *
    input.sequenceTokens *
    input.kvHeads *
    input.headDim *
    2 *
    input.bytesPerValue
  )
}
```

长上下文模型的权重可能可以放进显存，但 KV Cache 会在长输入和并发场景下成为真正瓶颈。部署时不能只按模型文件大小估算。

## 四、并发让内存问题变成乘法

单个请求使用 32K Token，看起来显存足够；同时处理 16 个请求时，缓存需求可能接近 16 倍。真实服务还要给运行时、调度和临时张量留安全余量。

```text
总 KV Cache
≈ 单请求 KV Cache × 活跃请求数
```

```ts
type ConcurrencyPlan = {
  kvBytesPerRequest: number
  maxActiveRequests: number
  runtimeReserveBytes: number
  totalMemoryBytes: number
}

function planMemory(
  kvBytesPerRequest: number,
  maxActiveRequests: number,
  runtimeReserveBytes: number,
) {
  return {
    kvBytesPerRequest,
    maxActiveRequests,
    runtimeReserveBytes,
    totalMemoryBytes:
      kvBytesPerRequest * maxActiveRequests + runtimeReserveBytes,
  }
}
```

长请求不能无限占用并发槽位。服务可以按 Token 预算、截止时间和优先级调度，设置最大上下文、最大输出和队列上限。队列满时明确返回过载或异步处理，不要让请求无限等待。

## 五、长上下文不等于模型有效利用全文

即使输入没有超限，模型也可能遗漏中间信息、被重复内容干扰，或者把互相冲突的段落混在一起。窗口解决了“装得下”，没有自动解决“找得到”和“用得对”。

```text
容量：能否把内容放入窗口
利用：模型能否定位关键内容
质量：模型能否正确使用并引用内容
```

长上下文评测要把关键事实放在开头、中间和结尾，测试多段关联、冲突、无答案和噪声。只把一篇长文章放进去让模型总结，无法证明它真的使用了所有内容。

## 六、什么时候应该用检索而不是全文输入

如果文档很长但问题只涉及局部内容，检索可以减少输入成本和注意力噪声；如果需要全局主题、章节关系和跨段总结，分层摘要或 Map-Reduce 更合适；如果文档短且低频，一次性输入可能最简单。

```text
局部事实 → RAG / 精确检索
全文主题 → 分层摘要 / Map-Reduce
短文档低频 → 直接长上下文
持续对话 → 摘要 + 最近历史 + 重要记忆
```

选择不是“窗口越大越先进”，而是让进入上下文的每个 Token 都有任务价值。上下文过长会增加成本，也会让模型更难分辨重点。

## 七、对话历史应该如何增长

聊天应用最容易把全部历史消息原样追加。短期看体验连续，长期看 Token 和成本线性增长，旧消息还可能与当前目标冲突。

可以分层管理历史：

```text
最近几轮原文
   + 会话摘要
   + 用户确认的长期事实
   + 当前任务状态
```

```ts
type ConversationContext = {
  recentMessages: ChatMessage[]
  summary: string
  durableFacts: string[]
  currentTask?: string
}

function buildConversationInput(context: ConversationContext) {
  return [
    context.summary,
    ...context.durableFacts,
    ...context.recentMessages.map((message) => message.content),
    context.currentTask ?? '',
  ].join('\n')
}
```

摘要必须标记来源和更新时间，不能把模型猜出的信息当成用户确认的事实。历史压缩后要做回归，检查关键约束、否定条件和任务状态是否丢失。

## 八、成本计算要包含输入和输出

很多团队只估算输出 Token，忽略了每轮重复发送的长输入。一个对话请求的粗略成本可以写成：

```text
请求成本
= 输入 Token × 输入单价
 + 输出 Token × 输出单价
 + 工具 / 检索 / 多模态处理成本
```

```ts
type PriceTable = {
  inputPerMillion: number
  outputPerMillion: number
  cachedInputPerMillion?: number
}

function estimateRequestCost(
  inputTokens: number,
  outputTokens: number,
  price: PriceTable,
) {
  return (
    inputTokens / 1_000_000 * price.inputPerMillion +
    outputTokens / 1_000_000 * price.outputPerMillion
  )
}
```

缓存命中可能降低输入成本，但要确认缓存的有效范围、隐私边界和失效条件。不能为了省 Token，把不同用户的上下文放进同一个不安全缓存键。

更有意义的指标是每个成功任务成本：

```text
成功任务成本
= 总请求成本 / 成功完成任务数
```

如果上下文变长让成功率提升，额外成本可能值得；如果只是增加噪声和延迟，应该减少上下文，而不是继续扩大窗口。

## 九、服务端要做上下文预算器

不要让每个业务页面自己拼 Prompt 和计算长度。统一的上下文预算器可以根据任务、模型和截止时间决定保留什么：

```ts
type ContextItem = {
  kind: 'system' | 'history' | 'retrieval' | 'tool' | 'user'
  text: string
  priority: number
  tokens: number
  required: boolean
}

function selectContext(items: ContextItem[], maxTokens: number) {
  const required = items.filter((item) => item.required)
  const optional = items
    .filter((item) => !item.required)
    .sort((left, right) => right.priority - left.priority)
  const selected = [...required]
  let used = selected.reduce((sum, item) => sum + item.tokens, 0)

  for (const item of optional) {
    if (used + item.tokens > maxTokens) continue
    selected.push(item)
    used += item.tokens
  }
  return selected
}
```

预算器要保证系统规则和当前用户问题不会被可选历史挤掉。检索片段可以按相关性、来源可信度和权限排序；旧消息可以摘要或丢弃；工具结果可以压缩，但关键字段要保留。

## 十、长上下文压测应该怎么做

压测不要只增加请求数，还要同时控制输入长度和输出长度。建立矩阵：2K、8K、32K、64K 输入，1、4、8、16 并发，分别测首 Token、完整响应、峰值显存、吞吐和错误率。

```ts
type ContextBenchmark = {
  inputTokens: number
  outputTokens: number
  concurrency: number
  firstTokenP95Ms: number
  completionP95Ms: number
  peakMemoryGb: number
  tokensPerSecond: number
  errorRate: number
}
```

观察拐点：输入长度到哪里开始显著增加延迟？并发到哪里开始排队？哪种组合会触发 OOM？模型在中间位置的信息命中率是否下降？这些数据比“支持 128K”更能指导产品配置。

## 十一、上下文窗口会影响系统架构

窗口较小时，系统更依赖检索、摘要和记忆；窗口变大后，可能减少一部分切分工作，却增加输入成本、KV Cache 和长任务调度。架构不会因为窗口变大而自动变简单，只是瓶颈发生了移动。

```text
短窗口：切分与检索压力大
长窗口：内存、成本、注意力利用和并发压力大
```

长任务最好使用异步队列、检查点和取消。用户取消后，服务端要停止生成并释放 KV Cache；模型已经完成足够信息时要提前结束，不要为了填满最大输出继续计算。

## 十二、我的总结：窗口是预算，不是宣传数字

Context Window 表示模型一次可以处理的最大 Token 范围，但产品真正拥有的是一块有限工作区。System Prompt、历史、检索结果、工具输出和预留答案共同占用它；每个输入 Token 还会影响计费、延迟和推理内存。

我现在做上下文设计，会先测任务需要什么信息，再决定直接长上下文、检索、摘要还是分层处理；调用前计算 Token 预算，服务端限制并发和输出，线上记录输入长度、KV Cache、P95 延迟和成功任务成本。

最重要的不是把窗口用满，而是让进入窗口的内容值得占据位置。短而相关的上下文，常常胜过长而嘈杂的全文；能通过工具确认的事实，不应该靠历史消息反复携带；已经完成的任务，也不应该永远占着对话空间。

长上下文是很有价值的能力，但它不是免费的记忆，也不是理解能力的保证。把内存、成本、质量和并发放在同一张预算表里，模型的“能装下”才会真正变成系统的“用得好”。
