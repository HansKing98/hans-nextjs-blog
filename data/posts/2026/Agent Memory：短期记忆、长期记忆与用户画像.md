---
title: Agent Memory：短期记忆、长期记忆与用户画像
date: 2025-07-06 10:00:00
tags:
  - AI
  - LLM
  - Agent
  - Memory
  - 隐私保护
summary: Agent Memory 不只是保存聊天记录，需要区分短期上下文、长期事实、用户偏好和任务状态，并处理记忆的权限、更新、过期与删除。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖 Agent 对话上下文、向量检索、用户偏好、任务状态、权限与隐私生命周期概念
 * [OUTPUT]: 对外提供 Agent Memory 的类型划分、读写策略、记忆更新、过期和隐私边界设计方法
 * [POS]: 大模型工程系列的 Agent 记忆文章，承接 Computer Use 与工具调用，服务后续 Agent 失败模式主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Agent Memory：短期记忆、长期记忆与用户画像

很多 Agent Demo 都会说自己“记住了你”。用户上一轮说过喜欢简洁回答，下一轮它真的少写了几段，看起来很神奇。接着问题就来了：它到底记住了什么？记了多久？谁可以看到？用户改口以后，旧偏好会不会一直影响结果？

我见过一个系统，把所有聊天记录都塞进向量数据库，再在每次请求时检索几段相关内容。刚开始效果不错，时间一长却变得越来越奇怪：模型把用户几个月前的临时计划当成长期事实，把一次玩笑当成个人偏好，把已经撤回的内容继续带进答案。系统确实“记住”了很多东西，但它没有真正理解记忆。

Agent Memory 的难点不是存储，而是判断什么值得存、什么时候使用、什么时候更新，以及什么时候必须忘记。记忆越多不一定越聪明，未经管理的记忆往往只是另一种上下文噪声。

## 一、先区分四种记忆

### 1. 短期上下文

当前对话中的消息、工具结果和最近几步任务状态。它服务当前请求，通常有明确的生命周期，超过上下文预算就需要摘要或淘汰。

### 2. 长期事实

相对稳定、经过确认的信息，例如用户所在时区、项目名称或已经确认的技术栈。事实必须有来源和更新时间，不能因为模型说过一次就永久保存。

### 3. 用户偏好

回答风格、语言、通知方式和常用格式等。偏好可以改变，但应该允许用户查看和修改，不能把模型推测的习惯当成用户明确同意的设置。

### 4. 任务记忆

长任务中的目标、检查点、已完成步骤、待处理事项和外部操作结果。任务记忆服务的是一个具体工作，不应自动变成用户画像。

```ts
type MemoryKind = 'context' | 'fact' | 'preference' | 'task'

type Memory = {
  id: string
  userId: string
  tenantId: string
  kind: MemoryKind
  content: string
  source: 'user' | 'tool' | 'inference'
  confidence: number
  createdAt: string
  updatedAt: string
  expiresAt?: string
  consentRequired: boolean
}
```

类型分开以后，存储时间、读取范围和删除方式才有机会分别设计。一个临时任务的中间结果，不应该和长期偏好使用同一套策略。

## 二、短期记忆首先是上下文预算问题

短期记忆最常见的做法是把最近若干轮消息拼到 Prompt 里，但上下文窗口和成本都是有限的。可以按重要性选择：

```text
当前问题和最近消息
  ↓
当前任务目标与未完成步骤
  ↓
最近工具结果
  ↓
历史对话摘要
  ↓
低价值闲聊逐步淘汰
```

```ts
function buildContext(messages: Message[], budget: number) {
  const recent = takeRecent(messages, budget * 0.5)
  const taskState = loadTaskState()
  const summary = loadConversationSummary()
  return fitTokens([summary, taskState, ...recent], budget)
}
```

摘要不是简单截断。它应该保留目标、约束、已确认事实、未完成事项和关键决策，去掉重复寒暄和已经失效的尝试。摘要本身也要标记生成时间和来源，不能把推测写成事实。

## 三、长期事实必须有来源和置信度

“用户住在上海”可能来自用户明确说明，也可能只是模型从一次物流问题里猜出来的。两者不能同等对待。

```ts
type MemoryEvidence = {
  memoryId: string
  sourceMessageId?: string
  sourceToolCallId?: string
  confirmedByUser: boolean
  confidence: number
  observedAt: string
}
```

只有用户明确说过、工具可靠返回或经过业务确认的信息，才适合作为长期事实。模型推测可以作为临时线索，但默认不应持久化，尤其是健康、财务、政治观点和家庭关系等敏感信息。

事实会变化，所以要有更新策略。用户说“我下个月搬到杭州”，系统不能立刻把“居住地”永久替换；它可能只是一个计划。记忆里应该区分当前事实、计划、历史事实和不确定推断。

## 四、用户画像不是越详细越好

用户画像很容易从“帮助用户”滑向“收集用户”。如果为了让回答更个性化，把所有对话自动总结成兴趣、性格、收入和关系，系统可能已经越过了用户能接受的边界。

