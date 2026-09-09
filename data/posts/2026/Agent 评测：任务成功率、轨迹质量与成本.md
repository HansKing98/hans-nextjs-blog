---
title: Agent 评测：任务成功率、轨迹质量与成本
date: 2025-08-17 10:00:00
tags:
  - AI
  - LLM
  - Agent
  - 模型评测
  - 成本优化
summary: Agent 评测不能只看最终任务成功率，还要衡量工具轨迹、失败安全性、恢复能力、延迟和单位成功任务成本。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖 Agent 任务规划、工具调用、轨迹记录、评测指标、成本统计与安全控制知识
 * [OUTPUT]: 对外提供 Agent 任务成功率、轨迹质量、恢复能力、成本与风险的综合评测框架
 * [POS]: 大模型工程系列的 Agent 评测文章，承接任务型基准测试，服务后续推理基础设施主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Agent 评测：任务成功率、轨迹质量与成本

评测聊天模型时，我们常问一句：“答案对不对？”评测 Agent 时，这个问题远远不够。Agent 可能最后完成了任务，却在中间访问了不该访问的数据；也可能最终失败了，但它很早就发现条件不足并安全停止。两种情况的风险完全不同。

我以前也被任务成功率吸引过。一个版本从 72% 提升到 80%，看起来进步很大。后来回放轨迹，发现它只是变得更敢执行：遇到不确定的页面也继续点击，遇到权限错误也反复重试。成功率上去了，安全边界却坏了。

Agent 评测应该像驾驶考试，既看是否到达目的地，也看是否遵守规则、是否浪费资源、遇到突发情况是否知道刹车。最终结果、执行过程和资源代价，必须一起看。

## 一、先定义任务成功而不是模型成功

一个任务的成功状态应该由业务事实判断：数据库记录是否改变，文件是否生成，页面是否到达目标，报告是否通过校验。不能只看 Agent 的最后一句话。

```ts
type TaskDefinition = {
  taskId: string
  instruction: string
  initialState: unknown
  successPredicate: (state: unknown) => boolean
  requiredSteps?: string[]
  forbiddenActions: string[]
  riskLevel: 'low' | 'medium' | 'high'
}
```

例如“创建一个会议”要检查会议是否真的写入日历、时间和参与人是否正确；“整理代码”要检查补丁、测试和构建，而不是看 Agent 是否说“已完成”。成功条件越接近外部事实，评测越不容易被漂亮文字欺骗。

## 二、任务成功率只是第一层

基础指标包括：

- 完整成功率；
- 部分成功率；
- 失败率；
- 正常结束率和异常结束率；
- 平均步骤数；
- 平均模型调用次数。

但成功率要配合失败类型：

```ts
type TaskOutcome = {
  status: 'success' | 'partial' | 'failed' | 'blocked'
  failureType?: 'plan' | 'tool' | 'permission' | 'environment' | 'unknown'
  safetyViolation: boolean
  finalState: string
}
```

一个权限错误后安全停止的失败，和执行了越权操作后任务失败的失败，不能放在同一个数字里。安全违规应该单独统计，并设置不可接受的硬门槛。

## 三、轨迹质量看 Agent 是怎么做的

轨迹包含观察、思考摘要、工具调用、工具结果和状态变化：

```ts
type AgentTrace = {
  taskId: string
  steps: Array<{
    index: number
    observation: unknown
    action?: {
      tool: string
      args: unknown
    }
    result?: unknown
    valid: boolean
  }>
  finalOutcome: TaskOutcome
}
```

可以评估：工具选择是否正确，参数是否符合 Schema，是否在调用前拿到了必要证据，是否重复执行，是否在失败后继续错误方向，是否完成了不必要的步骤。

轨迹质量不是越短越好。少观察一步可能更快，也可能让 Agent 在错误状态上行动。要看最小充分步骤和任务风险：低风险查询可以偏效率，高风险操作必须偏谨慎。

## 四、错误预算不能只奖励冒险

如果只奖励任务成功，Agent 会学会“尽量做下去”。但现实里有些任务应该拒绝或请求确认：权限不足、证据缺失、外部状态不明、动作不可逆。

```text
任务成功 + 安全 → 高价值成功
任务失败 + 安全停止 → 可接受失败
任务成功 + 越权操作 → 不可接受
任务失败 + 已产生错误副作用 → 严重失败
```

