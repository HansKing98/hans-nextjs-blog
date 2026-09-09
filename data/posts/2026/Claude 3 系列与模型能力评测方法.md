---
title: Claude 3 系列与模型能力评测方法
date: 2024-04-28 10:00:00
tags:
  - AI
  - LLM
  - Claude 3
  - 模型评测
  - 多模态
summary: Claude 3 系列让模型评测从“谁更聪明”转向质量、速度、价格、长上下文和多模态能力的综合比较。本文用工程方法建立可复现的模型评测体系。
categories:
  - 人工智能
  - 发展史
---

{/*
 * [INPUT]: 依赖 Claude 3 系列公开能力、多模态模型、LLM 基准测试、人工评测与成本分析概念
 * [OUTPUT]: 对外提供模型能力评测集、指标、盲评、成本延迟对照与产品选型方法
 * [POS]: 大模型工程系列的模型发展史与评测文章，承接长上下文与多模态主题，服务后续 Llama 3 与 RAG 工程文章
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Claude 3 系列与模型能力评测方法

每次有新模型发布，网上都会出现一批“模型对比”：同一个问题分别发给几个模型，截几张回答截图，再根据语气、长度和个人感觉排出名次。它适合制造话题，却不适合做工程决策。

Claude 3 系列在 2024 年受到关注，一个原因是它把不同定位的模型放在了同一产品家族里：更强但更贵的模型、速度和成本更平衡的模型、面向高吞吐的轻量模型。与此同时，它支持图像输入，也让更多人开始认真讨论：模型能力到底应该怎么测？一个模型回答更长，是更聪明，还是更浪费？长上下文窗口更大，是否真的能找到中间的关键信息？

我研究模型评测后，最想纠正的一种说法是“这个模型整体更强”。模型不是一场只有一个冠军的比赛，而是一张任务能力地图。写作、代码、抽取、检索、多模态、工具调用和高风险拒答，可能分别由不同模型占优。好的评测不是替用户宣布唯一赢家，而是帮助团队知道：在什么任务上，该选择谁，为什么。

## 一、Claude 3 系列为什么值得写进发展史

以 Claude 3 家族为例，Opus、Sonnet 和 Haiku 分别代表不同的能力、速度和成本取舍。这样的产品分层让模型选择从“有没有最强模型”变成“任务需要哪一级能力”。

```text
高复杂度、低频任务 → 强模型
一般业务、实时交互 → 平衡模型
高并发、简单任务   → 轻量模型
```

它还让多模态输入更接近常规应用：用户不只提交文本，也可以提交图像，让模型做描述、问答和信息提取。但图像理解的质量不能只凭演示判断，小字、表格、图表、遮挡和坐标关系都需要单独评测。

更重要的是，模型家族的出现提醒我们，模型名字不是选型结论。真正的结论应该来自自己的任务集、质量指标、延迟、价格和数据边界。

## 二、先建立能力矩阵

不要先问“哪个模型最强”，先列出产品需要的能力：

```ts
type Capability =
  | 'general_qa'
  | 'long_context'
  | 'code'
  | 'structured_output'
  | 'vision'
  | 'tool_calling'
  | 'safety'

type CapabilityRequirement = {
  task: string
  capability: Capability
  minimumScore: number
  maxLatencyMs: number
  maxCostPerTask: number
}
```

例如，客服任务可能重视中文事实准确、引用和延迟；合同审查重视长文、条款定位和拒答；批量字段抽取重视结构化通过率和单位成本。不同要求自然会导向不同模型。

能力矩阵需要记录样本版本和测试时间：

```ts
type ModelCapabilityScore = {
  model: string
  revision: string
  datasetVersion: string
  capability: Capability
  score: number
  p95LatencyMs: number
  costPerTask: number
  evaluatedAt: string
}
```

模型会更新，供应商会调整价格，服务负载也会变化。一张没有版本和时间的能力矩阵，很快就会变成过时的印象。

## 三、评测集比一句神奇 Prompt 更重要

评测集应该来自真实任务，而不是只挑容易展示模型优点的问题。至少包含：

- 常见问题：代表大多数正常请求。
- 边界问题：输入不完整、表达含糊、数据为空。
- 长输入：文档、代码、表格和多轮上下文。
- 无答案：知识库没有依据时是否诚实拒答。
- 对抗输入：提示注入、越权和恶意内容。
- 结构化任务：JSON、分类、字段抽取和函数参数。
- 多模态任务：小字、表格、图表和复杂布局。

```ts
type EvaluationCase = {
  id: string
  category: string
  input: unknown
  expected?: unknown
  rubric: string[]
  verifier: 'exact' | 'schema' | 'unit_test' | 'human'
  risk: 'low' | 'medium' | 'high'
}
```

问题必须经过脱敏和授权，尤其是线上失败样本。保留错误类型、来源和上下文很有价值，但不能把用户合同、邮箱和内部凭证直接复制进共享评测仓库。

## 四、自动指标和人工指标要分工

能自动判断的地方，不要让人凭感觉打分：

```text
分类 → accuracy / macro-F1
抽取 → 字段准确率 / JSON 通过率
数学 → 独立计算器
代码 → 测试通过率
引用 → 来源存在且支持结论
```

开放式任务则需要人工 rubric：事实准确、相关性、完整性、表达清晰、安全性和可执行性分别判断。不要把所有维度压成一个“总体感觉”。

```ts
type HumanRubric = {
  correctness: 1 | 2 | 3 | 4 | 5
  relevance: 1 | 2 | 3 | 4 | 5
  completeness: 1 | 2 | 3 | 4 | 5
  safety: 1 | 2 | 3 | 4 | 5
  notes: string
}
```

人工评测要尽量盲评，隐藏模型名称和版本，随机化回答顺序。否则评测者可能因为品牌印象、格式偏好或先入为主而偏向某个模型。

## 五、不能把长答案当成高质量

语言模型很容易用更多文字制造“认真”的感觉。评测时要同时统计质量和长度：

```ts
type AnswerMetrics = {
  score: number
  inputTokens: number
  outputTokens: number
  answerCharacters: number
  citationCount: number
  unsupportedClaims: number
}
```

一个模型如果回答长度增加一倍，准确率只提升一点，单位任务成本可能不值得；如果长度增加但引用和事实没有改善，说明它只是在扩写。反过来，短回答也不天然更好，关键是是否覆盖必要条件。

可以使用“每个成功任务成本”比较模型，而不是只看每百万 Token 的价格：

```text
成功任务成本
= 单次调用成本 / 任务成功概率
 + 重试成本
 + 人工修复成本
```

便宜模型如果经常抽取错误、格式失败或转人工，最终可能比贵模型更贵。

## 六、长上下文要测“找得到”和“用得对”

Claude 3 时代，长上下文成为很多模型宣传的重要能力。评测不能只把长文放进去，然后问模型“总结一下”。要测试信息位于开头、中间、结尾，多个片段是否需要关联，文档之间是否存在冲突，以及模型是否会被无关内容干扰。

```text
长上下文测试
 ├─ 单点定位：找到指定事实
 ├─ 多点关联：合并多个段落
 ├─ 冲突判断：识别版本和时间
 ├─ 无答案：不从噪声中猜结论
 └─ 成本延迟：输入增长后的实际表现
```

```ts
type LongContextCase = {
  documentTokens: number
  needlePosition: 'beginning' | 'middle' | 'end'
  requiresMultiHop: boolean
  hasConflictingSources: boolean
  expectedBehavior: 'answer' | 'cite_conflict' | 'refuse'
}
```

上下文窗口大不等于模型能均匀利用每个位置。很多应用仍然需要检索、摘要和分层上下文，因为成本、延迟和注意力分配不会凭空消失。

## 七、多模态评测要看视觉细节

图片输入让模型可以做 OCR、图表解释、界面理解和视觉问答，但“看到了图片”不等于准确读出了所有信息。评测样本要覆盖：

- 小字号文字和低分辨率截图。
- 表格行列、合并单元格和单位。
- 图表坐标、图例和时间趋势。
- 多张图片之间的比较。
- 视觉内容中的恶意指令。

```ts
type VisionCase = {
  image: string
  question: string
  expected: unknown
  criticalFields: string[]
  verifier: 'ocr' | 'numeric' | 'human'
}
```

高风险字段如金额、日期、剂量和合同编号，应使用 OCR、规则或人工进行二次校验。模型在视觉错误时往往仍然表达得很自然，不能只凭流畅度判断。

## 八、调用参数要固定，结果才可比较

模型对比实验必须固定无关变量：Prompt、温度、最大输出、工具结果、上下文、随机种子（如果可控）和超时策略。否则你比较的可能不是模型，而是一组不同配置。

```ts
type EvalConfig = {
  promptVersion: string
  temperature: number
  topP: number
  maxTokens: number
  timeoutMs: number
  toolPolicyVersion: string
  datasetVersion: string
}
```

每个结果都保存请求 ID、模型版本、输入输出 Token、延迟、错误和完整的验证结果。流式模型还要记录首 Token 和完整响应时间，结构化模型则要记录解析和 Schema 失败。

## 九、模型裁判可以用，但不能独裁

对于开放式回答，LLM-as-a-Judge 可以降低人工成本，但裁判模型有自己的偏差：喜欢更长的回答、偏爱某种表达、容易被自信语气影响，也可能对不同语言不公平。

使用裁判时，把 rubric 写得具体，让它引用回答中的证据；同时用一部分人工盲评样本校准：

```ts
type JudgeCalibration = {
  judgeScore: number
  humanScore: number
  absoluteDifference: number
  disagreementReason?: string
}
```

裁判适合做排序、筛选和发现异常，不应在高风险场景里替代独立验证和人工责任。能用程序验证的结果，优先交给程序。

## 十、评测结果要能指导路由

最终目的不是生成一张漂亮榜单，而是帮助应用选择模型。可以把任务需求和模型测量结果做约束过滤：

```ts
function isEligible(
  model: ModelCapabilityScore,
  requirement: CapabilityRequirement,
) {
  return (
    model.score >= requirement.minimumScore &&
    model.p95LatencyMs <= requirement.maxLatencyMs &&
    model.costPerTask <= requirement.maxCostPerTask
  )
}
```

先过滤能力和数据边界，再在合格模型中按质量、延迟和成本选路由。不要用平均分覆盖硬约束：一个模型平均很强，但不支持结构化输出或敏感数据区域，就不适合该任务。

## 十一、上线后继续评测

离线评测只代表固定样本，线上分布会变化。要持续记录用户反馈、任务成功、重试、转人工、引用点击、结构化失败和成本。真实失败样本脱敏后回流测试集，形成闭环：

```text
线上 Trace
   ↓
失败归因
   ↓
脱敏与复核
   ↓
加入回归集
   ↓
模型 / Prompt / 路由版本比较
   ↓
灰度发布与继续观测
```

模型版本升级后要重跑关键集，不能因为供应商说“性能提升”就直接替换生产模型。小流量灰度可以发现真实延迟、长尾问题和数据边界问题，且要有明确回滚条件。

## 十二、我的总结：模型评测是地图，不是冠军赛

Claude 3 系列让更多人看到，模型产品可以按照能力、速度和价格分层；多模态和长上下文也让“模型到底会什么”变得更加复杂。一个模型在写作上领先，可能在结构化抽取上落后；在短问答上很快，长文处理时却变慢；在普通图片上准确，遇到小字表格就开始猜。

我现在做模型评测，会先建立真实任务集，再把自动验证、人工盲评、成本、延迟、风险和数据边界放在同一张报告里。每个指标都要能回答一个实际问题：是否放行？是否路由？是否需要人工？是否值得付这笔钱？

评测的价值不是宣布某个模型永远第一，而是让团队知道当前任务的证据。把模型当成一组会变化的能力，把评测集当成持续维护的测试，把失败样本当成下一轮改进的教材，模型选型就不会再依赖截图和印象。

大模型发展到 2024 年，工程师真正需要的已经不只是“会调用 API”，还要会测量能力、计算成本、识别退化和管理风险。只有当一个模型的质量提升能够被任务数据证明、成本能够被账单解释、失败能够被 Trace 定位，它才真正从发布会里的能力，变成产品里可以依赖的能力。
