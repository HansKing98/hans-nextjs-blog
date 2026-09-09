---
title: 多模态 Agent：让模型读图、读表、读屏幕
date: 2026-05-19 10:00:00
tags:
  - AI
  - LLM
  - 多模态
  - Agent
  - Computer Use
  - top
summary: 多模态 Agent 不只是把图片作为 Prompt 附件，还要处理图像、表格和屏幕状态，完成工具调用，并验证视觉理解是否真的支持了下一步动作。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖视觉语言模型、图像预处理、表格解析、屏幕理解、工具调用与状态校验概念
 * [OUTPUT]: 对外提供多模态 Agent 读取图像、表格、屏幕并执行可靠任务的设计方法
 * [POS]: 大模型工程系列的多模态智能体文章，承接软件工程 Agent，服务后续实时语音主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# 多模态 Agent：让模型读图、读表、读屏幕

文字 Agent 已经让很多人产生了一个错觉：只要把图片传给模型，它就能像人一样看懂一切。第一次演示往往也很有说服力，一张发票上传以后，模型准确读出了金额；一张网页截图发过去，它说出了按钮在哪里；一张表格交给它，它还能总结趋势。

真正做成 Agent 后，难度马上上升。

图片可能被压缩，表头可能跨两行，屏幕上有弹窗遮住按钮，模型还可能看见了正确内容，却给出一个不存在的坐标。更麻烦的是，视觉理解一旦出错，后续工具调用会把错误放大：点击了错误的按钮，提交了错误的表单，或者把一张图里的数字当成了另一列。

我后来总结，多模态 Agent 的核心不是“让模型看见”，而是让它把视觉证据转换成可以验证的状态，再决定是否行动。看图是输入，理解是推断，执行是副作用，三者必须分开。

## 一、先区分三类多模态任务

### 1. 视觉问答

用户问“这张图里有什么”“这份发票金额是多少”，模型只需要生成答案。这类任务的风险相对低，但仍然要注意分辨率、文字识别和置信度。

### 2. 视觉结构化

把图片或表格转换成 JSON、Markdown 或数据库字段，例如抽取发票号、日期、金额和税率。它要求输出稳定，不能只看描述是否流畅。

### 3. 视觉行动

模型读取屏幕状态，再调用点击、输入、滚动或提交工具。这已经不是普通问答，因为每个动作都可能修改外部系统。Agent 必须知道当前状态、目标状态和动作执行后的结果。

```text
视觉输入
  ↓
结构化观察
  ↓
任务计划
  ↓
工具动作
  ↓
重新观察
  ↓
状态是否达到目标？
```

这条“观察—行动—再观察”循环比一次性生成一串点击坐标可靠得多。屏幕会变化，页面会加载，弹窗会出现，动作结果必须重新确认。

## 二、图像预处理决定模型能不能看清

不要把原始图片直接无脑发给模型。预处理至少要考虑方向、尺寸、压缩、裁剪和敏感信息。

```ts
type ImageInput = {
  bytes: Uint8Array
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  width: number
  height: number
  purpose: 'ocr' | 'layout' | 'general'
}

function prepareImage(input: ImageInput) {
  const oriented = fixExifOrientation(input)
  const resized = resizeWithinLimit(oriented, {
    maxWidth: 2048,
    maxHeight: 2048,
  })
  return redactSensitiveRegions(resized)
}
```

尺寸太小，文字读不清；尺寸太大，Token 和延迟上升。对于票据和表格，整图缩放后可能丢掉关键数字，更好的方法是先识别布局，再对疑似区域裁剪放大。对于屏幕操作，保留浏览器窗口和控件的整体关系比只裁剪一个按钮更重要。

图片方向也不能靠猜。手机照片的 EXIF 方向可能和像素方向不一致，模型看到的文字会横过来；截图中的浏览器缩放比例、设备像素比也会影响坐标映射。输入处理要把这些信息统一掉，别把问题留给模型。

## 三、表格不能只当成一张图片

一张表格截图里，模型可以大致看懂内容，但很容易在合并单元格、负数、千分位、小数和跨页表头上出错。只要原始文件能拿到，优先读取结构化数据：Excel 用工作表和单元格，CSV 用列名和行记录，PDF 则结合文本层和版面分析。

可以给模型一个带坐标的中间表示：

```ts
type TableCell = {
  row: number
  column: number
  rowSpan: number
  columnSpan: number
  text: string
  bbox?: [number, number, number, number]
}

type Table = {
  headers: TableCell[]
  cells: TableCell[]
  sourcePage?: number
}
```

中间表示的价值在于可校验。每个金额可以转成数字后重新求和，日期可以检查格式，列总计可以和原表对比。如果模型说“本季度收入增长 18%”，程序应该有机会根据抽取的数据重新计算，而不是只相信一句话。

