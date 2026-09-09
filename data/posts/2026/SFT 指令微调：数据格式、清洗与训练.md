---
title: SFT 指令微调：数据格式、清洗与训练
date: 2024-07-21 10:00:00
tags:
  - AI
  - LLM
  - SFT
  - 微调
  - 数据工程
summary: SFT 的难点往往不在启动训练，而在判断是否需要微调、构造一致的对话数据、清洗冲突样本、正确计算 loss，并用独立测试集证明模型没有退化。
categories:
  - 人工智能
  - 技术教程
---

{/*
 * [INPUT]: 依赖预训练模型、Tokenizer、对话模板、SFT、LoRA、训练数据与模型评测概念
 * [OUTPUT]: 对外提供 SFT 的任务判断、数据格式、清洗、训练流程、损失 Mask 与回归评测方法
 * [POS]: 大模型工程系列的指令微调实战文章，承接 LoRA 与 QLoRA，服务后续偏好优化主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# SFT 指令微调：数据格式、清洗与训练

SFT，也就是监督式指令微调，是很多人真正开始“训练自己的模型”时接触的第一步。工具越来越成熟以后，启动一次训练并不难：准备 JSONL，选择基础模型，跑一段命令，几个小时后就能拿到一个新权重。

真正困难的是，训练结束后模型到底学会了什么。它可能学会更符合业务的回答格式，也可能只记住训练集；可能客服语气变好了，却失去了原本的推理能力；可能训练 loss 很漂亮，线上一遇到不同措辞就完全失效。

我第一次做 SFT 时，把注意力全放在学习率和显存上。后来复盘失败样本才发现，根因是数据本身：相同问题有互相矛盾的答案，系统指令格式不一致，测试集和训练集高度重复，长样本还在关键答案前被截断。模型没有背叛训练目标，它只是非常认真地学习了我们给它的混乱。

所以这篇文章不从启动命令开始，而从一个更重要的问题开始：什么时候该微调，以及一份训练数据怎样才配得上模型花掉的计算。

## 一、先判断问题是不是真的需要 SFT

下面几类问题适合考虑 SFT：

- 希望模型稳定遵守一种输出格式或任务流程。
- 某个领域有大量高质量示范，Prompt 已经很难覆盖。
- 需要让小模型学习一项窄任务，降低推理成本。
- 希望统一语气、术语和回答结构。

下面的问题通常不该先用 SFT：

- 知识需要频繁更新：优先 RAG 或工具查询。
- 权限控制不可靠：应该修服务端鉴权。
- JSON 偶尔格式错误：先尝试结构化输出和 Schema 校验。
- 只有几十条质量不稳定的数据：先改善 Prompt 和评测。
- 业务规则必须百分百执行：用确定性代码而不是让模型记忆。

```text
问题是知识更新？→ RAG / Tool
问题是权限与规则？→ 代码和策略引擎
问题是稳定行为与风格？→ 评估 SFT
```

微调会把行为写进参数，更新和回滚都比改 Prompt 慢。能在系统层解决的问题，不要为了“拥有自己的模型”而训练。

## 二、SFT 数据的基本形式

最简单的单轮指令格式包括 instruction、input 和 output：

```json
{
  "instruction": "将用户问题分类",
  "input": "我的订单为什么还没发货？",
  "output": "物流查询"
}
```

多轮对话通常表示为消息数组：

```json
{
  "messages": [
    { "role": "system", "content": "你是订单客服助手。" },
    { "role": "user", "content": "订单 ORD-102 什么时候发货？" },
    { "role": "assistant", "content": "我需要先查询该订单的物流状态。" }
  ]
}
```

训练前要使用目标模型对应的聊天模板，把角色、分隔符和结束 Token 转换成模型熟悉的格式。不同模型的模板可能不同，随意复制另一个模型的特殊 Token，会让训练和推理输入不一致。

```ts
type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

type SftExample = {
  id: string
  messages: ChatMessage[]
  source: string
  task: string
  quality: number
}
```

`source` 和 `quality` 应该从一开始就保存。人工专家、线上反馈、模型生成和公开数据的可信度不同，发生质量问题时需要能够回溯。

## 三、输入输出边界必须一致

如果训练数据一部分把系统指令放在 `system`，另一部分把它拼进 `user`，模型会学到不一致的角色边界。工具调用数据也要统一：工具名、参数 Schema、结果角色和最终回答格式不能每批都不同。

```text
一致的数据模板：
system → 用户任务 → assistant 工具提议 → tool 结果 → assistant 最终回答
```

训练和推理使用相同模板尤其重要。训练时有结束 Token，部署时忘了添加，模型可能一直生成；训练时只对 assistant 部分计算 loss，部署时却把工具结果当作模型输出格式，行为会偏离预期。

每种任务最好有一个数据构造器和 Schema，不要让标注者自由拼 JSON：

```ts
function validateExample(example: SftExample) {
  if (!example.id || example.messages.length < 2) return false
  const last = example.messages.at(-1)
  if (!last || last.role !== 'assistant') return false
  if (example.messages.some((message) => !message.content.trim())) return false
  return true
}
```

格式校验只是第一层，内容质量还需要更细的规则和人工检查。

## 四、清洗：模型会把脏数据学得很认真

清洗至少要处理：空样本、乱码、重复、模板污染、敏感信息、相互矛盾答案、错误引用和过长样本。

### 去重

完全相同的样本可以按哈希去重，近似重复可以使用文本相似度或 MinHash。重复样本会放大某一类表达，导致模型过拟合固定措辞。

### 冲突检查

相同或近似输入对应不同答案时，要判断是多解、时间变化还是标注错误。无法解释的冲突应进入人工复核，不能随机保留。

### 敏感信息

手机号、邮箱、访问令牌、内部地址和真实用户数据必须脱敏。不要因为训练环境在内网，就默认模型权重不会记忆和复述敏感内容。

### 模型生成数据

合成数据可以扩大规模，但要使用独立验证器、去重和人工抽样。模型生成的错误会被新模型再次学习，形成错误循环。

```ts
type CleaningReport = {
  inputCount: number
  outputCount: number
  duplicates: number
  conflicts: number
  sensitiveItems: number
  malformed: number
  tooLong: number
}
```

清洗报告应该进入数据版本记录。训练结果变了，首先要知道数据集到底删了什么、加了什么，而不是只看代码提交。

## 五、数据划分要防止“换句话说的泄漏”

随机按行切分训练集和测试集，常常会让同一模板、同一用户会话或同一文档的近似样本分散到两边。测试分数因此很高，模型面对真正的新问题却失效。

更合理的划分方式包括：按用户、文档、时间、主题或数据来源分组。比如同一份合同生成的所有问答必须放在同一侧；未来数据只放测试集，检验时间泛化。

```text
训练集：模型可以学习
验证集：调学习率、轮数和停止点
测试集：只用于最终报告，不参与调参
```

还要保留一份隐藏回归集，覆盖高风险、无答案、越权和通用能力。训练集越大，越容易不小心把公开测试题混进去，数据溯源比追求样本数量更重要。

## 六、长度和截断要在训练前算清楚

每条样本进入 Tokenizer 后，长度分布可能和字符数完全不同。代码、中文、特殊符号和表格的 Token 比例各不相同。训练前统计 P50、P95、最大长度和截断比例：

```ts
type LengthStats = {
  p50: number
  p95: number
  max: number
  truncatedRate: number
}

function inspectLengths(examples: SftExample[], tokenize: (text: string) => number[]) {
  return examples.map((example) =>
    tokenize(renderWithChatTemplate(example.messages)).length,
  )
}
```

截断可能把用户问题保留，却把 assistant 的最终答案切掉；也可能删掉 system 的关键约束。应该按角色和任务设计策略，而不是简单保留前 N 个 Token。

长样本会显著增加显存和训练时间。可以使用长度分桶、packing 和梯度累积提高利用率，但要确保不同样本之间的 loss mask 不串行污染。

## 七、loss 到底应该算在哪些 Token 上

很多 SFT 任务只希望模型学习 assistant 输出，而不希望它学习预测 user 的问题和 system 指令。此时要对非 assistant Token 设置 `-100` 或相应 ignore index，让 loss 只计算目标部分。

```text
system tokens      → 不计 loss
user tokens        → 不计 loss
assistant tokens   → 计 loss
padding tokens     → 不计 loss
```

```python
labels = input_ids.clone()
labels[~assistant_mask] = -100
loss = model(input_ids=input_ids, labels=labels).loss
```

如果 mask 错位，模型可能学习复述用户输入、预测系统提示或在错误位置生成特殊 Token。训练前随机打印几条 token、角色和 label 对齐结果，是非常值得做的检查。

对于多轮对话，可以只训练最后一轮 assistant，也可以训练所有 assistant 回合，取决于任务目标。策略要写清楚并版本化，不能让数据处理脚本默认决定。

## 八、一个简化的训练配置

```ts
type SftConfig = {
  baseModel: string
  datasetVersion: string
  maxSequenceLength: number
  learningRate: number
  epochs: number
  batchSize: number
  gradientAccumulationSteps: number
  warmupRatio: number
  useLora: boolean
  seed: number
}

const config: SftConfig = {
  baseModel: 'base-model-v1',
  datasetVersion: 'support-sft-v3',
  maxSequenceLength: 4096,
  learningRate: 2e-5,
  epochs: 2,
  batchSize: 2,
  gradientAccumulationSteps: 16,
  warmupRatio: 0.03,
  useLora: true,
  seed: 42,
}
```

具体数值不能照抄。学习率、轮数、LoRA rank 和 batch 大小与模型、数据规模和硬件有关。训练开始前先跑一个很小子集，确认 loss 下降、数据格式正确、保存和加载正常，再扩大规模。

固定随机种子有助于比较，但 GPU 和分布式训练仍可能存在非确定性。每次实验要记录代码、数据、依赖、模型和配置版本，否则结果无法复现。

## 九、训练过程中看什么

不要只盯训练 loss。至少同时看训练和验证 loss、梯度范数、学习率、Token 吞吐、显存、截断率和固定样本生成结果。

```text
训练 loss 降，验证 loss 升 → 可能过拟合
训练与验证都不降 → 数据、模板或学习率可能有问题
生成越来越长 → 结束 Token 或长度分布要检查
固定样本格式变好但事实变差 → 目标偏移
```

每隔一定步数保存检查点，并使用同一组 Prompt 生成对比。早停要基于验证指标和任务质量，而不是单纯训练轮数。小数据集训练太多轮，通常很快把样本措辞记住。

## 十、训练完成后先做离线回归

评测应该分层：

- 目标任务：格式、准确率、完成率和拒答质量。
- 通用能力：原模型擅长的问答、推理、代码和多语言。
- 安全边界：隐私、越权、危险请求和 Prompt Injection。
- 工程指标：输出长度、Token、延迟、显存和吞吐。

```ts
type SftReport = {
  taskAccuracy: number
  schemaPassRate: number
  refusalAccuracy: number
  generalCapabilityDelta: number
  avgOutputTokens: number
  p95LatencyMs: number
}
```

基线必须包含未微调基础模型，以及只改 Prompt 的方案。SFT 如果只比一个很差的 Prompt 好，没有证明训练值得。还要进行人工盲评，隐藏模型名称和版本，避免先入为主。

## 十一、部署时不要忘记训练模板

上线服务必须使用与训练一致的聊天模板、特殊 Token、停止条件和最大长度。LoRA 适配器要记录对应的基础模型版本，不能随意加载到另一个同名但权重不同的模型。

```text
基础模型版本
 + Tokenizer 版本
 + Chat Template 版本
 + Adapter 版本
 + 推理参数
= 一个可复现的部署版本
```

灰度发布时按版本记录质量、延迟和用户反馈。出现回归要能快速切回基础模型或旧适配器。模型权重上线不代表结束，线上失败样本要经过脱敏和复核，再进入下一轮数据迭代。

## 十二、什么时候训练算成功

训练 loss 下降不算成功，模型能复述训练样本也不算成功。真正的成功是：目标任务在独立数据上有稳定提升，通用能力没有不可接受退化，安全边界没有被破坏，成本和延迟符合预算，而且结果能在重复实验中复现。

如果目标任务只提高一点，却增加大量维护和部署成本，也要诚实判断是否值得。Prompt、RAG、小模型分类器和规则系统有时更简单，训练不是产品成熟度的勋章。

## 十三、我的总结：SFT 是数据工程，不只是训练工程

SFT 看起来发生在 GPU 上，真正决定结果的工作大多发生在 GPU 之前：是否选对任务，数据是否一致，冲突是否处理，敏感信息是否清除，训练测试是否真正隔离，聊天模板和 loss mask 是否正确。

我现在开始一个 SFT 项目，会先用小数据跑完整闭环：构造、清洗、划分、训练、加载、评测和回滚。每一步都能解释后，再扩大数据和模型。这样看起来慢一点，却比训练结束后才发现模板错了更省时间。

模型不会理解我们“真正想要什么”，它只会从数据和目标函数里寻找规律。训练数据里什么被重复、什么被奖励、什么被忽略，最后都会进入模型行为。把每条样本当成一条产品规则来审视，把每次训练当成一次可回滚的软件发布，SFT 才会从一次昂贵实验，变成能够持续积累业务能力的工程流程。
