---
title: Tool Calling 的可靠性：Schema、重试与幂等
date: 2025-04-27 10:00:00
tags:
  - AI
  - LLM
  - Agent
  - Tool Calling
  - 工程实践
summary: Tool Calling 的难点不在于把函数描述给模型，而在于处理错误参数、重复调用、超时、部分成功和高风险副作用，本文给出一套可靠性设计方法。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖大模型 Tool Calling、JSON Schema、重试、幂等、超时与权限控制概念
 * [OUTPUT]: 对外提供可靠工具调用的 Schema 设计、执行网关、错误分类、重试与幂等实现思路
 * [POS]: 大模型工程系列的 Tool Calling 工程实践文章，承接 ReAct Agent，服务后续多智能体与 MCP 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Tool Calling 的可靠性：Schema、重试与幂等

第一次让模型调用工具，体验通常很好。你给它一个天气函数，写清楚 `city` 参数，它就能生成一段调用请求；服务端返回结果，模型再把天气说给用户听。整个过程像变魔术，几行代码就让聊天应用拥有了行动能力。

然后你把工具换成真实业务：创建订单、发邮件、退款、发布代码。魔术很快变成事故演练。模型少传了一个字段，工具重试了两次，第一次请求其实已经成功但响应在网络中丢了，第二次重试又扣了一次库存。最后大家会发现，Tool Calling 的核心问题不是“模型能不能生成 JSON”，而是“一个不可靠的调用者，怎样被放进一个必须可靠的业务系统”。

这篇文章是我反复看调用日志后留下的结论：Schema 负责约束形状，执行层负责验证语义，重试负责处理暂时性故障，幂等负责抵挡重复动作，审批负责守住高风险边界。少了任何一层，系统都可能在看似正常的时候悄悄出错。

## 一、工具描述不是实现，Schema 也不是护身符

工具描述至少要说清楚四件事：它做什么、什么时候使用、输入是什么、会不会产生副作用。不要只写一个函数名和一句“调用接口”，模型需要知道能力边界。

```ts
const createRefundTool = {
  name: 'create_refund',
  description: [
    '为已支付且符合政策的订单创建退款申请。',
    '这是有副作用的操作，执行前必须获得用户确认。',
    '不要用于查询退款状态，也不要重复提交同一订单。',
  ].join(' '),
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['orderId', 'amount', 'reason'],
    properties: {
      orderId: { type: 'string', pattern: '^ORD-[0-9]+$' },
      amount: { type: 'number', exclusiveMinimum: 0 },
      reason: { type: 'string', minLength: 2, maxLength: 200 },
    },
  },
}
```

`additionalProperties: false` 很有价值，它可以挡住模型随手增加的字段。但 Schema 只能证明“字段长得像对的”，不能证明“业务上真的允许”。订单存在不代表当前用户能操作，退款金额是数字也不代表没有超过可退余额。因此参数至少要经过三道检查：格式检查、权限检查、业务状态检查。

## 二、把调用拆成准备、确认、执行三个阶段

我不建议收到模型的 `tool_call` 后直接执行。更清楚的流程是：

```text
模型提出调用
      ↓
解析与 Schema 校验
      ↓
权限和业务预检查
      ↓
生成执行预览
      ↓
用户确认（高风险操作）
      ↓
带幂等键执行
      ↓
记录结果并返回模型
```

查询天气可以跳过人工确认，发邮件、删除文件和付款则不应该跳过。预览阶段应告诉用户将要对哪个资源做什么、影响范围多大、预计产生什么后果。确认不是一句“好的”，而应该与具体的操作意图绑定，避免用户确认了一个模糊计划，系统却执行了另一件事。

准备阶段还可以把模型的自然语言参数转换为内部类型。例如模型传来“下周一”，不要直接写入数据库；先根据用户时区解析出明确的时间，再把解析结果展示给用户或交给业务规则验证。机器系统不应该把含糊的人话一路传到底层。

## 三、错误分类决定重试策略

最糟糕的重试逻辑是：只要抛异常，就再调用一次。因为不同错误的含义完全不同。

```ts
type ToolErrorCode =
  | 'INVALID_ARGUMENT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UNKNOWN'

type ToolError = {
  code: ToolErrorCode
  message: string
  retryable: boolean
  requestId: string
}
```

参数错误、权限拒绝和资源不存在，重试没有意义，应该把可理解的错误交回模型，让它修正参数或向用户提问。限流、超时和上游暂时不可用，通常可以重试，但要使用指数退避和随机抖动，避免一群请求同时再次撞向故障服务。

冲突错误更微妙。两个 Agent 同时修改同一份资料时，简单重试可能覆盖别人的更新；这时应重新读取最新版本、重新判断，或者直接交给人工。未知错误也不应该默认可重试，先记录证据再决定。

```ts
function shouldRetry(error: ToolError, attempt: number) {
  const retryable = new Set<ToolErrorCode>([
    'RATE_LIMITED',
    'TIMEOUT',
    'UPSTREAM_UNAVAILABLE',
  ])

  return error.retryable && retryable.has(error.code) && attempt < 3
}

function backoffMs(attempt: number) {
  const base = Math.min(1000 * 2 ** attempt, 8000)
  return base + Math.floor(Math.random() * 300)
}
```

重试次数也应该是预算的一部分。一个 Agent 循环里可能调用多个工具，如果每个工具都允许重试三次，整体请求的最坏成本会迅速膨胀。除了单工具上限，还要有任务级的总调用次数、总 Token 和总时间限制。