评测中要给安全停止和正确拒答留下正向分数，否则优化目标会把系统推向危险方向。对于高风险任务，宁可降低自动完成率，也不能为了几个百分点去掉确认门槛。

## 五、成本要算到成功任务

Agent 一次任务可能调用多个模型和工具，产生输入输出 Token、检索、浏览器、代码执行和人工审核成本。建议记录：

```ts
type AgentCost = {
  inputTokens: number
  outputTokens: number
  modelCalls: number
  toolCalls: number
  retryCalls: number
  humanMinutes: number
  infrastructureCost: number
}
```

关键指标是单位成功任务成本：

```text
单位成功任务成本
= 全部任务成本 / 成功完成任务数
```

Agent A 成功率高但每次调用 30 个工具，Agent B 成功率略低但只需 8 个工具，最终哪一个更适合产品，不能只看成功率。还要看延迟、用户等待、失败重做和人工介入。

## 六、恢复能力是长任务的分水岭

测试工具超时、网络断开、进程重启、重复消息和页面状态变化。恢复时要检查：

- 已完成步骤是否被重复执行；
- 外部副作用是否有幂等保护；
- 状态是否可以从检查点重建；
- 用户是否能看到任务真实进度；
- 恢复后是否会走向不同目标。

```ts
type RecoveryResult = {
  resumed: boolean
  duplicateSideEffects: number
  lostState: boolean
  finalStateMatches: boolean
}
```

一个系统即使正常路径成功率不高，只要能安全恢复和人工接管，也可能比一个平时很高分、出故障就失控的系统更值得上线。

## 七、评测集要有难度和风险分层

按任务难度分为单步、多步、长任务和多智能体；按风险分为低、中、高。每个层级单独报告：

```text
低风险查询：成功 96%，成本 0.02
普通业务操作：成功 88%，成本 0.15
高风险操作：自动完成 62%，安全违规 0
长任务恢复：恢复成功 81%，重复副作用 0
```

高风险自动完成率低不一定是坏事，只要它能正确判断什么时候需要人工。把所有任务混成一个平均分，往往会鼓励系统优化最容易的样本，忽略真正重要的边界。

## 八、离线评测和线上反馈要互相连接

离线测试提供稳定基线，线上反馈提供真实分布。用户负反馈、任务取消、人工接管、重试次数和安全拦截都应该回流到评测集，但要脱敏并经过审核。

```text
线上 Trace
  ↓
失败分类
  ↓
脱敏与人工确认
  ↓
新增回归任务
  ↓
下一版本门禁
```

线上不应该直接把所有失败当成训练数据。错误轨迹里可能包含敏感信息，也可能是环境故障而不是模型能力问题。

## 九、评测报告要帮助做决策

报告不要只给一个排行榜。至少包含版本、环境、数据集、成功率、失败分布、轨迹指标、成本、延迟和安全事件：

```ts
type AgentReport = {
  agentVersion: string
  datasetVersion: string
  taskSuccessRate: number
  safeStopRate: number
  safetyViolationRate: number
  recoveryRate: number
  averageSteps: number
  p95LatencyMs: number
  costPerSuccess: number
  failureClusters: Record<string, number>
}
```

同时列出新增失败和已修复失败。发布决定应当回答“这个版本适合哪些任务，不适合哪些任务”，而不是宣布一个脱离场景的总冠军。

## 总结：Agent 评测是在评估一套行为

我现在判断 Agent 是否进步，不会只看它完成了多少任务，而会一起看：它是否用正确的工具，是否遵守权限，是否在证据不足时停止，失败后是否能恢复，完成一次任务花了多少资源。

任务成功率回答“能不能做成”，轨迹质量回答“做得对不对”，安全指标回答“能不能托付”，恢复指标回答“出故障后怎么办”，成本和延迟回答“值不值得长期运行”。缺少任何一个维度，评测都会偏向某一种危险的优化。

一个成熟的 Agent 不应该为了高分而冒险。它可以在低风险任务上快，在复杂任务上慢一点，在高风险任务上请求确认，在不确定时清楚地说“我无法安全完成”。当评测体系奖励这种谨慎、可解释和可恢复的行为，模型能力才会真正转化为产品能力。
