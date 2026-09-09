---
title: RAG 数据管道：解析 PDF、网页与表格
date: 2024-09-29 10:00:00
tags:
  - AI
  - LLM
  - RAG
  - 数据工程
  - 文档解析
summary: RAG 的上限常常由数据管道决定，而不是由向量数据库决定。本文从 PDF、网页、表格的解析差异出发，设计清洗、切分、去重、权限元数据与增量索引流程。
categories:
  - 人工智能
  - 技术教程
---

{/*
 * [INPUT]: 依赖 RAG、PDF/网页/表格解析、文本清洗、切分、Embedding、元数据与索引概念
 * [OUTPUT]: 对外提供多格式文档进入 RAG 的数据管道设计、质量检查、权限继承与增量处理方法
 * [POS]: 大模型工程系列的 RAG 数据工程文章，承接 Hybrid Search 与 Reranker，服务后续 LLM 安全与生产 RAG 主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# RAG 数据管道：解析 PDF、网页与表格

很多 RAG Demo 的流程都长这样：读取文件，切成几段，生成向量，放进数据库。文章演示到这里通常已经足够漂亮，用户问一句，模型也能给出一个看起来相关的答案。

真正接入企业资料后，麻烦往往发生在向量数据库之前。PDF 的标题和正文顺序被打乱，网页把导航、广告和正文混在一起，表格被解析成一串没有行列关系的文字，扫描件根本没有文本层。模型不是没有能力，它只是拿到了一份已经被数据管道破坏过的教材。

我研究 RAG 失败案例时越来越确定：检索系统的上限，常常由入库时保留了什么决定。Embedding 再好，也救不回被截断的表头；Reranker 再强，也无法凭空恢复 PDF 两栏排版；模型再聪明，也不应该猜一张表中金额到底属于哪一行。

所以文档管道不是一个“预处理脚本”，而是知识库的基础设施。它要保留结构、标记来源、处理权限、记录版本，并且能告诉我们一段召回文本究竟来自原文哪里。

## 一、先承认：不同格式不是同一种文档

```text
PDF：视觉布局优先，文本顺序可能不可靠
网页：内容与导航、广告、脚本混杂
表格：关系和坐标比句子顺序更重要
扫描件：需要 OCR，识别结果带有不确定性
```

如果所有输入都直接调用 `extractText()`，只是把复杂性藏起来，后面会在检索和生成阶段集中爆发。管道的第一步应该是识别文档类型、来源、语言、是否有文本层、是否包含表格和访问权限。

```ts
type SourceDocument = {
  id: string
  uri: string
  mimeType: string
  contentHash: string
  tenantId: string
  accessPolicy: string
  version: string
  updatedAt: string
}

type ParsedDocument = {
  source: SourceDocument
  blocks: DocumentBlock[]
  warnings: string[]
}

type DocumentBlock = {
  id: string
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image' | 'code'
  text: string
  order: number
  locator?: { page?: number; bbox?: number[]; url?: string }
}
```

`DocumentBlock` 比一整段纯文本更有价值。它保留了内容类型和定位信息，后面可以按标题切分、对表格单独处理，也可以在回答中提供页码、坐标或 URL。

## 二、PDF：先处理布局，再处理文本

PDF 不是“带扩展名的 Word”。它更接近一张描述文字和图形位置的画布。读取 PDF 时，文本可能按绘制顺序返回：页眉、右栏、左栏、页脚互相穿插；表格可能只剩下单个数字；扫描 PDF 甚至没有任何可复制文本。

一个可靠的 PDF 管道要先判断：

1. 是否存在可用文本层。
2. 页面是单栏、双栏还是复杂版式。
3. 是否有表格、脚注、页眉页脚和图片。
4. OCR 是否必要，识别语言是什么。
5. 原文页码和坐标能否保留。

```text
PDF
 ↓
文本层检测
 ├─ 有文本 → 布局分析 → 段落 / 标题 / 表格
 └─ 无文本 → OCR → 置信度检查 → 结构恢复
```

页眉页脚是最常见的噪声来源。它们在每一页重复，会污染向量空间，让检索结果因为相同的公司名或免责声明聚在一起。清洗时可以根据位置、重复频率和版式规则识别，但不能简单删除所有短文本，因为有些短标题正是关键内容。

表格不要贸然压平成一句话。至少保留表头、行号、列名和单元格关系：

```text
表名：2024 年度预算
列：部门 | 预算 | 已使用 | 剩余
行：研发 | 100 | 60 | 40
行：销售 | 80  | 75 | 5
```

如果必须转成文本供 Embedding 使用，也要生成带字段名的行级描述，避免模型只看到 `100 60 40` 而不知道每个数字属于什么含义。原始表格结构应同时保存，方便精确查询和引用。

OCR 结果要带置信度。金额、日期、负号和小数点识别错误很常见，不能把低置信字段和普通正文视为同等可信。高风险文档应该抽样人工复核，或者使用专用解析器重新校验关键字段。

## 三、网页：正文只是页面的一小部分

网页解析最容易得到“能读但不能搜”的结果。导航栏、Cookie 提示、推荐文章、评论、脚本和广告都可能混在正文里。它们不仅增加 Token，还会把无关词汇写进向量，降低真正内容的召回质量。

网页管道至少要处理：

- 主体正文识别和导航噪声移除。
- 标题层级、列表、引用、代码块和图片说明保留。
- URL、网页标题、发布时间和作者写入元数据。
- 重定向、动态渲染、分页和登录权限明确处理。
- 内容变化时通过哈希或版本检测增量更新。

```ts
type WebMetadata = {
  canonicalUrl: string
  title: string
  author?: string
  publishedAt?: string
  capturedAt: string
  language?: string
  contentHash: string
}

function normalizeWebBlock(block: DocumentBlock) {
  return {
    ...block,
    text: block.text.replace(/\\s+/g, ' ').trim(),
    locator: { ...block.locator },
  }
}
```

不要把网页中的指令当成系统指令。外部页面可能含有 Prompt Injection，入库时可以做风险标记，但生成阶段仍要把它当作不可信数据。文档解析负责还原内容，不负责授予权限。

网页还有时效性问题。新闻、价格、政策和 API 文档会变化，元数据中要记录抓取时间和有效期。用户问“当前规则”时，检索系统需要知道哪一版内容更新，而不是把多年以前的页面和最新页面混在一起。

## 四、表格：关系比自然语言更重要

表格是 RAG 最容易被低估的输入。普通文本切分器按字符或段落工作，无法理解合并单元格、跨行表头、空值和列之间的关系。把表格转换成连续字符串，模型可能读到所有数字，却无法知道它们的坐标。

建议先把表格表示成结构化数据，再生成面向检索的文本：

```ts
type TableDocument = {
  title?: string
  headers: string[]
  rows: Array<Record<string, string | number | null>>
  source: { page?: number; sheet?: string }
}

function rowToText(table: TableDocument, row: Record<string, unknown>) {
  return table.headers
    .map((header) => `${header}：${row[header] ?? '空值'}`)
    .join('；')
}
```

行级文本适合语义检索，结构化数据库适合精确聚合。问题“研发部门剩余预算是多少”可以先用字段和过滤器查询，再让模型组织语言；不要让模型从几十行数字中自己做没有校验的加法。

表格切分时要把表头复制到每个相关片段，并保留单位、时间范围和筛选条件。`12` 可能是 12 元、12 人或 12%，如果单位被切掉，召回再准确也会生成错误答案。

## 五、切分：不是越小越好，也不是越大越完整

切分的目标是让一个片段足以支持一个具体问题，同时不把太多无关内容带进上下文。按固定字符数切分简单，但可能把标题和解释拆开；按语义切分更自然，却需要处理过长段落和异常格式。

```text
文档
 ├─ 章节标题
 │   ├─ 段落 A
 │   ├─ 列表 B
 │   └─ 表格 C
 └─ 下一章节
```

可以采用层级切分：先按标题分章节，再在章节内按段落或句子限制长度。每个 chunk 带上祖先标题，生成的文本类似：

```text
文档：员工手册
章节：请假制度 > 年假
正文：正式员工每年享有……
```

这样即使片段脱离原文，也不会完全失去语境。重叠窗口可以减少边界丢信息，但重叠太大将重复计费、降低检索多样性。参数不能凭感觉固定，应该用评测集比较召回和生成效果。

```ts
type Chunk = {
  id: string
  sourceId: string
  text: string
  headingPath: string[]
  tokenCount: number
  startOffset: number
  endOffset: number
  contentHash: string
}
```

`startOffset` 和 `endOffset` 让结果可以回到原文；`headingPath` 帮助生成上下文；`contentHash` 帮助增量处理。不要用数组下标作为稳定身份，文档前面插入一段话时，后面的所有下标都会变化。

## 六、清洗要克制：噪声和信息不能一锅端

常见清洗包括 Unicode 规范化、空白合并、重复页眉删除、HTML 标签处理和乱码修复。但每一步都可能删除有价值的信息。版本号、代码缩进、表格单位和法律限定词，不能因为“看起来不整齐”就删掉。

清洗函数最好产生警告和统计：去掉了多少字符、多少块低置信 OCR、多少表格、多少空段落。异常文档进入人工检查队列，不要静默吞掉。

```ts
type CleaningReport = {
  inputBlocks: number
  outputBlocks: number
  removedCharacters: number
  warnings: string[]
  ocrLowConfidenceFields: number
}
```

同一份文档既要保留原始文件，也要保存清洗后的中间表示。这样出现召回问题时，可以判断是解析错、清洗错、切分错还是 Embedding 错。只保存最终向量，相当于把最重要的证据销毁了。

## 七、去重和版本：避免知识库里有十个“同一份答案”

网页抓取、文件上传和同步任务经常会把同一内容写入多次。重复 chunk 会让检索结果看起来很稳定，实际上只是同一份答案被返回多遍，还会浪费 Embedding 和存储成本。

可以使用规范化文本哈希做精确去重，使用相似度或 MinHash 发现近似重复。去重时不要丢掉来源和权限信息；两个内容相同的文档可能属于不同租户或拥有不同有效期。

```ts
type IndexIdentity = {
  sourceId: string
  sourceVersion: string
  parserVersion: string
  chunkerVersion: string
  embeddingVersion: string
  contentHash: string
}
```

只要解析器、切分器或 Embedding 版本变化，旧索引就可能需要重建。知识库应该支持索引版本和别名切换，先构建、校验，再让线上读流量切到新版本，避免更新到一半时新旧片段混杂。

## 八、权限元数据必须跟着每个 chunk 走

文档级权限如果在切分时丢失，后面再补很危险。每个 chunk 都应该继承来源文档的租户、访问组、密级、有效期和删除状态。检索时在数据库或索引层过滤，不能先把全库结果交给模型，再要求模型“不要使用不该看的内容”。

```ts
type AccessMetadata = {
  tenantId: string
  visibility: 'public' | 'internal' | 'restricted'
  allowedGroups: string[]
  expiresAt?: string
  deletedAt?: string
}
```

权限变化时，要能够快速更新索引或过滤条件。删除请求也要有完整链路：源文件删除、解析产物删除、chunk 下线、缓存失效和检索验证。向量库里残留一份已经撤销权限的文本，是非常严重的问题。

## 九、质量检查要在入库时就发生

不要等用户问错了，才发现某份 PDF 从头到尾没有解析出正文。入库管道应该有质量门禁：

- 文本长度是否合理，是否几乎全是乱码。
- 标题、段落和表格数量是否符合预期。
- OCR 低置信字段是否超过阈值。
- chunk 是否为空、过短或异常重复。
- 权限和来源元数据是否完整。
- Embedding 数量是否与有效 chunk 数一致。

```ts
type IngestionCheck = {
  passed: boolean
  score: number
  failures: Array<{ code: string; message: string }>
}

function checkParsedDocument(document: ParsedDocument): IngestionCheck {
  const failures: Array<{ code: string; message: string }> = []
  if (document.blocks.length === 0) {
    failures.push({ code: 'EMPTY_DOCUMENT', message: '没有解析出有效内容' })
  }
  if (document.warnings.length > 20) {
    failures.push({ code: 'TOO_MANY_WARNINGS', message: '解析警告过多，需要人工检查' })
  }
  return { passed: failures.length === 0, score: 1 - failures.length * 0.2, failures }
}
```

质量门禁不是要阻止所有异常文档，而是让异常变得可见。低质量文档可以进入隔离区或标记为低置信来源，不应该静默地成为模型答案的依据。

## 十、增量处理：文档变化时只做必要工作

每次全量解析和向量化在数据少时很方便，数据增长后会带来高成本和长时间空窗。使用源文档哈希、解析器版本、切分器版本和 Embedding 版本，可以判断哪些内容真正需要更新。

```text
扫描源文件
   ↓
比较 sourceId + contentHash + pipelineVersion
   ├─ 未变化 → 跳过
   ├─ 内容变化 → 重新解析、切分、向量化
   ├─ 管道变化 → 受影响文档重建
   └─ 已删除 → 下线 chunk、清理缓存
```

任务要有 `pending`、`processing`、`succeeded`、`failed` 状态和重试次数。某个坏 PDF 不应该阻塞全库；Embedding 服务短暂失败，也不应该让已完成的批次重跑。构建新索引后先抽样检索和比较统计，再切换线上别名。

## 十一、如何评测管道是否真的变好了

解析质量不能只看“成功处理了多少文件”。准备一组带标准答案和相关片段的样本，分别评测：文档结构恢复、表格字段准确率、OCR 关键字段、Recall@K、引用定位和最终回答忠实性。

修改切分器后，召回率可能提高但上下文变长；修改清洗规则后，噪声减少但关键限定词可能丢失。每次变化都要同时看质量、Token、延迟和成本。

```ts
type PipelineReport = {
  parserVersion: string
  chunkerVersion: string
  recallAt5: number
  citationAccuracy: number
  malformedChunkRate: number
  avgContextTokens: number
  ingestCost: number
}
```

线上失败样本要回流到测试集。尤其保留“模型答错但召回看似相关”的案例，它们能帮助我们判断是文档结构、切分边界、权限过滤还是生成阶段出了问题。

## 十二、我的总结：RAG 的第一模型是数据管道

RAG 文章常把注意力放在向量数据库、Embedding 和 Prompt 上，但真正决定系统能不能回答好的，往往是更早发生的事情：PDF 的两栏有没有被正确还原，网页的导航有没有被清掉，表格的列名有没有跟着数字走，权限有没有继承到每个 chunk，版本变化能不能被追踪。

我现在设计文档管道，会坚持保存原始文件、结构化中间块、清洗报告、chunk 定位、权限元数据和版本信息。这样出了问题，团队可以沿着链路追溯，而不是面对一段孤零零的向量猜原因。

不同格式要用不同解析策略，切分要服务问题而不是追求固定长度，清洗要克制，质量检查要前移，增量更新要可恢复，权限过滤要发生在检索层。把这些基础工作做好，后面的 Reranker 和大模型才有真正发挥的机会。

RAG 不是把文件扔进向量数据库，而是把一份复杂、会变化、带权限的现实资料，转换成模型可以检索、系统可以验证、人类可以追溯的知识单元。数据管道越认真，模型越不必靠猜；这可能是所有 RAG 工程经验里最朴素、也最容易被忽略的一条。
