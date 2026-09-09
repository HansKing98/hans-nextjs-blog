---
title: MoE 的路由、负载均衡与训练难点
date: 2024-06-09 10:00:00
tags:
  - AI
  - LLM
  - MoE
  - 稀疏专家
  - 深度学习
summary: MoE 通过路由器把不同 Token 分给少量专家，在保持较大参数容量的同时控制每次计算量。本文解释 Top-k 路由、容量因子、负载均衡、Token 丢弃与并行通信难点。
categories:
  - 人工智能
  - 原理教程
---

{/*
 * [INPUT]: 依赖 Transformer、稀疏专家模型、Softmax 路由、Top-k gating、并行训练与通信概念
 * [OUTPUT]: 对外提供 MoE 路由机制、负载均衡、容量控制、训练稳定性与推理部署难点
 * [POS]: 大模型工程系列的 MoE 深入文章，承接 Mixtral 与 MoE 入门，服务后续 LoRA 微调主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# MoE 的路由、负载均衡与训练难点

MoE，也就是 Mixture of Experts，最吸引人的一句介绍通常是：“模型参数很多，但每个 Token 只激活少数专家。”这句话听起来像找到了同时拥有大容量和低计算量的办法。

真正研究过 MoE 的人，通常会补上后半句：前提是路由器能把 Token 合理分配，专家之间的负载不能失衡，跨设备通信不能把省下来的计算吃掉，训练还要在稀疏选择和梯度不连续之间保持稳定。

我第一次看 MoE 的训练日志时，最先注意到的是总 loss 下降，后来才发现有一个专家几乎吃掉了所有 Token，其他专家像空置的机房。模型表面上还在学习，实际上路由已经形成了“热门专家”和“冷门专家”的恶性循环。MoE 的难点从来不只是把多个前馈层并排放进去，而是如何让一个离散的调度系统和连续的梯度训练共同工作。

## 一、普通 Transformer 为什么需要专家

标准 Transformer 的每一层通常有一个共享的前馈网络（FFN）。每个 Token 都经过相同的参数：

```text
Token 1 ─┐
Token 2 ─┼→ 同一个 FFN → 输出
Token 3 ─┘
```

这样做简单、稳定，但模型容量和每次计算量一起增长。想增加参数，就要让每个 Token 都经过更大的矩阵乘法。

MoE 把一个 FFN 替换成多个专家：

```text
Token 1 → Expert 2
Token 2 → Expert 5
Token 3 → Expert 2 + Expert 7
```

每个专家通常有自己的 FFN 参数，路由器根据 Token 表示决定激活哪个或哪几个专家。于是总参数量可以很大，但单个 Token 只承担部分专家的计算。

```text
总参数容量：所有专家参数之和
每 Token 计算量：被选中专家的参数量
```

这是一种“容量”和“激活计算”分离的设计。它对训练和推理都很有吸引力，但也把问题从一个大矩阵乘法变成了动态调度和通信问题。

## 二、路由器在做什么

路由器通常是一个线性层，为每个 Token 产生专家分数，再通过 Softmax 得到权重：

```text
g(x) = softmax(W_router x)
```

如果有 `E` 个专家，`g(x)` 就是长度为 `E` 的概率向量。Top-1 路由选择一个专家，Top-2 路由选择两个专家并进行加权组合。

```ts
type RoutingDecision = {
  tokenIndex: number
  expertIds: number[]
  weights: number[]
}

function topKRoute(scores: number[], k: number): RoutingDecision {
  const selected = scores
    .map((score, expertId) => ({ score, expertId }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)

  const total = selected.reduce((sum, item) => sum + Math.exp(item.score), 0)
  return {
    tokenIndex: -1,
    expertIds: selected.map((item) => item.expertId),
    weights: selected.map((item) => Math.exp(item.score) / total),
  }
}
```

实际实现会在 batch 维度上进行高效 dispatch，而不是逐 Token 排序。代码这里只是帮助理解：路由器不生成内容，它决定哪些参数参与当前 Token 的计算。

## 三、Top-k 为什么既有效又麻烦

Top-k 路由让每个 Token 只激活少数专家，降低了计算量；但 `arg top-k` 是离散选择，路由边界附近的专家变化可能让训练信号不稳定。一个 Token 被送给哪个专家，不能像普通矩阵乘法那样平滑地对所有路径传播。

训练中通常依靠路由概率、噪声、辅助损失和近似梯度来缓解。Top-1 更省计算和通信，Top-2 往往给模型更多表达能力和路由冗余，但代价是每个 Token 要处理更多专家。

```text
Top-1：更快、更省通信，路由错误影响更直接
Top-2：容量组合更灵活，计算和通信成本更高
```

没有哪个 `k` 永远最好。要结合任务、硬件、专家数和质量评测。把 Top-k 调大，不等于模型一定更聪明；如果路由本身不稳定，只会让更多错误专家参与计算。

## 四、负载均衡是 MoE 的核心难题

如果所有 Token 都被路由到少数热门专家，就会出现：热门专家超载、冷门专家没有训练信号、设备之间等待、吞吐下降。更糟糕的是，热门专家获得更多更新后，变得更容易被选中，形成正反馈。

```text
热门专家 → 获得更多 Token → 训练更充分 → 分数更高 → 更热门
冷门专家 → 几乎没有 Token → 学不到东西 → 分数更低 → 更冷门
```

因此训练通常会加入负载均衡辅助损失，让平均路由概率和实际 Token 分配尽量均匀：

```text
L_aux ∝ E × Σ f_i × P_i
```

其中 `f_i` 是分配给专家 `i` 的 Token 比例，`P_i` 是路由器对专家 `i` 的平均概率，`E` 是专家数量。直觉是：实际接收很多 Token、平均概率也很高的专家会受到惩罚。

```ts
type LoadStats = {
  tokenFraction: number[]
  probabilityMean: number[]
  droppedTokens: number
}

function auxiliaryLoadLoss(stats: LoadStats) {
  const expertCount = stats.tokenFraction.length
  return expertCount * stats.tokenFraction.reduce(
    (sum, fraction, index) =>
      sum + fraction * stats.probabilityMean[index],
    0,
  )
}
```

辅助损失的权重不能太大。过强的均衡会迫使路由器把 Token 分给不合适的专家，主任务质量下降；过弱则负载倾斜。训练中要同时观察任务 loss、辅助 loss、专家利用率和质量，而不是只把专家使用率调成平均。

## 五、容量因子和 Token dropping

每个专家在一个 batch 中能处理的 Token 数通常有上限，这个上限由容量因子决定：

```text
expert_capacity
≈ capacity_factor × tokens_per_batch / expert_count
```

如果路由到某个专家的 Token 超过容量，系统必须做决定：丢弃多余 Token、发送到备用专家、使用 residual，或者增加通信和等待。

```text
Token
  ├─ 进入专家容量 → 正常计算
  └─ 超出容量     → dropping / backup / residual
```

Token dropping 不是简单的性能细节。被丢弃的 Token 没有获得完整专家计算，信息可能损失；容量因子太大又会浪费显存，因为每个专家要预留更多空间。

```ts
type DispatchPlan = {
  capacity: number
  accepted: number[]
  dropped: number[]
  overflowPolicy: 'drop' | 'residual' | 'reroute'
}

function dispatchWithCapacity(
  expertIds: number[],
  capacity: number,
): DispatchPlan[] {
  const queues = new Map<number, number[]>()
  for (const [tokenIndex, expertId] of expertIds.entries()) {
    const queue = queues.get(expertId) ?? []
    queue.push(tokenIndex)
    queues.set(expertId, queue)
  }

  return [...queues.entries()].map(([expertId, queue]) => ({
    capacity,
    accepted: queue.slice(0, capacity),
    dropped: queue.slice(capacity),
    overflowPolicy: 'residual',
  }))
}
```

真实系统会用张量操作和 all-to-all 通信完成 dispatch，重点仍然是同一个：动态路由必须有容量边界，否则一个热点专家能拖慢整个 batch。

## 六、专家为什么会学出不同能力

理想情况下，不同专家会在训练中形成一定的功能分化：某些专家更常处理代码、数字或特定语言，另一些专家偏向通用语义。但不要把这种分化理解成事先写好的“数学专家”和“英语专家”。它是数据、路由和梯度共同作用的结果。

专家是否真的分工，可以通过统计观察：不同数据类型的路由分布、专家输出相似度、激活频率和替换实验。只看专家名字或几条样本就下结论，容易把随机波动当成语义角色。

专家过度专门化也可能带来问题。某种语言或领域数据太少，相关专家训练不足；新任务无法找到合适路径，泛化下降。负载均衡应该和质量、跨领域覆盖一起观察。

## 七、训练时的通信可能比计算更贵

在单卡上，MoE 的路由逻辑已经比普通 FFN 复杂；在多卡或多机训练中，Token 还要根据专家所在设备进行 all-to-all 通信：

```text
设备 0 的 Token ─┐
设备 1 的 Token ─┼→ 按专家所在设备重排 → 专家计算 → 发回原设备
设备 2 的 Token ─┘
```

如果专家分布跨越很多设备，通信量、同步等待和网络拥塞会抵消稀疏计算收益。工程上要关注专家并行、数据并行、张量并行的组合，尽量让路由和设备布局匹配。

```ts
type ParallelPlan = {
  dataParallel: number
  tensorParallel: number
  expertParallel: number
  allToAllBytesPerStep: number
  communicationMs: number
}
```

实测吞吐不能只看 FLOPs。还要测 Token dispatch、all-to-all、专家计算、聚合和同步的耗时。一个理论上激活参数很少的模型，如果每步都在网络上等待，实际服务可能比密集模型更慢。

## 八、训练稳定性需要多种信号共同判断

MoE 训练中可以同时出现主 loss 下降和路由崩溃。建议记录：

- 每个专家的 Token 数和概率均值。
- 辅助负载损失及其权重。
- Token dropping 比例和每个 batch 的最大负载。
- 专家输出和路由熵。
- 通信耗时、显存峰值和有效吞吐。
- 按语言、任务和数据来源分组的验证质量。

```text
主任务变好 + 负载倾斜严重 → 可能很快吞吐崩溃
负载很均匀 + 质量下降   → 均衡约束可能过强
训练稳定 + dropping 上升 → 容量或批次设置不合适
loss 抖动 + 路由熵骤降   → 路由器可能过早塌缩
```

固定抽样不同专家处理的 Token，观察它们是否产生合理结果。指标是仪表盘，专家样本是现场。只盯总 loss，往往等到训练结束才发现大量 Token 被丢弃。

## 九、推理部署和训练不是同一笔账

训练可以接受较复杂的通信和动态负载，在线推理则更关心 P95 延迟、并发和显存峰值。单请求 Token 很少时，专家 dispatch 的固定开销可能比计算本身更明显；批量足够大时，稀疏计算才更容易体现优势。

部署时要决定专家是否跨设备、是否预加载全部专家、是否对热点专家复制副本，以及请求如何批处理。复制热点专家可以减少通信和等待，但会增加显存；只加载部分专家可以节省空间，却可能在路由到冷门专家时产生加载延迟。

```text
在线请求
  ↓
批处理 / 路由
  ↓
专家设备调度
  ↓
计算与结果聚合
  ↓
输出 Token
```

模型总参数很大，不代表部署显存可以只按激活参数估算。未激活专家的权重通常仍需存储或可快速访问。模型选型时要看真实内存、通信、吞吐和延迟，而不是只看“每 Token 激活多少参数”。

## 十、如何判断 MoE 是否值得使用

先用任务和硬件做判断。MoE 适合希望扩大模型容量、又有足够多卡和高吞吐训练基础设施的场景；如果部署环境只有单张小显卡，动态专家带来的调度和权重内存可能抵消计算优势。

实验时至少比较密集模型和 MoE 模型的：质量、训练 Token 成本、激活 FLOPs、显存、通信占比、P50/P95 延迟、吞吐和 Token dropping。不要只用参数量比较。

```ts
type MoeBenchmark = {
  totalParameters: number
  activeParameters: number
  validationScore: number
  tokensPerSecond: number
  p95LatencyMs: number
  communicationRatio: number
  droppedTokenRate: number
}
```

如果 MoE 质量提升很小，却需要复杂的多机通信和运维，可能不值得；如果它显著提高容量利用率，且硬件能承受专家并行，才有进一步投入的理由。

## 十一、我的总结：MoE 是模型里的调度系统

MoE 的核心并不只是“多个专家”。真正重要的是一个路由器如何把 Token 分配给专家，一个容量系统如何处理溢出，一组辅助目标如何防止负载塌缩，以及一套并行通信方案如何让稀疏计算在真实硬件上兑现。

我现在看 MoE 论文或实现，会同时问三个问题：模型把谁送给了哪个专家？专家负载是否健康？路由和通信的实际成本是多少？只看总参数和激活参数，很容易得到一个漂亮但不完整的结论。

MoE 让“模型容量”和“单次计算量”有机会分离，这是非常重要的方向；但分离之后，系统必须承担动态调度的复杂度。热门专家会过载，冷门专家会失去训练，Token 可能被丢弃，设备之间需要搬运数据，在线延迟还会受到小批量请求的影响。

理解这些难点以后，你会发现 MoE 和操作系统、集群调度有相似的气质：资源很多不等于任务完成得快，关键在于调度是否公平、队列是否稳定、故障是否可恢复。把路由、容量、通信和质量一起测，稀疏专家才不是一个省参数的口号，而是一种有真实工程收益、也需要认真付出工程成本的模型架构。
