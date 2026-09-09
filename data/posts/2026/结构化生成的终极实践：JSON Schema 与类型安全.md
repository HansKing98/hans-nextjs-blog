---
title: 结构化生成的终极实践：JSON Schema 与类型安全
date: 2026-01-22 10:00:00
tags:
  - AI
  - LLM
  - JSON Schema
  - TypeScript
  - 结构化输出
summary: 结构化生成不能只靠提示词要求模型输出 JSON，还要结合 Schema、运行时校验、错误修复、版本兼容和类型安全。
categories:
  - 人工智能
  - 工程实践
---

{/*
 * [INPUT]: 依赖 LLM 结构化输出、JSON Schema、TypeScript、运行时校验与 API 版本设计知识
 * [OUTPUT]: 对外提供结构化生成的 Schema 设计、解析校验、容错修复与类型安全实践
 * [POS]: 大模型工程系列的结构化输出文章，承接模型网关，服务后续自动评审和 Prompt 工程主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# 结构化生成的终极实践：JSON Schema 与类型安全

“请只输出 JSON，不要解释。”这是很多 LLM 项目的第一版方案。刚开始测试时，它通常能工作；模型返回一个对象，前端 `JSON.parse`，业务继续往下走。等输入变复杂，问题就出现了：多了一段 Markdown，字段名拼错，数字变成字符串，数组里混进了说明文字，或者模型在 JSON 前面说了一句“当然可以”。

更麻烦的是，模型偶尔成功并不能让系统可靠。真正的生产代码必须假设输出会不符合预期，然后明确怎么识别、怎么修复、怎么降级。

我后来把结构化输出看成一份 API 协议。模型是一个不完全可靠的服务端，Schema 是接口契约，运行时校验是边界防线，版本字段负责兼容，错误处理负责把坏结果挡在业务逻辑之外。

## 一、先设计数据契约，再写 Prompt

假设我们要从客服文本中抽取订单信息：

```ts
type OrderIntent = {
  intent: '查询物流' | '申请退款' | '修改地址' | '其他'
  orderId: string | null
  urgency: 'low' | 'normal' | 'high'
  needHuman: boolean
}
```

这个类型只是开发阶段的提示，不能直接相信模型返回的数据。要把它变成运行时 Schema，并明确必填、可空、枚举、长度和额外字段策略：

```ts
const orderIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'orderId', 'urgency', 'needHuman'],
  properties: {
    intent: {
      type: 'string',
      enum: ['查询物流', '申请退款', '修改地址', '其他'],
    },
    orderId: { type: ['string', 'null'] },
    urgency: { type: 'string', enum: ['low', 'normal', 'high'] },
    needHuman: { type: 'boolean' },
  },
}
```

`additionalProperties: false` 很有价值。它能阻止模型偷偷增加业务没有处理的字段，也能更早发现 Prompt 或模型版本发生了漂移。

## 二、TypeScript 类型和运行时校验是两回事

TypeScript 只在编译期检查开发者写的代码，网络返回的 JSON 在运行时仍然是未知数据：

```ts
const raw: unknown = await response.json()
const result = parseOrderIntent(raw)
```

解析函数必须先验证，再转换成业务类型：

```ts
function parseOrderIntent(value: unknown): OrderIntent {
  if (!isRecord(value)) throw new InvalidModelOutputError()
  if (!intentValues.includes(value.intent)) {
    throw new InvalidModelOutputError('intent 不合法')
  }
  if (value.orderId !== null && typeof value.orderId !== 'string') {
    throw new InvalidModelOutputError('orderId 类型错误')
  }
  if (typeof value.needHuman !== 'boolean') {
    throw new InvalidModelOutputError('needHuman 类型错误')
  }
  return value as OrderIntent
}
```

可以使用 Zod、Ajv 或其他 Schema 库减少重复代码，但原则不变：来自模型、用户、第三方 API 的数据，在进入业务逻辑前都必须经过运行时校验。

## 三、输出协议要包含版本和状态

对于长期运行的系统，可以给结构化结果加上协议版本：

```json
{
  "schemaVersion": "order-intent-v2",
  "status": "ok",
  "data": {
    "intent": "查询物流",
    "orderId": "A1001",
    "urgency": "normal",
    "needHuman": false
  }
}
```

`status` 不要只用 HTTP 状态代替。模型可能响应成功，但内容无法解析；也可能解析成功，却明确表示证据不足。把 `ok`、`needs_review`、`no_evidence` 和 `invalid` 区分开，调用方才知道下一步该做什么。

Schema 版本升级要考虑向后兼容。新增可选字段通常比较安全，改变枚举含义、删除必填字段或修改数字单位则需要新版本和迁移逻辑。不要让前端和后端各自猜版本含义。

## 四、Prompt 仍然重要，但不再承担全部责任

Schema 能约束形状，却不能保证事实正确。Prompt 需要说明字段含义、来源和不确定时的行为：

```text
只根据输入文本抽取订单信息。
找不到订单号时返回 null，不要猜测。
无法判断意图时返回“其他”，并将 needHuman 设为 true。
只输出符合 order-intent-v2 的 JSON。
```

这类指令帮助模型理解业务，但最终仍要由代码校验。`orderId` 符合字符串类型，不代表它真的存在；`needHuman` 是布尔值，也不代表模型正确判断了风险。

## 五、解析失败时要有分层修复策略

第一层是直接解析和 Schema 校验；第二层是安全的格式清理，例如去除 Markdown 代码围栏；第三层可以请求模型只修复格式，不重新生成业务内容；仍然失败就降级或转人工。

```ts
async function parseWithRepair(raw: string) {
  try {
    return validate(JSON.parse(raw))
  } catch (error) {
    const cleaned = stripCodeFence(raw)
    try {
      return validate(JSON.parse(cleaned))
    } catch {
      const repaired = await repairJson(cleaned, orderIntentSchema)
      return validate(JSON.parse(repaired))
    }
  }
}
```

修复请求必须有次数和 Token 上限。不要因为模型输出坏了，就无限让它重写；如果业务字段已经混乱，重新格式化并不能创造缺失事实。高风险结果宁可失败，也不要“修”成一个看起来合法的错误对象。

## 六、语义校验比形状校验更难

下面这个结果完全符合 Schema：

```json
{
  "intent": "申请退款",
  "orderId": "A1001",
  "urgency": "low",
  "needHuman": false
}
```

但用户可能只是询问退款规则，并没有提出退款申请。Schema 只能判断形状，语义还需要业务规则、检索证据或第二步判断。

可以把校验分成三层：

```text
形状：字段、类型、枚举、必填
业务：订单是否存在、状态是否允许退款
证据：模型结论是否被输入或检索内容支持
```

每一层失败都应该有不同错误类型。形状失败可能重试格式，业务失败应返回业务提示，证据不足则应拒答或请求人工。

## 七、批量处理要记录坏样本

结构化抽取通常会批量处理大量文档。不能因为一个样本失败就让整批任务中断，也不能静默跳过。每条记录要有状态和错误原因：

```ts
type ExtractionResult = {
  inputId: string
  status: 'succeeded' | 'invalid' | 'needs_review' | 'failed'
  data?: OrderIntent
  errorCode?: string
  modelVersion: string
  schemaVersion: string
}
```

失败样本要脱敏保存，方便分析是某种输入格式、某个模型版本还是 Schema 变更导致的。可以对高频失败做专项样本集，加入 Prompt 回归和发布门禁。

## 八、从 Schema 生成类型和文档

Schema 只有一份来源，才能避免类型和协议漂移。可以从 JSON Schema 生成 TypeScript 类型、API 文档和测试样例：

```text
Schema
  ├─ TypeScript 类型
  ├─ 运行时校验器
  ├─ Prompt 输出约束
  ├─ API 文档
  └─ 回归测试样例
```

生成工具可以按团队技术栈选择，但不要手工维护五份近似定义。重复定义越多，越容易出现“后端认为字段叫 orderId，前端却等着 order_id”的问题。

## 九、评测结构化生成要看失败类型

不要只统计“JSON 解析成功率”。至少记录：

- 解析成功率；
- Schema 校验通过率；
- 字段完整率；
- 字段值准确率；
- 业务规则通过率；
- 高风险错误率；
- 平均修复次数和成本。

一个模型解析率 99.9%，但金额字段准确率只有 90%，仍然不能用于财务任务。不同字段的风险不同，关键字段应该有更严格的门槛和人工抽查。

## 总结：结构化生成是协议设计，不是格式许愿

我现在看到“请输出 JSON”这句话，会继续问：Schema 在哪里？运行时谁校验？字段错了怎么办？版本怎么升级？没有证据时如何表达？坏结果会不会进入数据库或触发工具？

Prompt 可以告诉模型希望得到什么，Schema 可以描述结果长什么样，运行时校验可以挡住不合法数据，业务规则可以判断是否真的可用，回归测试则帮助我们知道修改以后有没有退化。

结构化输出的终点不是让模型每次都返回一个漂亮对象，而是让系统在面对漂亮对象和坏对象时都能做出正确动作。能解析的结果进入下一步，缺证据的结果明确拒答，高风险的结果交给人，未知字段和版本变化被及时发现。

当模型输出真正成为一份有版本、有校验、有降级路径的协议，LLM 应用才不再依赖运气。我们不是要求机器永远不犯错，而是让错误在越过业务边界之前被看见、被分类、被安全地处理。
