---
title: 从模型选型到能力路由：建立自己的 Model Gateway
date: 2026-01-04 10:00:00
tags:
  - AI
  - LLM
  - Model Gateway
  - 模型选型
  - 系统架构
summary: 模型选型不能只看排行榜，需要根据任务能力、质量、延迟、成本、数据策略和故障表现建立可解释、可回滚的 Model Gateway。
categories:
  - 人工智能
  - 系统架构
---

{/*
 * [INPUT]: 依赖 LLM 模型能力、任务路由、评测、成本、延迟、数据策略与网关架构概念
 * [OUTPUT]: 对外提供模型选型、能力路由、模型注册、策略评估和 Model Gateway 设计方法
 * [POS]: 大模型工程系列的模型路由文章，承接前期 Agent 基础，服务后续 LLM 网关和结构化输出主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# 从模型选型到能力路由：建立自己的 Model Gateway

模型越多，选择越容易变成争论。有人看排行榜，有人看价格，有人觉得最新模型一定最好，还有人因为某次回答很漂亮，就决定全站切换。真正上线后才发现：一个模型擅长长文档，另一个模型更适合结构化输出；一个模型便宜但延迟高，另一个模型快却容易漏掉中文细节；有的模型能处理敏感数据，有的模型完全不能。

我以前也喜欢问“哪个模型最好”，后来发现这个问题本身就不准确。更有价值的问题是：对于当前任务、当前数据和当前预算，哪个模型最合适？

Model Gateway 的意义，就是把这个选择从业务代码和个人偏好中收拢出来，变成一套可以评测、解释、灰度和回滚的能力路由系统。

## 一、先建立模型注册表

不要把模型名称直接写在每个业务函数里。先为模型建立注册信息：

```ts
type ModelProfile = {
  name: string
  provider: string
  capabilities: Array<'chat' | 'vision' | 'audio' | 'tool' | 'reasoning'>
  contextTokens: number
  inputPrice: number
  outputPrice: number
  p95LatencyMs: number
  dataClasses: Array<'public' | 'internal' | 'sensitive'>
  qualityScores: Record<string, number>
  status: 'active' | 'degraded' | 'disabled'
}
```

模型注册表不应该只保存宣传参数，还要保存自己的实测结果：中文质量、结构化成功率、RAG 忠实性、工具调用稳定性、首 Token 延迟和高峰期错误率。供应商的上下文长度是能力声明，能不能在你的业务里稳定工作，必须由自己的数据证明。

## 二、先描述任务，再选择模型

业务方通常不会说“我需要一个 128K 上下文模型”，而会说“帮我总结一份合同”“从工单里抽字段”“查一下订单”“分析一组日志”。网关需要把这些需求变成任务规格：

```ts
type TaskRequest = {
  purpose: 'classification' | 'extraction' | 'rag' | 'agent' | 'summary'
  inputTokens: number
  needsVision: boolean
  needsTools: boolean
  risk: 'low' | 'medium' | 'high'
  maxLatencyMs: number
  maxCost: number
  dataClass: 'public' | 'internal' | 'sensitive'
}
```

这一步很关键。模型选择不是按品牌，而是按约束匹配。敏感数据可能排除一批云端模型；高风险任务需要更强的质量和人工确认；简单分类不应该默认调用最贵模型；长上下文任务又不能只看每百万 Token 价格。

## 三、路由是过滤、评分和降级

一个基本路由流程可以是：

```text
任务规格
  ↓
能力过滤：是否支持视觉、工具、上下文长度
  ↓
策略过滤：是否允许处理当前数据分类
  ↓
健康过滤：模型是否正在故障或限流
  ↓
评分排序：质量、延迟、成本和风险
  ↓
选择主模型与备用模型
```

```ts
function selectCandidates(task: TaskRequest, models: ModelProfile[]) {
  return models
    .filter((model) => model.status === 'active')
    .filter((model) => model.contextTokens >= task.inputTokens)
    .filter((model) => !task.needsVision || model.capabilities.includes('vision'))
    .filter((model) => !task.needsTools || model.capabilities.includes('tool'))
    .filter((model) => model.dataClasses.includes(task.dataClass))
    .filter((model) => model.inputPrice <= task.maxCost)
}
```

过滤必须先于评分。一个不允许处理敏感数据的模型，即使质量和价格都很好，也没有资格进入候选列表。安全边界不是评分项，不能用便宜一点来交换。

## 四、评分函数要能解释

在候选模型中，可以根据任务权重计算分数：

```text
总分 = 质量分 × 0.45
     + 延迟分 × 0.20
     + 成本分 × 0.15
     + 工具稳定分 × 0.10
     + 历史成功率 × 0.10
```

不同任务使用不同权重。摘要任务可能更关注质量和上下文，实时对话更关注首 Token 延迟，后台批处理更关注成本，Agent 工具调用则必须提高参数正确率和任务成功率的权重。

分数只是辅助选择，不要让一个综合数字掩盖硬性约束。高风险任务可以规定质量低于阈值就直接升级，不允许因为延迟更快而被选中。

## 五、能力路由比静态配置更灵活

同一功能内也可以按请求难度路由：

```text
简单分类 / 固定抽取 → 小模型
普通问答 / 短 RAG → 平衡模型
长上下文 / 复杂推理 → 强模型
高风险操作 → 强模型 + 人工确认
```

本地小模型可以先做意图识别、敏感信息识别和问题改写；如果置信度高，直接完成；如果不确定，再升级到更强模型。升级原因必须记录，才能知道小模型到底覆盖了多少流量。

```ts
async function routeByConfidence(task: TaskRequest) {
  const quick = await fastModel.classify(task)
  if (quick.confidence > 0.93 && task.risk === 'low') {
    return { model: 'fast-model', reason: 'high_confidence' }
  }
  return { model: 'quality-model', reason: 'low_confidence_or_risk' }
}
```

置信度需要用独立数据校准，不能直接相信模型输出的一个小数。不同类别、语言和输入长度可能需要不同阈值。

## 六、统一适配供应商差异

供应商的消息格式、流式事件、工具 Schema、错误码和 Token 统计往往不同。网关应该通过适配器转换为内部协议：

```ts
interface ModelAdapter {
  generate(request: LLMRequest): AsyncIterable<LLMEvent>
  countTokens(input: string): Promise<number>
  cancel(requestId: string): Promise<void>
}
```

业务代码只依赖 `ModelAdapter`，不需要知道某个供应商把工具调用放在哪个字段。适配器还负责把供应商错误转换成统一错误类型，网关才能决定是重试、换模型还是直接失败。

不要为了追求统一而抹平所有能力差异。某些模型支持视觉或特殊推理参数，内部协议可以用可选能力表达；不支持的模型在能力过滤阶段被排除，而不是到了运行时才崩溃。

## 七、故障时要有健康评分和熔断

模型状态不是“开/关”两个静态值。网关可以根据最近窗口的超时率、错误率、P95 延迟和限流情况更新健康状态：

```ts
type Health = {
  errorRate: number
  timeoutRate: number
  p95LatencyMs: number
  rateLimitRate: number
  circuit: 'closed' | 'open' | 'half_open'
}
```

错误持续超过阈值时熔断，暂时不把新请求发过去；等待窗口后用少量探测请求恢复。备用模型必须经过相同的数据策略和能力检查，不能因为主模型挂了就把敏感内容随便发给另一家服务。

## 八、灰度和回滚是路由系统的基本能力

新模型不应该直接全量。可以按租户、功能、用户哈希或流量比例灰度，比较质量、延迟、成本、拒答率和工具失败率。

```ts
type RouteRelease = {
  policyVersion: string
  model: string
  percentage: number
  conditions: string[]
  rollbackTo?: string
}
```

每个请求记录策略版本和最终模型。出现质量回归时，能够只回滚某个功能或租户，而不是整个系统一起切换。回滚配置应当简单、快速、经过演练，不能等故障发生后临时修改十几个环境变量。

## 九、模型选型必须回到自己的基准集

排行榜可以帮助发现候选模型，但最终决策要用自己的数据。准备覆盖常见、长尾、无答案、高风险和工具调用的基准集，记录每个模型的结果：

```text
模型 A：质量 92%，P95 2.1s，成本 1.0，工具成功率 98%
模型 B：质量 94%，P95 4.3s，成本 2.4，工具成功率 99%
模型 C：质量 88%，P95 0.8s，成本 0.3，工具成功率 93%
```

这时没有唯一答案。实时低风险任务可能选 C，复杂 Agent 可能选 B，普通 RAG 选择 A。好的网关不是替你宣布一个冠军，而是根据任务约束做出可解释选择。

## 总结：模型选择最后是系统选择

我现在看到“全站切换到最新模型”的建议，第一反应不是反对，而是问几个问题：哪些任务需要它？质量提升是否超过成本和延迟？敏感数据能不能发送？旧版本如何回滚？有没有自己的基准集证明收益？

Model Gateway 的价值，就是把这些问题变成系统能力。模型有注册信息，任务有约束，候选先过安全和能力过滤，再按质量、延迟和成本评分；调用通过统一适配器，故障有健康检查和熔断，发布有灰度和回滚，结果有完整的路由和成本记录。

模型会越来越多，但业务不应该因此越来越混乱。让业务表达任务，让网关负责选择；让评测提供证据，让策略决定取舍；让故障可以降级，让版本可以撤回。最终你建立的不是一个“调用所有模型的代理”，而是一层让模型能力变得可理解、可替换、可控制的基础设施。
