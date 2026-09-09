---
title: vLLM 推理服务：PagedAttention 与吞吐优化
date: 2025-09-14 10:00:00
tags:
  - AI
  - LLM
  - vLLM
  - PagedAttention
  - 推理服务
summary: 使用 vLLM 部署大模型时，真正决定服务质量的是 KV Cache 管理、动态批处理、请求调度、流式输出和真实负载下的吞吐与尾延迟。
categories:
  - 人工智能
  - 模型部署
---

{/*
 * [INPUT]: 依赖 vLLM、PagedAttention、KV Cache、Continuous Batching、OpenAI 兼容 API 与 GPU 服务运维知识
 * [OUTPUT]: 对外提供 vLLM 推理服务部署、性能调优、监控与压测方法
 * [POS]: 大模型工程系列的推理服务文章，承接 KV Cache 与连续批处理，服务后续推测解码主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# vLLM 推理服务：PagedAttention 与吞吐优化

把一个模型在本地跑起来，和把它变成一个能服务真实用户的 API，是两件完全不同的事。单人测试时，模型回答得很快；一有并发，显存开始紧张，队列越来越长，短问题被长问题拖住，客户端断开以后 GPU 还在继续生成。

我第一次部署模型服务时，也把注意力放在“模型能不能加载”上。后来发现，加载成功只是起点。真正决定服务能不能撑住的，是 KV Cache 怎么分配、请求怎么组成批次、用户取消后资源能不能释放，以及服务出现异常时能不能快速降级。

vLLM 之所以受到关注，核心就在于它把这些推理服务问题放进了运行时。PagedAttention 负责更灵活地管理 KV Cache，Continuous Batching 负责让不同请求动态进出批次，服务层再通过队列、流式返回和指标把能力交给用户。

## 一、先用最小服务确认链路

部署前先确认四件事：模型架构支持、Tokenizer 匹配、GPU 显存足够、运行时和 CUDA 兼容。然后用一个最小请求验证输入输出，不要一上来就压测。

```bash
vllm serve /models/my-model \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9
```

客户端可以使用 OpenAI 兼容协议：

```ts
const response = await fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'my-model',
    messages: [{ role: 'user', content: '解释一下 KV Cache' }],
    stream: true,
  }),
})
```

兼容协议方便迁移，但不代表不同模型行为完全一样。上下文长度、工具调用、结构化输出和采样参数仍要在目标模型上验证。

## 二、PagedAttention 解决什么问题

每个生成请求都需要 KV Cache。传统方式常常为序列申请连续内存，随着请求长度不同和完成时间不同，容易产生碎片。PagedAttention 把 Cache 切成固定大小的块，逻辑序列通过块表映射到物理位置。

```text
逻辑序列：A B C D E F G
物理块：  3 8 1 9 4 7 2
```

逻辑上连续，物理上可以不连续。请求完成时释放块，新请求再利用空闲块，避免因为找不到大段连续空间而拒绝请求。

```ts
type BlockTable = {
  sequenceId: string
  blockIds: number[]
  blockSizeTokens: number
  allocatedTokens: number
}
```

这不意味着显存从此不会满。块管理减少碎片，但总 Cache 仍然受显存和序列长度限制。上下文上限、最大并发和输出 Token 需要一起设置。

## 三、动态批处理让请求不必互相等待

静态 Batch 往往要等一批请求一起结束，长请求会拖住短请求。Continuous Batching 每轮重新组织活跃序列：完成的退出，等待的进入，剩余请求继续生成。

```text
轮次 1：A、B
轮次 2：A、B、C
轮次 3：B、C、D
轮次 4：B、D
```

这使 GPU 更充分工作，也提高了整体吞吐。但调度器必须处理优先级、Cache 预算、长短请求混合和公平性。吞吐提高不代表每个用户都更快，P95/P99 和队列等待仍然要观察。

## 四、max-model-len 不是越大越好

启动参数里的最大上下文长度会影响运行时为请求预留的能力。设置太小，长文档无法处理；设置太大，Cache 预算和调度压力上升，实际短请求也可能受到影响。

```text
显存预算
≈ 模型权重
  + 活跃请求的 KV Cache
  + 运行时临时张量
  + CUDA 和服务进程开销
```

模型量化可以减少权重占用，但 KV Cache 仍可能使用 FP16 或 BF16。生产配置要根据真实输入长度分布决定，而不是直接照抄模型最大上下文。

## 五、流式输出要正确处理断开和取消

聊天接口通常使用流式响应。服务端生成一个片段就发送一个片段，用户可以更早看到结果。与此同时，客户端可能关闭页面、网络断开或主动取消。

```ts
const controller = new AbortController()

const response = await fetch('/api/generate', {
  signal: controller.signal,
  method: 'POST',
  body: JSON.stringify(request),
})

// 用户点击停止
controller.abort()
```

取消必须传播到推理运行时，释放序列和 Cache。否则客户端已经收不到内容，GPU 却继续生成，这种“看不见的成本”在高并发时非常昂贵。

服务端还要处理下游连接慢的情况。不能让一个消费很慢的客户端长期占住内存和发送缓冲区；应设置发送超时和最大缓存，必要时主动结束连接。

## 六、请求调度要考虑公平性

一个超长 Prompt 可能占用大量 Prefill 计算，一个长回答又长期占用 Decode 资源。可以把请求分成实时、普通和后台队列：

```ts
type QueueClass = 'interactive' | 'normal' | 'batch'

type RequestMeta = {
  queue: QueueClass
  tenantId: string
  deadlineAt?: number
  maxNewTokens: number
}
```

实时请求应该有首 Token 预算，批量任务可以延迟；租户需要有并发上限，防止一个客户霸占全部 Cache。高优先级可以获得更多机会，但不能让低优先级请求永远得不到服务。

## 七、监控不能只有 GPU 利用率

GPU 利用率高不一定代表用户体验好；利用率低也不一定说明服务有问题。至少记录：

- 请求成功率和错误码；
- 队列等待时间；
- 首 Token 延迟和完整响应延迟；
- Prefill 与 Decode 时间；
- 输入输出 Token；
- 活跃序列数和 KV Cache 使用量；
- Cache 分配失败和请求拒绝数；
- 客户端取消率和超时率。

```ts
type InferenceMetrics = {
  activeSequences: number
  kvCacheUsage: number
  queueWaitP95Ms: number
  timeToFirstTokenP95Ms: number
  outputTokensPerSecond: number
  rejectedRequests: number
}
```

指标要按模型、租户、队列和输入长度切片。平均值很容易掩盖长上下文请求已经变慢的问题。

## 八、压测要使用真实长度分布

只发 100 个相同的“你好”不能证明服务稳定。压测样本要混合短问题、长 Prompt、不同输出长度、突发流量、客户端取消和超出配额的请求。

```text
测试 A：单请求冷启动
测试 B：短输入短输出并发
测试 C：长输入短输出
测试 D：短输入长输出
测试 E：长短请求混合 + 突发到达
测试 F：部分客户端中途断开
```

观察吞吐、P50/P95/P99、队列长度、显存峰值和错误率。吞吐最大点不一定是最佳工作点，超过某个并发以后，尾延迟和超时可能快速恶化。

## 九、常见优化顺序

我通常按以下顺序排查：

1. 先确认模型和引擎没有回退到低效实现。
2. 限制不合理的最大上下文和输出长度。
3. 处理客户端取消，及时释放 Cache。
4. 调整调度和动态批处理参数。
5. 优化 Tokenizer、网络和流式发送。
6. 再考虑量化、推测解码和多实例部署。

不要一上来就增加 GPU。很多问题是长上下文没有裁剪、失败请求无限重试或断开连接没有取消。先把浪费消除，再判断是否真的需要更多硬件。

## 十、发布和回滚要一起设计

模型权重、Tokenizer、vLLM 版本、CUDA、启动参数和路由配置应该组成一个可追踪版本。新版本先小流量灰度，比较质量、延迟、成本和拒绝率；异常时切回旧实例。

```text
旧服务 v1 → 灰度服务 v2
             ├─ 指标正常 → 扩大流量
             └─ 指标异常 → 路由回 v1
```

不要只保留最新模型文件。没有旧实例和旧配置，所谓回滚就只能重新部署，故障时间会被拉长。

## 总结：推理服务的核心是调度资源

vLLM 给人的第一印象可能是“启动一个更快的模型服务”，但真正值得学习的是它背后的思路：KV Cache 不再依赖笨重的连续分配，动态批处理不再让请求互相等待，运行时开始主动管理显存、序列和调度。

不过，框架不会自动替团队解决所有问题。最大上下文、并发、队列、优先级、取消、监控和回滚仍然需要结合业务设计。一个服务在单请求下快，不代表在真实流量下稳；GPU 利用率漂亮，也不代表用户没有排队。

我现在部署模型，会先问：请求怎么进入，Cache 怎么分，完成后怎么释放，客户端取消会发生什么，队列满了怎么处理，P95 超标时怎么降级。把这些问题回答清楚以后，vLLM 才不只是一个推理框架，而会成为一套可以被观测、被调优、被恢复的生产基础设施。