我建议每条画像信息都回答三个问题：为什么需要它，用户是否知道，什么时候失效。无法回答用途的信息，不应该因为“以后也许有用”就保存。

```ts
type ProfileField = {
  name: string
  value: string
  purpose: string
  visibleToUser: boolean
  editableByUser: boolean
  retentionDays: number
  sensitivity: 'normal' | 'sensitive'
}
```

产品上可以提供“记住了什么”的页面，让用户查看、修改和删除。用户说“不要记住这件事”时，应该真正阻止进入长期记忆，同时处理已经写入的摘要、向量和缓存。

## 五、记忆读取也需要权限

不是所有记忆都能被所有任务读取。个人偏好可以用于个人对话，但不应该自动进入共享项目；一个项目的任务状态不能被另一个租户的 Agent 检索；管理员也不应因为拥有后台权限就默认看到所有用户私密记忆。

```ts
function canReadMemory(memory: Memory, scope: RequestScope) {
  if (memory.tenantId !== scope.tenantId) return false
  if (memory.kind === 'task' && !scope.taskIds.includes(memory.id)) return false
  if (memory.consentRequired && !scope.consentedMemoryKinds.includes(memory.kind)) {
    return false
  }
  return true
}
```

权限过滤必须在检索前和返回后都执行。向量相似度只能回答“内容像不像相关”，不能回答“当前用户能不能看”。

## 六、记忆写入不要完全交给模型

一个常见设计是让模型自己判断“这条信息值得记住吗”，然后直接调用 `saveMemory`。这很灵活，也很危险。模型可能把临时情绪、敏感信息或未经确认的推测写进去。

可以先让模型提出候选，再由规则和策略决定：

```ts
type MemoryCandidate = {
  content: string
  kind: MemoryKind
  reason: string
  sensitive: boolean
}

function acceptCandidate(candidate: MemoryCandidate) {
  if (candidate.sensitive) return 'needs_consent'
  if (candidate.kind === 'fact' && !candidate.reason) return 'reject'
  return 'review'
}
```

高敏感信息需要用户明确同意；低风险偏好可以提示用户并允许关闭；任务状态由工作流系统写入，不应该让模型自由总结后覆盖真实状态。

## 七、更新要避免旧记忆和新记忆打架

用户先说“我喜欢详细解释”，后来又说“以后简洁一点”。两条记忆都存在时，检索到哪一条取决于向量相似度，结果可能不稳定。

偏好和事实应该使用有版本的记录：

```ts
type MemoryRevision = {
  key: string
  value: string
  version: number
  validFrom: string
  validTo?: string
  supersedes?: string
  confirmedBy: 'user' | 'system'
}
```

更新时明确覆盖同一语义键，保留历史但默认读取当前有效版本。对于互相冲突的事实，不要让模型自行投票；应该标记冲突并请求用户确认，或交给业务规则解决。

## 八、过期和删除是记忆的一部分

记忆不是写进去就永远存在。任务完成后，临时记忆应自动过期；用户删除对话时，相关摘要、向量、缓存和备份要进入删除流程；租户离开后，不能只删除主表而留下搜索索引。

```text
删除请求
  ↓
按 memoryId 查找所有派生记录
  ↓
删除数据库、向量和缓存
  ↓
禁止再次写入训练或评测集
  ↓
生成删除审计结果
```

定期清理也要有失败重试和核验。系统应该能回答“这条记忆现在还会在哪些地方被读取”，而不是只说“主记录已经删除”。

## 九、记忆检索要评测“帮忙还是添乱”

记忆系统有两个方向的错误：该记住的没找着，不该用的被找出来。评测时至少看：

- 相关记忆召回率；
- 过期记忆误用率；
- 跨用户或跨租户泄漏率；
- 冲突记忆处理准确率；
- 用户要求忘记后的残留率；
- 加入记忆后任务成功率是否真的提升。

如果加入长期记忆后，回答变得更个性化，但事实错误和隐私投诉增加，那就不是成功。记忆应该减少用户重复说明的负担，而不是迫使用户不断纠正系统的错误印象。

## 总结：真正的记忆包含忘记的能力

Agent Memory 最容易被理解成“给模型一个更大的聊天记录”，但真正设计以后会发现，它更像一个有权限、有生命周期、有证据来源的个人数据系统。

短期上下文解决当前对话，长期事实解决重复说明，偏好让交互更顺手，任务记忆让长流程可以继续。但每类记忆都要明确来源、置信度、读取范围、更新方式、过期时间和删除路径。

我现在不会因为 Agent 记住了更多东西就认为它更聪明。一个可靠的 Agent 应该知道什么值得记，什么只是临时话题，什么需要用户同意，什么已经过期，什么必须忘掉。记忆的价值不是积累数据，而是让用户少解释一次，同时仍然清楚地拥有自己的信息。

当系统能够让用户查看、修改和删除记忆，能够在冲突时承认不确定，能够在权限不足时拒绝读取，Agent 才真正拥有了值得信任的记忆。会记住是能力，会忘记是边界，而知道什么时候不该记住，才是成熟。