对于复杂表格，可以让模型先输出表格结构，再输出字段值，分两步完成；也可以先用专门 OCR 和版面模型提取，再让语言模型负责解释。一个模型包办所有工作很方便，但出了错很难定位。

## 四、结构化输出要有证据和校验

视觉抽取的输出应该包含来源位置，而不只是字段值：

```json
{
  "total": {
    "value": 12800.5,
    "rawText": "¥12,800.50",
    "page": 1,
    "bbox": [412, 728, 590, 764]
  }
}
```

`rawText` 和 `bbox` 可以帮助人工复核，也能在模型读错时定位问题。数值字段不要直接接受自然语言结果，必须经过类型和范围校验：金额不能是 NaN，税率不能超过合理范围，发票日期不能晚于当前业务允许的时间。

```ts
function validateInvoice(invoice: Invoice) {
  if (!Number.isFinite(invoice.total)) return false
  if (invoice.total < 0) return false
  if (invoice.taxRate < 0 || invoice.taxRate > 1) return false
  return invoice.items.every((item) => item.quantity >= 0)
}
```

校验失败时，系统应该请求重新识别、展示原图让人确认，或转给人工，而不是为了让流程继续而自动把异常值修成一个“看起来正常”的数字。

## 五、屏幕理解的关键是状态，不是坐标

Computer Use 类 Agent 不能只依靠截图坐标。窗口大小、缩放比例、响应式布局和弹窗都会让坐标失效。更稳妥的观察结果应该同时包含截图和可访问性树、DOM 信息或控件语义：

```ts
type ScreenState = {
  url?: string
  title?: string
  viewport: { width: number; height: number; scale: number }
  elements: Array<{
    id: string
    role: string
    name: string
    enabled: boolean
    bounds?: [number, number, number, number]
  }>
  screenshotHash: string
}
```

如果页面里有一个名称为“提交”的按钮，优先使用稳定的元素标识或语义定位；只有在没有其他信息时，才把截图坐标作为候选。执行前要检查按钮是否仍然存在、是否可用、页面 URL 是否正确。

动作也应该是有限集合，而不是让模型直接生成任意脚本：

```ts
type ScreenAction =
  | { type: 'click'; elementId: string }
  | { type: 'type'; elementId: string; text: string }
  | { type: 'scroll'; direction: 'up' | 'down'; amount: number }
  | { type: 'wait'; ms: number }
```

涉及支付、删除、发送消息、提交表单的动作必须停下来请求人工确认。模型看见一个按钮，不代表它有权替用户按下去。

## 六、Agent 要知道什么时候自己不确定

视觉模型的置信度经常不够可靠。可以综合多个信号：OCR 结果是否稳定，两个裁剪区域的识别是否一致，结构化校验是否通过，屏幕元素是否存在，动作后的状态是否符合预期。

```ts
function shouldEscalate(result: VisionResult) {
  return (
    result.schemaValid === false ||
    result.confidence < 0.85 ||
    result.conflictingEvidence ||
    result.actionRisk === 'high'
  )
}
```

升级不是失败。看不清时重新拍一张，表格冲突时请人确认，按钮状态不明时停止操作，这些都是可靠系统的表现。最危险的 Agent 不是经常说“不知道”，而是每次都很肯定地做下一步。

## 七、评测多模态 Agent 要测整条链路

不要只评测“图片描述像不像”。至少准备四类指标：

- 识别准确率：文字、数字、类别和位置是否正确。
- 结构化成功率：JSON 是否符合 Schema，字段是否完整。
- 任务成功率：从输入到目标状态是否真正完成。
- 安全失败率：错误识别后是否执行了不该执行的高风险动作。

测试集要覆盖低分辨率、遮挡、倾斜、深色模式、不同屏幕尺寸、弹窗、加载中和权限不足等情况。对于屏幕操作，不能只保存最终截图，还应该记录每一步观察、动作和结果，方便复盘 Agent 是从哪一步开始误判的。

## 八、我最后留下的工程原则

多模态 Agent 的系统提示词可以写得很长，但真正可靠性来自外部约束：图像预处理统一，表格有结构化中间层，字段有类型校验，屏幕操作使用语义定位，动作后重新观察，高风险动作需要确认，所有步骤都有 Trace。

我以前以为“让模型看懂图片”就已经很难了，后来发现更难的是不让它在看错时继续自信地行动。视觉输入天然有模糊、遮挡和歧义，优秀的系统不是假装这些问题不存在，而是把不确定性显式传递给下一步决策。

总结起来，图片是证据，结构化状态是判断基础，工具动作是需要承担后果的决定。多模态 Agent 只有在这三者之间建立了清楚的边界，才不只是一个会描述图片的模型，而是一个能够读懂现实、谨慎行动、发现错误并及时停下来的工程系统。