## 四、幂等是副作用工具的生命线

网络世界里，“没有收到响应”不等于“服务没有执行”。请求可能已经写入数据库，只是在返回途中超时。此时重试会遇到一个危险问题：到底是继续，还是可能重复？

解决办法是让每次业务意图带一个稳定的幂等键：

```ts
type ExecuteContext = {
  requestId: string
  idempotencyKey: string
  userId: string
}

async function createRefund(
  input: { orderId: string; amount: number; reason: string },
  context: ExecuteContext,
) {
  const previous = await refundStore.findByIdempotencyKey(
    context.idempotencyKey,
  )
  if (previous) return previous.result

  const result = await database.transaction(async (tx) => {
    const order = await tx.orders.lockAndGet(input.orderId)
    if (!order || order.status !== 'PAID') {
      throw toolError('CONFLICT', '订单当前不可退款')
    }

    const refund = await tx.refunds.insert({
      ...input,
      userId: context.userId,
      idempotencyKey: context.idempotencyKey,
    })
    return refund
  })

  await refundStore.saveResult(context.idempotencyKey, result)
  return result
}
```

实际系统里，幂等键应在数据库中建立唯一约束，并且“检查旧结果”和“写入新结果”要处于可靠的事务或原子操作中。只在应用内存里放一个 `Set` 不算幂等，服务重启、水平扩展或并发请求都会让它失效。

幂等键的生命周期也要想清楚。它不能只用用户 ID，因为同一个用户会有多次合法操作；也不能每次重试都随机生成，否则服务端无法识别重复。通常可以由一次用户意图、一次审批记录或一次任务步骤生成，并在整个重试周期内保持不变。

## 五、模型错误与系统错误要分开记录

线上排查 Tool Calling，最怕看到一条笼统日志：“工具调用失败”。我们至少要知道：模型生成了什么、Schema 哪里不对、权限检查结果怎样、业务状态是什么、实际请求是否发出、上游返回了什么，以及最后一次重试用了哪个幂等键。

可以为每次调用记录结构化事件：

```ts
type ToolTrace = {
  traceId: string
  toolName: string
  modelCallId: string
  inputHash: string
  validation: 'passed' | 'failed'
  approval: 'not_required' | 'pending' | 'approved' | 'rejected'
  attempts: number
  idempotencyKey?: string
  outcome: 'succeeded' | 'rejected' | 'timed_out' | 'failed'
  latencyMs: number
}
```

敏感参数不能不加思考地原文落日志，订单号、邮箱、访问令牌和用户输入都应按场景脱敏。排障需要的是可关联的证据，不是把生产数据复制到所有人的日志平台。

还要区分两类失败：模型提出了错误工具或错误参数，这是模型行为问题；工具已经收到合法请求但上游不可用，这是基础设施问题。两个问题都显示为“最终回答失败”，但修复路径完全不同。没有这层区分，团队很容易花时间调 Prompt，实际上坏的是数据库连接池。

## 六、返回给模型的错误要能帮助它做下一步

错误消息不是给开发者看的堆栈，也不是一句“系统异常”。如果错误可以恢复，就应该告诉模型下一步能做什么；如果不可恢复，就明确停止。

```json
{
  "isError": true,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "你无权操作该订单",
    "nextAction": "ask_user_for_authorized_order"
  }
}
```

当然，`nextAction` 也不能让模型绕过权限。它只是帮助编排层理解状态，真正的权限判断仍然必须由服务端完成。返回错误时不要把内部 SQL、令牌或堆栈暴露出去；给模型的上下文应足够行动，但不应扩大泄露面。

对于部分成功的批量操作，不能只返回“失败”。例如十个文件中八个已经处理成功，结果应包含每个项目的状态，后续重试只处理未完成的两个。把部分成功压扁成一个布尔值，会迫使 Agent 重做全部工作，也会制造重复副作用。

## 七、什么时候应该拒绝让模型调用

有些场景不是加一层重试就能解决的。以下情况我会直接让执行层拒绝自动调用：请求目标不明确、权限无法确认、金额或影响范围超过阈值、操作不可逆、输入来自不可信网页且包含指令、或者调用链已经超出任务预算。

拒绝不是系统无能，而是可靠性的一部分。Agent 的价值不是永远说“可以”，而是知道什么时候应该停下来。对高风险动作，人工确认、双人审批或离线队列都比一次“模型看起来很确定”的调用更合适。

## 八、我的总结：让模型负责提议，让系统负责承诺

研究 Tool Calling 一段时间后，我越来越不愿意把模型输出叫作“执行命令”。它更像一次提议：模型根据上下文提出“我认为应该调用这个能力，并传入这些参数”。真正的承诺——扣款、写库、发信、删除、发布——必须由确定性的执行层作出。

Schema 让提议有形状，业务校验让提议符合现实，审批让用户知道后果，幂等让重复不至于造成灾难，错误分类和重试让暂时性故障能够恢复，Trace 则让我们在出错后知道发生了什么。

如果你的 Tool Calling Demo 只有“模型生成 JSON，函数执行，结果返回”三步，它当然可以作为起点，但不要把它误认为生产方案。真正成熟的系统，会认真处理那些最不戏剧化、却最容易出事故的时刻：响应丢了、请求重复了、权限变了、库存被别人抢先改了、模型把不确定的日期当成了确定日期。

把这些边界一层层补上，工具调用才不只是让模型“会做事”，而是让它在真实系统里以可控、可追踪、可恢复的方式做事。这才是 Agent 工程真正值得学习的地方。
