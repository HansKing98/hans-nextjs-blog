---
title: LLM 网关设计：统一鉴权、限流、重试与审计
date: 2026-01-13 10:00:00
tags:
  - AI
  - LLM
  - API Gateway
  - 限流
  - 可观测性
summary: LLM 网关把模型调用从业务代码中收拢起来，统一处理鉴权、路由、限流、重试、数据策略、成本统计和审计。
categories:
  - 人工智能
  - 系统架构
---

{/*
 * [INPUT]: 依赖 HTTP 网关、模型供应商 API、租户鉴权、限流、重试、成本统计与审计概念
 * [OUTPUT]: 对外提供 LLM Gateway 的职责边界、请求协议、可靠性和安全设计方法
 * [POS]: 大模型工程系列的网关架构文章，承接模型选型，服务后续结构化生成与评测主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# LLM 网关设计：统一鉴权、限流、重试与审计

项目刚开始接入大模型时，通常是一个页面一个 API Key，一个服务一个调用函数。聊天页面直接调用供应商，摘要服务再复制一份代码，后台任务又有自己的超时和重试。这样做很快，但也会很快失控：密钥散落在环境变量里，某个租户把额度打满，供应商切换要改几十处，线上出了问题却找不到完整调用记录。

我后来越来越确定，LLM 调用应该有一个明确的边界。业务代码只表达“我要完成什么任务”，网关负责“用哪个模型、以什么权限、花多少预算、失败怎么办”。网关不是为了增加一层抽象，而是把所有调用都必须遵守的规则放在同一个地方。

## 一、网关到底负责什么

一个 LLM 网关至少处理：

```text
业务请求
  ↓
身份认证与租户授权
  ↓
策略检查与模型路由
  ↓
限流、配额与成本预估
  ↓
供应商适配与请求发送
  ↓
重试、熔断与降级
  ↓
输出校验、日志与审计
```

网关不应该承载业务领域规则。例如“退款是否允许”是业务服务的职责；“这次调用是否允许使用某个模型、是否超过租户预算”是网关的职责。边界清楚，才能避免网关变成另一个什么都知道的巨型服务。

## 二、先定义统一请求协议

不同供应商的 API 参数不一样，业务代码不应该感知所有差异。可以定义内部协议：

```ts
type LLMRequest = {
  requestId: string
  tenantId: string
  purpose: 'chat' | 'rag' | 'agent' | 'classification'
  messages: Message[]
  responseFormat?: ResponseFormat
  maxOutputTokens?: number
  priority?: 'normal' | 'high'
  dataClassification: 'public' | 'internal' | 'sensitive'
}
```

返回值也统一：

```ts
type LLMResponse = {
  requestId: string
  model: string
  content: string
  inputTokens: number
  outputTokens: number
  finishReason: string
  latencyMs: number
  providerRequestId?: string
}
```

有了内部协议，供应商更换、模型路由和成本统计都不会渗透到每个业务模块。新增一个模型适配器，只需要实现网关要求的能力，而不是让所有调用方重新学习一套 API。

## 三、鉴权和授权要分开

鉴权回答“你是谁”，授权回答“你能做什么”。网关先验证调用方身份，再根据租户、用户、功能和数据分类决定是否放行。

```ts
type PolicyDecision = {
  allowed: boolean
  allowedModels: string[]
  maxInputTokens: number
  maxOutputTokens: number
  requiresRedaction: boolean
  reason?: string
}
```

客户端传来的模型名、租户 ID 和优先级都不能直接信任。服务端应从登录态、服务身份和租户配置中构造策略。敏感数据不允许发往某个公共模型时，网关应该拒绝、脱敏或路由到内部模型，而不是相信调用方已经处理过。

密钥只保存在网关或专门的密钥管理系统里，业务服务拿不到供应商原始 Key。密钥轮换、撤销和供应商隔离也因此变得集中可控。

## 四、模型路由要可解释

路由不是简单的“贵模型和便宜模型二选一”。可以根据任务、数据分类、语言、延迟、上下文长度、租户等级和当前供应商健康状况做决策：

```ts
function chooseModel(request: LLMRequest, policy: PolicyDecision) {
  if (request.dataClassification === 'sensitive') {
    return 'internal-small-model'
  }
  if (request.purpose === 'classification') {
    return 'fast-cheap-model'
  }
  if (request.priority === 'high') {
    return 'quality-model'
  }
  return 'balanced-model'
}
```

每次路由都记录理由、候选模型和最终模型。否则发生质量或成本变化时，团队不知道是规则变了、模型健康度变了，还是某个租户配置覆盖了默认策略。

## 五、限流要同时限制请求和资源

只限制每分钟请求数不够。一次请求可能携带很长上下文，消耗几万 Token；一次索引任务还可能触发大量 Embedding。限流至少包含：

- 请求数限制；
- 输入 Token 速率限制；
- 输出 Token 配额；
- 并发请求数；
- 单租户和单用户限制；
- 后台任务与交互任务的优先级。

```ts
type Quota = {
  requestsPerMinute: number
  inputTokensPerDay: number
  outputTokensPerDay: number
  maxConcurrent: number
}
```

限流状态要按租户隔离。某个客户流量暴涨时，不能让全站共享一个桶一起被锁死。高优先级也不意味着无限资源，仍然需要全局保护，防止所有租户同时把供应商和内部队列打满。

## 六、重试要防止重复副作用

模型生成通常是相对安全的重试对象，但 Agent 工具调用可能产生外部副作用。网关至少要区分：

```text
连接超时：结果未知，先查询或依赖幂等键
429：按 Retry-After 和退避策略等待
5xx：有限次数重试
4xx 参数错误：不重试
权限错误：不重试
```

请求要有 `requestId` 和幂等键。重试同一个生成请求时，可以关联同一任务；调用发送邮件、扣款或修改数据的工具时，必须由工具服务负责幂等，不能只靠网关“应该不会重复”。

指数退避要加抖动，并设置总超时和最大尝试次数：

```ts
async function callWithRetry<T>(run: () => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await withTimeout(run(), 5000)
    } catch (error) {
      if (!isRetryable(error) || attempt === 3) throw error
      await delay(backoffWithJitter(attempt))
    }
  }
  throw new Error('unreachable')
}
```

## 七、熔断和降级要保留安全边界

供应商持续失败时，网关应暂时熔断，避免请求继续堆积。降级可以切换备用模型、降低上下文、关闭非关键工具，或明确返回暂时不可用。

```text
主模型失败
  ↓
备用模型（同一数据策略）
  ↓
检索结果摘要（经过引用校验）
  ↓
人工处理或明确失败
```

不能为了提高“成功率”而把敏感数据发到不允许的备用模型，也不能在没有证据时让降级模型自由编造答案。降级结果应该有独立状态，方便后续分析用户实际体验。

## 八、审计日志要足够排查，但不要保存一切

一条网关 Trace 至少应包含：

```ts
type GatewayTrace = {
  requestId: string
  tenantId: string
  purpose: string
  selectedModel: string
  routeReason: string
  retryCount: number
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: 'success' | 'error' | 'rate_limited' | 'blocked'
  policyVersion: string
}
```

问题原文和 Prompt 可能包含敏感信息，日志应该默认脱敏、分级和定期删除。调试需要原文时，放在受控短期存储里，使用 Trace ID 关联，而不是把所有内容永久写进普通日志平台。

审计还要记录策略版本、模型版本和供应商请求 ID。这样才能解释一次调用为何被允许、实际走了哪里、花了多少资源，以及出现问题时是否可以回放。

## 九、成本和质量要从同一条链路统计

网关是最适合记录成本的地方，因为它能看到每次调用的 Token、模型、租户、功能和重试。成本事件可以按以下维度聚合：

```text
租户 → 功能 → 模型 → Prompt 版本 → 成功 / 失败 → Token 和延迟
```

不要只追求低价。便宜模型如果负反馈更多、重试更多或需要人工补救，单位成功任务成本可能更高。网关可以提供路由实验和灰度，让团队比较质量、延迟和成本的整体变化。

## 总结：网关不是代理，而是规则的共同入口

我现在认为，LLM 网关最重要的价值不是把几个供应商 API 换成一个 URL，而是让所有模型调用都经过同一套可解释的规则：谁在调用，处理什么数据，用哪个模型，预算是多少，失败怎么退，结果如何记录。

把鉴权、限流、重试、路由、脱敏、审计和成本统计散落在业务代码里，短期可能少写一个服务，长期却会得到十几套不一致的行为。网关集中这些横切能力，业务服务才能专注自己的问题。

当然，网关也不能变成万能的巨型服务。它应该保持清楚的职责边界，依赖版本化策略和模型适配器，所有降级都不能突破安全规则，所有自动重试都要考虑副作用。

一个成熟的 LLM 网关，像机场的塔台：它不替飞机完成旅程，但要知道谁可以起飞、走哪条航线、当前天气如何、出问题时在哪里降落。模型越多、租户越多、业务越重要，越需要这样一个统一而克制的入口。
