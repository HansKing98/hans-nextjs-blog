---
title: Computer Use：浏览器操作的状态机设计
date: 2025-06-22 10:00:00
tags:
  - AI
  - LLM
  - Computer Use
  - Agent
  - 浏览器自动化
summary: 浏览器操作 Agent 不能只依赖截图和坐标，需要用状态机、语义定位、动作约束、等待检测、确认和恢复机制保证执行可靠。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖视觉理解、浏览器自动化、可访问性树、状态机、工具调用与高风险动作控制知识
 * [OUTPUT]: 对外提供 Computer Use 浏览器操作的状态建模、动作执行、等待、恢复与安全设计方法
 * [POS]: 大模型工程系列的浏览器智能体文章，承接 MCP 与多模态 Agent，服务后续 Agent Memory 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Computer Use：浏览器操作的状态机设计

“帮我打开网页，填写表单，再点击提交。”这是 Computer Use Agent 最容易展示的任务。截图发给模型，模型返回一个坐标，浏览器执行点击，看起来就完成了。

但网页不是一张静态图片。页面会加载、跳转、弹窗、刷新，按钮可能因为权限或字段校验暂时不可用，窗口大小和缩放比例也会改变坐标。一个动作即使点中了位置，也不代表点中了正确的元素。

我第一次做浏览器 Agent 时，最初把重点放在“坐标预测准不准”。后来发现，真正的根因通常是系统不知道自己处于什么状态：页面还没加载完就点击了，提交以后没有重新确认结果，或者旧页面的动作晚到，覆盖了新任务。

Computer Use 的核心不是让模型学会更多点击，而是把浏览器操作设计成一个有状态、可观察、可恢复的系统。

## 一、把浏览器任务建模成状态机

先定义任务状态，而不是直接调用动作：

```ts
type BrowserState =
  | 'initializing'
  | 'page_loading'
  | 'ready'
  | 'form_filling'
  | 'waiting_confirmation'
  | 'submitting'
  | 'completed'
  | 'blocked'
  | 'error'
```

状态转换必须有条件：

```text
page_loading → ready：目标元素存在且页面稳定
ready → form_filling：找到目标表单
form_filling → waiting_confirmation：参数已校验
waiting_confirmation → submitting：用户明确批准
submitting → completed：结果状态已验证
```

如果页面元素不存在，就不能假设它只是“晚一点出现”，应该进入等待或阻塞状态；如果提交结果没有验证，就不能直接标记完成。

## 二、观察结果要包含语义和版本

截图有视觉信息，但最好结合 URL、标题、可访问性树、DOM 角色和元素边界：

```ts
type PageObservation = {
  observationId: string
  url: string
  title: string
  screenshotHash: string
  viewport: { width: number; height: number; scale: number }
  elements: Array<{
    elementId: string
    role: string
    name: string
    visible: boolean
    enabled: boolean
    bounds?: [number, number, number, number]
  }>
  observedAt: string
}
```

`observationId` 用来防止旧动作作用在新页面上。动作执行前检查当前页面版本，如果 URL、截图哈希或目标元素状态已经变化，就重新观察，而不是继续使用旧坐标。

## 三、动作应该是受限的工具集合

不要让模型直接生成任意 JavaScript 或 Shell。定义有限动作：

```ts
type BrowserAction =
  | { type: 'click'; elementId: string }
  | { type: 'type'; elementId: string; text: string }
  | { type: 'select'; elementId: string; value: string }
  | { type: 'scroll'; direction: 'up' | 'down'; amount: number }
  | { type: 'wait'; condition: string; timeoutMs: number }
```

服务端检查元素是否存在、是否可见、是否启用、是否属于允许的域名和当前任务。`elementId` 由系统观察生成，不能由模型凭空写一个猜测 ID。

坐标只有在语义定位不可用时才作为候选，并且要转换设备像素和 CSS 像素：

```ts
function toCssPoint(x: number, y: number, scale: number) {
  return { x: x / scale, y: y / scale }
}
```

即使坐标落在按钮范围内，也要在执行前重新确认页面没有变化。

## 四、等待不能靠固定 sleep

`await sleep(2000)` 很容易写，却无法保证页面真的准备好了。网络快时浪费时间，网络慢时又不够。应该等待可观察条件：元素出现、按钮启用、加载指示消失、URL 改变或某个状态文本出现。

```ts
async function waitFor(condition: () => Promise<boolean>, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await condition()) return
    await sleep(100)
  }
  throw new TimeoutError('页面未达到预期状态')
}
```

