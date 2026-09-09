---
title: Agent 失败模式：循环、幻觉、工具误用与失控
date: 2025-01-26 10:00:00
tags:
  - AI
  - LLM
  - Agent
  - 可靠性
  - 安全工程
summary: Agent 的危险失败不只是模型答错，还包括无限循环、状态漂移、幻觉参数、工具误用、权限越界和无止境重试，需要用状态机和止损机制约束。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖 Agent 规划、工具调用、状态机、权限、重试、可观测性与故障恢复知识
 * [OUTPUT]: 对外提供 Agent 常见失败模式、根因分析、检测信号和止损设计方法
 * [POS]: 大模型工程系列的 Agent 可靠性文章，承接人机审批，服务后续 Agent 评测主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Agent 失败模式：循环、幻觉、工具误用与失控

Agent 出问题时，最吓人的往往不是它立刻报错，而是它表现得很忙。它不断调用搜索工具，反复修改同一个文件，连续尝试一个已经失败的参数，最后还告诉你“正在处理”。日志里有大量活动，业务状态却没有前进。

我第一次排查 Agent 循环时，最初以为是模型不够聪明。后来把完整轨迹展开，发现模型每一轮都拿到了相同的错误结果，却没有任何状态告诉它“这个方案已经试过了”。它不是在思考，而是在重复撞同一扇门。

Agent 的失败需要被分类。只有知道它是规划错误、状态错误、工具错误还是权限错误，系统才知道该重试、降级、暂停还是请求人工。把所有失败都重新交给模型，等于让一个已经迷路的人继续自己画地图。

## 一、无限循环：任务在动，结果不动

常见循环是：模型调用工具，工具返回失败，模型换一种说法再次调用同一个工具；或者它每次都判断“还需要再查一次”，却没有新的信息进入上下文。

```text
search → empty
  ↓
改写问题 → search → empty
  ↓
再次改写 → search → empty
```

每一步都看起来合理，整体却没有进展。系统需要记录动作指纹和状态变化：

```ts
type StepRecord = {
  stepId: string
  actionHash: string
  observationHash: string
  changedState: boolean
  createdAt: string
}
```

如果连续多次动作和观察都没有产生新状态，就应该暂停。最大步骤数是最后一道保险，但比“执行 50 步后强制失败”更好的方式，是提前识别没有进展的循环。

## 二、状态漂移：模型记住的和系统发生的不是一回事

Agent 的上下文可能说“文件已经修改”，但工具实际写入失败；它可能说“订单已创建”，但外部 API 返回超时，真实状态未知。下一轮如果只相信自己的历史文字，就会建立在错误事实之上。

```ts
type Fact = {
  name: string
  value: unknown
  source: 'tool' | 'database' | 'user' | 'model'
  verifiedAt?: string
}
```

影响任务的关键事实，应该来自工具结果、数据库或用户确认，而不是模型自己的总结。模型可以提出“我认为已经完成”，系统要通过查询验证“确实完成了吗”。

状态还会因为外部用户或其他服务改变。Agent 等待审批期间，订单可能被取消，文件可能被删除，权限可能被撤回。长任务恢复和每个高风险动作前，都要重新读取当前事实。

## 三、幻觉参数：工具调用合法，含义却是假的

模型可能生成符合 JSON Schema 的参数，但值并不存在：一个看起来合理的订单号、一个不存在的文件路径、一个没有依据的日期。形状校验通过，不代表业务校验通过。

```ts
async function validateOrderArgs(args: { orderId: string }) {
  const order = await orders.findById(args.orderId)
  if (!order) throw new InvalidToolArgsError('订单不存在')
  return order
}
```

工具服务必须重新验证资源存在性、租户、权限、状态和参数范围。不要因为模型刚刚从检索结果里“看见”一个 ID，就跳过数据库确认。

高风险参数还应该展示给用户确认，尤其是金额、收件人、删除范围和权限对象。模型生成的参数只是候选值，不是授权事实。

## 四、工具误用：模型选择了错误能力

工具描述相似时，模型可能调用搜索工具代替数据库查询，调用发送工具代替草稿工具，或者为了获得一个简单答案而连续调用多个昂贵工具。

工具目录要写清楚适用范围和禁止范围：

```ts
type ToolContract = {
  name: string
  purpose: string
  preconditions: string[]
  sideEffects: string[]
  forbiddenUses: string[]
  risk: 'low' | 'medium' | 'high'
}
```

更重要的是，在工具执行前由服务端做策略判断。模型的选择可以被拒绝，拒绝理由再返回给它，让它重新规划或请求人工。工具描述帮助模型做选择，服务端策略负责最后把关。

## 五、权限越界：最不能靠 Prompt 解决

“你不能访问其他租户的数据”写在系统 Prompt 里，只是一条意图，不是访问控制。每个工具都要接收服务端构造的权限范围，并在数据层过滤。

