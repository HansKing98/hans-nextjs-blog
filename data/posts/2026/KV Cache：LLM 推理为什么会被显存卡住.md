---
title: KV Cache：LLM 推理为什么会被显存卡住
date: 2025-09-28 10:00:00
tags:
  - AI
  - LLM
  - KV Cache
  - GPU
  - 推理优化
summary: KV Cache 避免自回归生成重复计算历史 Token，但它会随着上下文和并发增长，成为显存与推理吞吐的关键约束。
categories:
  - 人工智能
  - 推理优化
---

{/*
 * [INPUT]: 依赖 Transformer 注意力、自回归生成、显存管理、Batch 调度与推理服务概念
 * [OUTPUT]: 对外提供 KV Cache 的工作原理、显存估算、PagedAttention、复用边界与优化方法
 * [POS]: 大模型工程系列的推理基础设施文章，承接 Continuous Batching，服务后续 Speculative Decoding 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# KV Cache：LLM 推理为什么会被显存卡住

大模型生成文字时，有一件事很浪费：为了生成最后一个 Token，模型似乎要重新看一遍前面所有 Token。如果一句话已经写了 2000 个字，下一步还把前面每个字的 Key 和 Value 重新算一遍，生成速度自然很难快起来。

KV Cache 就是为了解决这件事。它把历史 Token 已经算过的 Key 和 Value 保存下来，后面只计算新 Token，再把新的结果接到缓存后面。这个优化非常有效，但也带来一个反直觉的问题：模型不一定先被算力卡住，可能先被显存卡住。

我第一次压测长上下文服务时，看到 GPU 利用率并不算高，却无法继续增加并发。原因不是模型权重放不下，而是每个请求的 KV Cache 都在慢慢占内存。请求越长、并发越高，缓存越大；一个用户的长对话，可能挤掉很多短请求。

## 一、先理解自回归生成

Transformer 的注意力会根据 Query、Key、Value 计算当前 Token 和历史 Token 的关系。生成第一个 Token 后，模型把它加入上下文，再预测下一个：

```text
上下文 [A] → 生成 B
上下文 [A, B] → 生成 C
上下文 [A, B, C] → 生成 D
```

没有缓存时，每一步都会重新计算历史 Token 的 K 和 V。KV Cache 保存的是每一层注意力模块对应的历史 Key 和 Value：

```ts
type KVCache = {
  layers: Array<{
    key: Tensor
    value: Tensor
  }>
  sequenceLength: number
}
```

注意，Cache 不是保存模型的最终答案，也不是把完整隐藏状态永久存下来。它是当前上下文对应的中间计算结果，必须和模型权重、Tokenizer、位置编码和序列顺序匹配。

## 二、KV Cache 为什么会占很多显存

可以用一个近似公式估算：

```text
KV Cache 内存
≈ 层数 × 2（K 和 V）× KV 头数 × Head Dimension
  × 序列长度 × Batch × 每元素字节数
```

如果模型层数多、上下文长、并发高，Cache 很快就会变成主要内存。使用 FP16 时每个元素 2 字节，模型权重即使做了 INT4 量化，KV Cache 仍可能使用更高精度。

```ts
function estimateKVBytes(input: {
  layers: number
  kvHeads: number
  headDim: number
  tokens: number
  batch: number
  bytesPerElement: number
}) {
  return (
    input.layers *
    2 *
    input.kvHeads *
    input.headDim *
    input.tokens *
    input.batch *
    input.bytesPerElement
  )
}
```

这只是估算，真实运行还要加对齐、元数据、临时张量和调度开销。但它能帮助我们建立直觉：上下文长度和并发都直接增加 Cache，不能只看模型文件大小。

## 三、Prefill 和 Decode 对 Cache 的使用不同

Prefill 阶段一次处理输入 Prompt，生成全部历史 K/V；Decode 阶段每次只处理一个新 Token，并读取已有 Cache。

```text
长 Prompt → Prefill：计算量大，建立 Cache
逐 Token 生成 → Decode：计算量小，频繁读取 Cache
```

长文档问答可能 Prefill 很慢，长回答和高并发则可能被 Decode 的 Cache 读取拖慢。性能优化要分开观察两个阶段，不要用一个平均延迟掩盖瓶颈。

## 四、为什么连续批处理需要更聪明的 Cache

不同请求长度不同，传统的连续内存分配会产生碎片：

```text
请求 A：██████      完成后留下空洞
请求 B：██████████
请求 C：██
```

如果每个序列都要求一块连续的大内存，新请求可能因为找不到足够大的连续空间而无法进入，即使总空闲显存还不少。PagedAttention 的思路是把 Cache 分成固定大小的块，逻辑上的连续序列映射到物理上的多个块。

```ts
type KVBlock = {
  blockId: number
  tokens: number
  ownerSequenceId: string
  refCount: number
}
```

这样可以按块分配和回收，减少碎片，也更适合 Continuous Batching。请求完成时释放自己的块，新请求可以复用空闲块。

## 五、前缀缓存可以复用，但必须确认边界

多个请求如果共享相同的系统 Prompt、工具说明或文档前缀，可以复用前缀对应的 KV Cache：

```text
公共前缀 + 用户问题 A
公共前缀 + 用户问题 B
公共前缀 + 用户问题 C
```

这能减少重复 Prefill，但缓存键必须包含模型版本、Tokenizer、Prompt 版本、位置参数、租户和权限范围。不同租户的私有上下文不能因为前缀文本碰巧相同就共享；权限边界比缓存命中率更重要。

```ts
const prefixKey = hash({
  modelVersion,
  tokenizerVersion,
  promptVersion,
  tenantId,
  permissionVersion,
  prefixText,
})
```

缓存内容本身也属于敏感数据。要有过期、淘汰和删除策略，不能把用户上传的文档永久藏在 GPU 或磁盘里。

## 六、Cache 量化和压缩要用质量换算

KV Cache 可以尝试低精度存储、滑动窗口和上下文摘要来节省显存。代价是注意力读取的数值精度可能下降，长对话质量和模型稳定性可能受影响。

```text
更低精度 Cache
  → 更少显存
  → 更高并发
  → 可能增加数值误差
```

不要只测 Token/s。应该同时评测长上下文问答、引用准确率、结构化输出和高风险边界。某个压缩方案让吞吐提高 30%，但关键信息召回下降 8%，对 RAG 产品可能不是成功。

## 七、Cache 管理要考虑取消、抢占和恢复

用户关闭页面以后，生成应该尽快取消并释放 Cache；低优先级后台任务被抢占时，要决定是丢弃缓存、保存到 CPU，还是直接终止。每种选择都有成本：保存和恢复会占用带宽，重新 Prefill 会增加延迟。

```ts
async function releaseSequence(sequenceId: string) {
  scheduler.remove(sequenceId)
  const blocks = cache.blocksFor(sequenceId)
  cache.release(blocks)
  metrics.observe('kv_blocks_released', blocks.length)
}
```

释放逻辑必须覆盖正常完成、客户端断开、超时、错误和服务重启。最难排查的内存泄漏，往往出现在“用户已经看不到结果，但后台还保留着请求”的路径上。

## 八、上下文窗口不是无限记忆

模型支持 128K 上下文，不代表一次放入 128K 就是好主意。Cache 占用、Prefill 延迟、检索噪声和成本都会上升。长上下文还可能让模型忽略中间的重要信息。

生产系统应该根据任务设置上下文预算：检索只放最相关片段，旧对话做摘要，超过上限时明确截断或分段处理。上下文窗口是能力上限，不是每次请求都应该使用的额度。

## 九、如何压测 KV Cache

至少测试这些维度：

- 不同 Prompt 长度下的 Prefill 延迟；
- 不同输出长度下的 Decode 速度；
- 并发增加时的 Cache 使用率；
- 混合长短请求下的 P95/P99；
- 取消请求后的 Cache 释放时间；
- 前缀缓存命中和失效；
- Cache 接近上限时的拒绝或降级行为。

```ts
type CacheMetrics = {
  usedBytes: number
  peakBytes: number
  hitRate: number
  activeSequences: number
  evictions: number
  releaseLatencyMs: number
}
```

看到显存快满时，系统要有明确动作：拒绝新长请求、降低最大输出、抢占后台任务或切换模型。让所有请求继续进入，最后一起 OOM，不是弹性。

## 总结：缓存是速度和空间的交换

KV Cache 让模型不必重复计算历史 Token，是自回归推理能够实用的重要基础。但它不是免费的加速按钮：上下文越长、并发越高，Cache 越大；模型权重量化了，Cache 仍然可能成为显存主角。

PagedAttention 通过分块管理减少碎片，前缀缓存可以避免重复 Prefill，低精度 Cache 和上下文压缩可以换取空间，但所有优化都必须回到质量、延迟和稳定性验证。缓存复用还要遵守模型版本、租户、权限和数据生命周期边界。

我现在看一个大模型服务的并发数字，会先问它的 KV Cache 怎么管理：满了怎么办，取消会释放吗，长短请求会互相拖累吗，前缀缓存会不会跨租户，P99 延迟有没有被平均数掩盖。

真正高效的推理系统，不只是把模型放进显存，而是知道哪些中间结果值得留下、留下多久、谁可以复用，以及什么时候必须果断释放。速度来自少算和少等，稳定则来自在显存有限时仍然能做出明确、可预测的选择。