等待条件要和任务状态对应。看到页面加载完成，不代表数据请求完成；按钮出现，不代表它已经可点击。稳定性比“快点继续”更重要。

## 五、表单填写要分为填充和提交

输入框填写通常是可逆的，提交可能产生副作用。两者不要合成一个“填写并提交”工具。

```text
读取字段和规则
  ↓
填充候选值
  ↓
重新读取并校验字段
  ↓
展示摘要和影响
  ↓
等待用户确认
  ↓
提交
```

金额、收件人、日期、权限和附件要在提交前再次校验。用户确认的应该是最终值，而不是 Agent 几分钟前生成的草稿。

## 六、动作结果要重新观察

每次动作执行后，都要等待并读取新状态：

```ts
async function executeAndObserve(action: BrowserAction) {
  const before = await browser.observe()
  await browser.execute(action)
  const after = await waitForChangedObservation(before)
  return { before, after }
}
```

点击“下一步”以后，可能是页面跳转、错误提示、权限弹窗或按钮无响应。Agent 必须根据结果重新规划，不能直接假设动作成功。

状态变化还要记录时间和来源，方便回放：

```text
observation-41：表单已填充，提交按钮可用
action-42：点击 submit
observation-43：出现二次确认弹窗
action-44：等待人工确认
```

## 七、导航和域名必须受限

浏览器 Agent 经常需要打开链接，但页面中的链接可能指向外部域名、钓鱼页面或包含敏感参数的 URL。建立允许列表：

```ts
type NavigationPolicy = {
  allowedOrigins: string[]
  allowDownloads: boolean
  allowPopups: boolean
  blockSensitiveQueryParams: boolean
}
```

跳转前解析目标 URL，检查协议、域名、端口和查询参数。不要因为页面文字说“请打开这个链接”就自动信任它。网页内容是输入，不是权限指令。

## 八、失败恢复要区分可重试和不可重试

元素暂时没出现，可以等待；网络暂时失败，可以退避重试；权限被拒绝、参数不合法和目标状态冲突，则不应该重复点击。

```text
元素加载超时 → 重新观察 / 有限重试
网络 503 → 指数退避
权限不足 → 停止并提示用户
表单校验失败 → 读取错误并修正
提交结果未知 → 查询状态，不直接重提交
```

尤其是结果未知的提交。浏览器连接断开，不代表提交没有发生。重新点击可能产生重复订单、重复邮件或重复预约。需要使用业务状态查询或幂等键，而不是凭感觉重做。

## 九、高风险动作必须人工确认

删除、支付、发送、发布、权限变更和下载敏感文件，都应在动作前暂停：

```ts
type Confirmation = {
  actionHash: string
  target: string
  impact: string[]
  expiresAt: string
  approvedBy?: string
}
```

审批期间如果页面、参数或权限变化，`actionHash` 失效，需要重新确认。用户确认不能被 Agent 自己模拟，也不能因为任务超时就默认同意。

## 十、评测看任务结果和动作过程

浏览器 Agent 的基准集应包含页面变化、加载延迟、同名元素、弹窗、权限不足、用户改目标和高风险动作。指标至少包括：

- 任务成功率；
- 正确元素定位率；
- 非法动作率；
- 平均和 P95 步骤数；
- 恢复成功率；
- 重复副作用次数；
- 越权导航次数；
- 单次成功任务成本。

最终页面正确但中间发生越权，不能算成功；任务失败但安全停下，可以算一种可接受失败。指标要奖励谨慎和可恢复，而不是只奖励继续往下点。

## 总结：浏览器操作首先是状态管理

Computer Use 最容易被理解成“模型看截图，返回坐标”。真正做到可靠，需要状态机、语义观察、动作约束、条件等待、结果回读、导航策略、审批和恢复。坐标只是最后的执行细节，不能承担系统的全部判断。

我现在设计浏览器 Agent，会先问：当前页面是什么状态？这个动作针对的是哪一次观察？动作后如何证明结果发生？失败时能不能安全重试？如果提交结果未知，怎样查询而不是重复提交？

一个值得托付的浏览器 Agent，不是从不点错的 Agent，而是点错之前能发现状态不对，点错以后不会继续扩大，遇到不可逆动作会停下来让人确认。把浏览器当成一个会变化的外部世界，把每次操作当成可能产生后果的状态转换，Agent 才会从“会操作网页”走向“能够可靠地完成浏览器任务”。