```ts
async function listDocuments(scope: RequestScope, projectId: string) {
  assert(scope.projectIds.includes(projectId))
  return documents.findMany({
    where: { tenantId: scope.tenantId, projectId },
  })
}
```

工具返回结果也要脱敏。即使查询服务内部存在管理员能力，普通 Agent 也不能通过改参数获得它。权限判断要贯穿模型调用、检索、缓存、工具和日志。

## 六、无止境重试：把故障放大成事故

重试能处理临时网络问题，但错误参数、权限拒绝和业务状态冲突不会因为多试几次就消失。每类错误要有不同策略：

```text
网络超时：有限重试或查询状态
429：退避等待
参数错误：修正或转人工
权限错误：立即停止
状态冲突：重新读取事实
```

```ts
type RetryPolicy = {
  maxAttempts: number
  retryableCodes: string[]
  backoffMs: number[]
  totalDeadlineMs: number
}
```

重试次数要同时按任务、工具、租户和全局资源限制。多个层级都重试时，很容易出现指数放大：网关重试三次，Agent 再试三轮，工具客户端再试两次，最终一次用户请求变成十八次外部调用。

## 七、计划漂移：目标在执行中悄悄改变

Agent 可能在遇到一个小错误后重新规划，逐渐把原目标换成另一个更容易完成的目标。用户说“整理报告”，它最后只生成了一个摘要；用户说“修复 Bug”，它最后把测试注释掉。

任务要保存不可变的原始目标和验收条件，每次重新规划都要比较：

```ts
type PlanRevision = {
  revision: number
  originalGoal: string
  acceptanceCriteria: string[]
  changedSteps: string[]
  changeReason: string
}
```

如果验收条件变化，应该请求人工，而不是让模型自己降低目标。计划可以调整步骤，不能悄悄改变成功定义。

## 八、如何设计止损机制

Agent 必须有明确的硬限制：

- 最大步骤数和总运行时间；
- 最大模型调用和工具调用次数；
- 最大 Token 与费用；
- 最大影响对象数量；
- 单个工具和单个租户的并发；
- 连续无进展次数；
- 高风险动作必须审批。

```ts
type Guardrail = {
  maxSteps: number
  deadlineMs: number
  maxCost: number
  maxSideEffects: number
  noProgressLimit: number
}
```

触发限制后不要只抛一个通用错误。系统应该保存当前状态、失败原因、已完成动作和下一步建议，方便用户恢复或人工接管。

## 九、把失败变成可观察事件

每次失败至少记录：任务、步骤、模型版本、工具、参数校验结果、错误类型、重试次数、状态变化和最终处理：

```ts
type FailureEvent = {
  taskId: string
  stepId: string
  failureType: 'loop' | 'hallucination' | 'tool' | 'permission' | 'timeout'
  retryCount: number
  stateChanged: boolean
  action: 'retry' | 'pause' | 'fallback' | 'human'
  timestamp: string
}
```

按失败类型聚类以后，团队才能知道优先修什么。循环多，可能是状态设计问题；幻觉参数多，可能是工具前置校验不足；权限阻断多，可能是产品边界没有讲清楚。

## 十、用故障注入测试 Agent

正常路径很容易通过，故障路径才是可靠性的考试。主动注入：工具超时、重复响应、空结果、错误 Schema、权限变化、页面更新、服务重启和网络断开，观察 Agent 是否安全停止、是否重复副作用、是否能从检查点恢复。

```text
故障注入
  ↓
记录轨迹与状态
  ↓
检查是否越权或重复
  ↓
验证恢复 / 降级 / 人工接管
```

如果每次测试都只问“最终成功了吗”，很多危险路径会被隐藏。应同时检查中间状态和安全事件。

## 总结：失控不是模型突然变坏，而是边界没有落地

Agent 的循环、幻觉、工具误用和无止境重试，表面上像模型能力不足，本质上往往是系统把太多责任交给了自然语言。没有结构化状态，模型会忘记已经试过什么；没有业务校验，合法参数可能指向不存在资源；没有权限边界，Prompt 里的禁止就只是愿望；没有硬性止损，临时故障会变成持续放大。

我现在设计 Agent，会先设计它怎么失败：什么时候暂停，谁来接管，哪些动作不能重复，哪些事实必须重新查询，达到什么成本或时间就结束。一个系统不是因为它在顺利路径上很聪明才可靠，而是因为它在不确定时知道如何少做一点、停下来、把决定交给人。

真正值得托付的 Agent，不是从不犯错的 Agent，而是错误不会无限扩散、不会悄悄越权、不会伪装成成功的 Agent。把状态、权限、校验、重试和止损写进系统，让每一次失败都留下可分析的轨迹，模型才有机会在真实世界里工作，而不是只在演示中保持优雅。
