---
title: Chain-of-Thought、ReAct 与 Tree-of-Thought 对比
date: 2025-01-19 10:00:00
tags:
  - AI
  - LLM
  - 推理
  - ReAct
  - Tree-of-Thought
summary: Chain-of-Thought、ReAct 和 Tree-of-Thought 都在帮助模型解决复杂任务，但它们的状态、搜索空间和工具边界不同。本文用统一视角比较三种方法并给出选型建议。
categories:
  - 人工智能
  - 技术教程
---

{/*
 * [INPUT]: 依赖大语言模型推理、Chain-of-Thought、ReAct、Tree-of-Thought、工具调用与搜索概念
 * [OUTPUT]: 对外提供三种推理编排方法的机制比较、实现骨架、成本分析与选型原则
 * [POS]: 大模型工程系列的推理方法文章，承接推理模型兴起，服务后续 Test-time Compute 与 Agent 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Chain-of-Thought、ReAct 与 Tree-of-Thought 对比

复杂问题往往不是模型“不会回答”，而是它需要先做几步中间工作。比如一道数学题要先列条件，再计算；一个故障排查要先看日志，再查文档；一个旅行计划要不断比较时间、预算和交通。让模型一次性把最终答案吐出来，等于要求它在脑中完成所有步骤，却不给系统任何观察和校验的机会。

于是我们看到三种经常被放在一起讨论的方法：Chain-of-Thought，简称 CoT；ReAct；Tree-of-Thought，简称 ToT。它们都试图让模型“多走几步”，但并不是同一个东西。

我早期做技术选型时也会被名称带偏：看到任务复杂，就想上 ToT；看到需要工具，就想上 ReAct；看到数学推理，就把 Prompt 改成“请一步一步思考”。后来复盘真实轨迹才发现，很多问题只需要把输出结构写清楚，很多问题需要的是工具和观察，只有一小部分任务真的值得维护搜索树。

理解三者的关键，不是背定义，而是问四个问题：中间状态在哪里？下一步由谁决定？有没有外部事实？错误路径能不能回退？

## 一、先看一张统一的地图

```text
Chain-of-Thought：一条线
问题 → 步骤 1 → 步骤 2 → 步骤 3 → 答案

ReAct：一条会观察的线
问题 → 思考 → 行动 → 外部观察 → 思考 → 答案

Tree-of-Thought：多条可比较的线
问题 → 状态
      ├─ 路径 A → A1 / A2
      ├─ 路径 B → B1 / B2
      └─ 路径 C → C1
                 ↓
              评估、剪枝、选择
```

CoT 主要解决“如何把复杂答案拆成连续步骤”；ReAct 解决“如何让步骤与外部工具和环境反馈交替发生”；ToT 解决“如果第一步有多个可能方向，如何保留、评估并搜索多条思路”。

它们不是互相排斥的标签。一个 ReAct Agent 内部可以使用 CoT 风格的计划；一个 ToT 节点也可以调用工具获得观察；一个生产系统还可以用代码工作流包住其中一段模型推理。真正的区别在于状态管理和搜索控制。

## 二、Chain-of-Thought：先把一条路走清楚

CoT 的基本想法是让模型生成中间推理步骤，而不是直接给结论。最简单的提示可能是“请逐步分析”，更稳定的做法是定义步骤格式、示例和最终答案字段。

```text
问题：仓库有 12 箱，每箱 8 件，发出 15 件后还剩多少？

步骤 1：计算总件数：12 × 8 = 96
步骤 2：减去发出数量：96 - 15 = 81
结论：还剩 81 件
```

它的最大优点是简单。一次模型调用就可以完成，延迟、成本和调试门槛都比较低。对于数学、逻辑、代码解释和内容规划等任务，清晰的中间结构往往已经能带来明显改善。

但 CoT 仍然是一条单路径生成。第一步错了，后面很可能沿着错误继续；它没有外部事实来源，也没有天然的回退机制。更长的文字还不等于更正确，有时只是把一个错误解释得更自信。

工程上不要把 CoT 文字直接当作事实或审计记录。更好的做法是要求结构化中间结果，并让代码验证：

```ts
type StepResult = {
  operation: string
  inputs: number[]
  result: number
  verified: boolean
}

function verifyStep(step: StepResult) {
  return Number.isFinite(step.result) && step.verified
}
```

CoT 适合单路径、无外部依赖、可以接受偶尔重试的任务。如果步骤稳定且能用代码写死，就不要为了“像推理”而把它交给模型。

## 三、ReAct：让思考遇到真实世界

ReAct 把推理和行动交替起来。模型先判断需要什么信息，再调用搜索、数据库或计算工具，获得观察结果后重新决策。

```text
Thought：我需要确认这个 API 的最新限制。
Action：search_docs({ query: "rate limit" })
Observation：文档显示每分钟最多 60 次请求。
Thought：还需要结合当前租户的配额。
Action：get_quota({ tenantId: "..." })
Observation：当前租户剩余 12 次。
Final：本次任务最多还可以调用 12 次。
```

ReAct 的关键不是把“Thought”这个词写进 Prompt，而是观察结果真的会影响下一步。工具返回空结果时，模型应该换查询或请求用户澄清；工具超时时，系统应该决定重试、降级或停止。没有真实反馈的“行动”，只是另一段文本生成。

一个最小状态可以这样写：

```ts
type ReactState = {
  goal: string
  observations: Array<{ tool: string; result: unknown }>
  actions: Array<{ tool: string; input: unknown; status: string }>
  steps: number
  maxSteps: number
}

async function runReact(state: ReactState) {
  while (state.steps < state.maxSteps) {
    const decision = await model.decide(state)
    state.steps += 1

    if (decision.kind === 'final') return validate(decision, state)
    if (!allowedTools.has(decision.tool)) throw new Error('工具不在白名单')

    const result = await executeTool(decision.tool, decision.input)
    state.actions.push({
      tool: decision.tool,
      input: decision.input,
      status: result.ok ? 'succeeded' : 'failed',
    })
    state.observations.push({ tool: decision.tool, result })
  }

  return { status: 'needs_review', reason: '超过最大步骤' }
}
```

ReAct 适合信息会变化、需要工具、步骤不能完全预先写死的任务。代价是每一次行动都会增加延迟和失败点，工具权限、重试、幂等和停止条件都必须进入设计。

## 四、Tree-of-Thought：为什么要保留多个方向

CoT 和 ReAct 的基本形态仍然是一条路径。可是有些问题第一步就有多个合理选择，走错之后很难回来。例如拼图、组合规划、复杂代码重构和需要反事实比较的方案设计。ToT 的思路是把中间思考表示成节点，保留多个候选状态，再通过评估函数选择扩展、剪枝或回退。

```ts
type ThoughtNode = {
  id: string
  parentId?: string
  state: string
  score?: number
  status: 'open' | 'expanded' | 'pruned' | 'solved'
}

async function searchThoughtTree(root: ThoughtNode, maxNodes: number) {
  const open: ThoughtNode[] = [root]
  const visited = new Set<string>()

  while (open.length > 0 && visited.size < maxNodes) {
    const node = selectBestOpenNode(open)
    if (!node) break
    visited.add(node.id)

    const evaluation = await evaluateState(node.state)
    if (evaluation.solved) return node
    if (evaluation.score < 0) {
      node.status = 'pruned'
      continue
    }

    const children = await expandThought(node)
    open.push(...children)
    node.status = 'expanded'
  }

  return null
}
```

ToT 真正难的地方是评估函数。它要判断一个中间状态是否值得继续，而不是只看文字是否流畅。对于数学和游戏任务，可以有明确规则；对于开放式设计，评估往往不稳定，搜索出来的只是模型偏好的方案。

搜索树还会迅速膨胀。深度为 `d`、每个节点分支数为 `b` 时，最坏节点数量接近 `b^d`。所以必须限制宽度、深度、总 Token 和时间，并使用缓存、去重和剪枝。没有预算的 ToT，不是高级推理，而是一台成本不可控的文本生成器。

## 五、三种方法的核心差异

| 维度 | Chain-of-Thought | ReAct | Tree-of-Thought |
|---|---|---|---|
| 路径形态 | 单一路径 | 单一路径加观察 | 多路径搜索 |
| 外部世界 | 通常不依赖 | 依赖工具或环境 | 可依赖，也可不依赖 |
| 状态 | 文本步骤 | 动作与观察 | 节点、边与评估分数 |
| 主要收益 | 拆解复杂问题 | 根据事实调整行动 | 避免过早锁定错误路径 |
| 主要成本 | 多一些输出 Token | 工具延迟和失败 | 搜索空间与评估成本 |
| 适合任务 | 数学、解释、规划草稿 | 检索、操作、调查 | 组合搜索、方案比较、复杂规划 |
| 主要风险 | 错误一路传递 | 工具误用或循环 | 分支爆炸与错误评估 |

这张表不能代替实际实验，但能帮助你先排除明显不合适的方案。不要因为任务名字里有“Agent”，就默认需要 ToT；也不要因为使用了搜索工具，就以为已经实现了完整 ReAct。

## 六、选择方法的四个问题

### 问题一：任务是否需要外部事实

如果答案只依赖输入内容和模型已有能力，先试 CoT。需要最新文档、数据库或环境状态，就考虑 ReAct。ToT 也能使用工具，但工具只是节点的一部分，不是它存在的主要理由。

### 问题二：第一步选错后能否继续修正

如果错误可以通过最终验证发现，再重试一次也不贵，CoT 足够。若每一步都要根据外部观察更新，使用 ReAct；若存在多个相互竞争的计划，且回退比多次采样更有价值，再考虑 ToT。

### 问题三：有没有可靠的评估函数

没有评估函数，就无法判断哪条思路更好。数学答案、代码测试和约束满足容易评估；开放式战略和创意设计难很多。评估不可靠时，树越大，错误选择越多，不如使用少量候选加人工或裁判复核。

### 问题四：预算和延迟是否允许

先计算最坏情况：模型调用次数、输入输出 Token、工具调用、验证器运行时间和并发占用。如果任务价值无法覆盖成本，就不要追求理论上的最优路径。用户通常更愿意得到一个及时、诚实、可继续的答案，而不是等待很久的一篇过度推理。

## 七、不要把三种方法当成 Prompt 技巧

“请一步一步思考”只是行为提示；“先思考再行动”也不能自动授予工具权限；“生成三条思路并选择最好”更不等于实现了搜索。真正的工程实现需要状态、执行器、验证器和预算控制。

例如 ReAct 的工具调用必须由服务端校验，ToT 的节点必须可持久化和去重，CoT 的中间结果应该在适合的地方被程序重新计算。模型输出的是候选计划，系统状态才是事实。

此外，用户界面也不一定要展示完整思维链。对用户提供简短的处理进度、工具来源和最终依据通常已经足够；内部保留结构化轨迹，方便调试和评测。透明不等于把所有内部生成文本原样倾倒给用户。

## 八、用实验而不是感觉做选择

准备一组包含简单、复杂、无答案和对抗样本的任务，分别使用 CoT、ReAct 和 ToT，控制模型版本、提示词和最大预算。比较的不只是准确率，还包括：

- 单任务平均和 P95 延迟。
- 输入输出 Token 与总成本。
- 工具调用次数、重复率和失败率。
- 找到正确答案前的平均步骤数。
- 没有足够信息时的拒答或追问质量。
- 结果能否通过确定性验证。

```ts
type MethodReport = {
  method: 'cot' | 'react' | 'tot'
  successRate: number
  p95LatencyMs: number
  avgTokens: number
  toolErrorRate: number
  verificationRate: number
}
```

很多时候实验结果会很朴素：CoT 在大多数简单任务上性价比最高，ReAct 在需要实时信息的任务上明显胜出，ToT 只在少数高价值、可评估、确实需要回溯的问题上值得使用。这不是方法有高低之分，而是复杂度要和问题匹配。

## 九、我的总结：多走几步不等于走得更对

Chain-of-Thought 让模型把一条思路展开，ReAct 让思路能够和外部世界交换信息，Tree-of-Thought 让系统保留多条思路并进行搜索。三者的共同目标是减少一次性猜答案的压力，但它们付出的代价不同。

我现在的选型原则很简单：能用代码写死的步骤，不交给模型；单路径推理足够的任务，先用 CoT；需要事实和工具反馈的任务，用 ReAct；只有当多个候选路径的比较有明确价值、评估函数可靠、预算也承担得起时，才使用 ToT。

真正成熟的推理系统，不会因为画出了更复杂的流程图就更聪明。它知道什么时候应该多想，什么时候应该去查资料，什么时候应该保留备用方案，也知道什么时候继续计算已经没有收益。把方法选对，把状态记清，把结果验证好，模型才是在解决问题，而不是在用更多文字表演解决问题。
