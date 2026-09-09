---
title: Continuous Batching 与服务并发
date: 2025-05-13 10:00:00
tags:
  - AI
  - LLM
  - Continuous Batching
  - GPU
  - 并发优化
summary: 大模型服务的请求长度和生成速度各不相同，Continuous Batching 通过动态调度让 GPU 持续工作，但也带来队列、公平性、KV Cache 和尾延迟管理问题。
categories:
  - 人工智能
  - 推理优化
---

{/*
 * [INPUT]: 依赖 LLM 自回归推理、Batch 调度、KV Cache、GPU 利用率、队列与服务 SLO 概念
 * [OUTPUT]: 对外提供 Continuous Batching 的工作原理、调度策略、并发控制与性能评测方法
 * [POS]: 大模型工程系列的推理服务文章，承接 KV Cache 与推理基础设施，服务后续 Speculative Decoding 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Continuous Batching 与服务并发

普通 Web 服务的并发模型很直观：请求进来，分配一个线程或协程，处理完成后返回。大模型服务如果照着这个思路做，GPU 很快会出现一种尴尬状态：有的请求正在生成，有的请求刚完成，有的请求才刚把 Prompt 送进来，批次互相等待，GPU 不是被撑爆，就是大量时间在空转。

我第一次做模型服务压测时，单请求速度看起来不错，并发一上来却完全变了。为了等一个长回答，短请求被卡在同一批里；一个用户的超长上下文拖慢了其他用户；平均吞吐提高了，P95 延迟却变得无法接受。

Continuous Batching 解决的不是“模型一次能处理更多请求”这么简单，而是让正在生成的请求可以动态加入和退出批次。GPU 每一轮都重新组织当前活跃的序列，尽量让计算资源持续有活干，同时控制用户等待。

## 一、静态 Batch 为什么浪费

静态 Batch 通常要等一批请求都准备好，再一起计算：

```text
请求 A：生成 20 个 Token，先完成
请求 B：生成 200 个 Token，还在继续
请求 C：刚刚到达，只能等待
```

如果批次必须等 B 结束，A 完成后的计算位置就浪费了，C 也不能及时加入。不同请求的输入长度、输出长度和到达时间天然不一致，静态 Batch 很难同时照顾吞吐和延迟。

## 二、Continuous Batching 如何动态加入请求

连续批处理把每一轮生成当作调度机会：

```text
第 1 轮：A、B
第 2 轮：A、B、C（C 加入）
第 3 轮：B、C（A 完成并退出）
第 4 轮：B、C、D（D 加入）
```

每一轮只为仍然活跃的请求计算下一个 Token，完成的请求释放 Cache，新请求在资源允许时加入。这样 GPU 不需要等待整批请求拥有相同长度。

```ts
type Sequence = {
  requestId: string
  inputTokens: number
  generatedTokens: number
  maxNewTokens: number
  kvBlocks: number[]
  priority: number
  arrivedAt: number
}

type SchedulerState = {
  running: Sequence[]
  waiting: Sequence[]
  completed: Sequence[]
}
```

调度器每轮根据可用显存、优先级、等待时间和预计 Token 数选择下一批。它不是简单地把所有等待请求塞进去，而要给 KV Cache 和未来的生成留出空间。

## 三、Prefill 和 Decode 是两种不同工作

大模型推理通常包含两个阶段：

- **Prefill**：一次处理用户输入，计算初始 KV Cache，计算量大但并行度高。
- **Decode**：每轮生成一个或少量 Token，单步计算小，但需要反复读取 Cache。

把超长 Prompt 的 Prefill 和多个短请求的 Decode 混在一起，可能导致短请求首 Token 延迟很高；只关注 Decode 吞吐，又可能让新请求一直进不了系统。

```text
新请求到达 → Prefill 队列
已生成请求 → Decode 队列
             ↓
          统一调度 GPU
```

调度器要在两者之间平衡。可以限制单轮 Prefill 的 Token 数，避免一个超长请求独占 GPU；也可以为交互请求保留部分预算，防止后台批任务挤掉实时对话。

## 四、KV Cache 是并发的硬约束

每个活跃序列都要占用 KV Cache。并发越高、上下文越长、生成越久，Cache 越大。一个请求即使没有消耗很多计算，也可能因为占用大量 Cache 让新请求无法进入。

```ts
type CacheBudget = {
  totalBlocks: number
  freeBlocks: number
  reservedBlocks: number
  blockSizeTokens: number
}

function canAdmit(sequence: Sequence, budget: CacheBudget) {
  return sequence.kvBlocks.length + budget.reservedBlocks <= budget.freeBlocks
}
```

生产系统要设置上下文和输出上限，支持 Cache 分块、回收和必要时的抢占。抢占一个低优先级请求意味着保存或丢弃它的状态，恢复时会增加延迟和成本，不能把它当成免费的操作。

## 五、调度目标不只有吞吐

最简单的调度目标是让 GPU 利用率最高，但如果队列无限增长，用户体验会很差。至少同时关注：

- 吞吐：每秒完成多少 Token 或请求；
- 首 Token 延迟：用户多久听到或看到第一部分结果；
- 完整请求延迟；
- P95/P99 尾延迟；
- 队列等待时间；
- 活跃序列数和 Cache 使用率；
- 不同优先级、租户和任务的公平性。

```text
目标函数
≈ 吞吐收益
  - 延迟惩罚
  - 超时惩罚
  - 抢占与重排成本
```

后台摘要可以等待更久，在线聊天则需要尽快反馈；付费等级可以有不同权重，但不能让普通请求永远饿死。调度策略必须和产品 SLO 一起设计。

## 六、队列和背压要尽早生效

当到达速度超过处理能力时，队列会不断增长。没有背压，最终表现通常是所有请求一起超时，重试又制造更多请求。

可以在入口设置：

- 单租户并发上限；
- 全局活跃序列上限；
- 最大输入和输出 Token；
- 队列最大长度；
- 请求过期时间；
- 后台任务的暂停和恢复。

```ts
if (queue.length >= MAX_QUEUE_SIZE) {
  throw new CapacityError('当前请求较多，请稍后重试')
}
```

拒绝一个还没开始处理的请求，比让它排队 5 分钟后超时更诚实。客户端也要理解 429 或容量错误，使用退避而不是立即疯狂重试。

## 七、不同请求不要互相拖累

请求可以按场景分池：实时对话、批量任务、Embedding、长上下文和高优先级客户分别设置资源预算。完全隔离会降低利用率，完全混合则容易互相影响。

一个比较现实的方案是共享 GPU，但按队列分配时间和 Cache 预算：实时请求保留最小响应能力，批任务在空闲时填充，长请求设置最大占用。监控中要能看到每个队列的等待、吞吐和失败，而不是只有一条全局曲线。

## 八、流式输出不能掩盖调度问题

连续批处理通常配合流式返回。用户先收到部分 Token，后续继续生成。流式连接长时间占用资源，也可能遇到客户端断开、代理超时和取消请求。

客户端断开后要及时取消生成并释放 KV Cache，否则用户看不见结果，GPU 却继续为它工作。取消应该能传播到调度器、模型运行时和下游日志：

```ts
async function cancelRequest(requestId: string) {
  scheduler.remove(requestId)
  await runtime.abort(requestId)
  cache.release(requestId)
  metrics.increment('generation_cancelled')
}
```

## 九、压测要模拟真实长度分布

只用固定长度、固定并发的压测没有太大意义。真实流量通常混合短问题、长 Prompt、不同输出长度和突发到达。测试至少包含：

- 单请求冷启动和热启动；
- 短输入短输出；
- 长输入短输出；
- 短输入长输出；
- 混合长度并发；
- 突发流量和持续流量；
- 客户端中途取消；
- 一部分请求超过上下文或配额。

记录 P50、P95、P99、队列等待、Cache 使用率、GPU 利用率和单位成功请求成本。平均吞吐提高而 P99 爆炸，不能算优化成功。

## 总结：并发优化是在安排等待

Continuous Batching 给我的最大启发是，GPU 优化不只是让单个请求跑得更快，还要决定多个不一样的请求如何共同前进。Prefill 和 Decode 要协调，完成的序列要及时退出，新序列要在 Cache 允许时加入，队列过载时要背压，实时任务和后台任务要有公平而明确的资源边界。

它的价值来自动态调度，但复杂度也来自动态调度。没有 Cache 预算、队列上限、取消传播和尾延迟监控，连续批处理可能只是把问题从“GPU 空闲”换成“用户排队”。

我现在看一个模型服务的吞吐数字，会继续问：这个吞吐是在什么长度分布下得到的？首 Token 和 P99 怎样？客户端取消后资源释放了吗？一个租户突发流量时别人还能用吗？

真正成熟的并发系统，不是让所有请求都尽可能挤进来，而是让每个请求都得到可预期的处理机会。让 GPU 持续工作很重要，让用户知道自己要等多久、为什么等待、什么时候会被拒绝，同样重要。这才是 Continuous Batching 从一个推理技巧变成生产基础设施的地方。
