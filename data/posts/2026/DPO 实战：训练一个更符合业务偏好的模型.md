---
title: DPO 实战：训练一个更符合业务偏好的模型
date: 2024-08-18 10:00:00
tags:
  - AI
  - LLM
  - DPO
  - 微调
  - 偏好优化
summary: DPO 把“哪个回答更好”的偏好数据直接用于模型优化，不需要单独训练奖励模型。本文从数据构造、chosen/rejected、损失直觉、训练流程与评测讲起。
categories:
  - 人工智能
  - 技术教程
---

{/*
 * [INPUT]: 依赖 SFT、偏好数据、DPO、参考模型、LoRA 微调与语言模型评测概念
 * [OUTPUT]: 对外提供 DPO 的偏好数据格式、训练流程、损失直觉、数据质量与上线评测方法
 * [POS]: 大模型工程系列的偏好优化实战文章，承接 DPO 原理，服务后续 RAG、安全与 Agent 工程主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# DPO 实战：训练一个更符合业务偏好的模型

“这个回答虽然正确，但太啰嗦；那个回答短一些，引用也更清楚。”在真实产品里，我们经常能判断两个回答哪个更好，却很难把这份判断写成一个精确分数。DPO 的吸引力就在这里：它直接使用偏好对，让模型学习“在同一个问题下，应该更倾向哪种回答”。

我第一次准备 DPO 数据时，以为最难的是改训练代码，结果发现真正费时间的是标注。一个好的偏好对，不是简单地把长答案放在 `chosen`、短答案放在 `rejected`；它应该体现明确、稳定、可解释的业务偏好。否则模型学到的可能不是“更有帮助”，而是“写得更长”“多说免责声明”或“使用某种固定套话”。

DPO 也不是不用奖励。它只是把奖励比较隐含在偏好关系里，避免单独训练和部署一个奖励模型。数据质量、参考模型、KL 约束、训练超参数和独立评测，仍然决定最后模型会变好还是变得更会迎合。

## 一、先回顾 SFT 和 RLHF 的位置

SFT 使用“问题—理想回答”样本，让模型模仿示范。它适合教格式、语气和基本任务流程，但一个理想回答通常只有一个版本，模型很难知道为什么另一个版本更差。

RLHF 通常会收集人类偏好，训练奖励模型，再用 PPO 等方法优化语言模型。它表达能力强，却需要维护奖励模型、策略模型、参考模型和价值估计，训练链路较重。

DPO 的基本路线更直接：

```text
同一个问题 x
   ├─ chosen：人类更喜欢的回答 y+
   └─ rejected：人类不喜欢的回答 y-
                 ↓
          直接优化偏好概率
                 ↓
           得到新策略模型
```

它不要求我们为每个回答标一个绝对分数，只要求在同一问题下比较哪一个更符合目标。相对判断往往比绝对打分稳定，也更容易让标注者保持一致。

## 二、偏好数据格式很简单，数据含义不简单

最常见的数据结构包括 Prompt、chosen 和 rejected：

```ts
type PreferenceExample = {
  prompt: string
  chosen: string
  rejected: string
  source: 'human' | 'expert' | 'model' | 'synthetic'
  criteria: string[]
  confidence?: number
  metadata?: {
    task: string
    language: string
    risk: 'low' | 'medium' | 'high'
  }
}
```

一个合格偏好对要满足几个条件：两个回答真正针对同一个问题，优劣差异与目标有关，差异足够清晰，答案没有混入无关的身份、时间或数据泄露，标注理由能够被复核。

```json
{
  "prompt": "如何申请退款？",
  "chosen": "请先在订单页提交退款申请。符合条件的订单通常会在 3—5 个工作日内处理，具体以页面状态为准。",
  "rejected": "退款当然可以申请，下面我会从背景、流程、注意事项和各种可能情况详细说明……",
  "criteria": ["直接回答", "包含时效", "避免无关展开"]
}
```

这里的 `rejected` 不一定是完全错误，它可能只是没有达到当前业务对简洁和完整的平衡。偏好训练不应该把一个可接受回答当成垃圾，否则模型会被推向过于保守的单一风格。

## 三、偏好标注最容易出现什么问题

### 把长度当质量

长回答更容易包含信息，也更容易包含重复和幻觉。如果标注者总选择更长的一边，模型会学会扩写，而不是学会解决问题。评测时要把准确性、相关性、证据和长度分开看。

### 把语气当事实

更自信、更流畅的回答容易赢得偏好，即使它没有证据。高风险任务应该把事实和引用放在明确标准里，不能只凭读起来舒服做选择。

### 偏好标准互相冲突

一批数据要求简洁，另一批数据奖励完整长文；一批数据要求拒答，另一批又把谨慎回答标成无帮助。训练前要把标准写成任务级 rubric，并检查不同标注者的一致性。

### 负样本太差

如果 `rejected` 永远是乱码、答非所问或明显恶意，模型只学会区分极端好坏，无法学会真实产品中细微的质量差异。高价值数据应该包含“看起来不错但有具体缺陷”的负样本。

## 四、DPO 的损失直觉

DPO 的核心目标，是让偏好回答相对于拒绝回答的概率差距变大，同时参考模型约束策略不要漂移太远。常见形式可以简化理解为：

```text
logit
= β × [
    log πθ(y+ | x) - log πref(y+ | x)
  - log πθ(y- | x) + log πref(y- | x)
]

loss = -log sigmoid(logit)
```

不用被公式吓住。白话解释就是：如果新模型更喜欢 `chosen`，而参考模型没有同样明显的偏好，优化方向就是正确的；如果新模型反而更喜欢 `rejected`，就要调整。参考模型像一根缰绳，防止策略为了少量偏好数据而忘掉原本的语言能力。

`β` 控制偏好强度和参考约束之间的平衡。太大可能让模型过度追随偏好，太小则变化很弱。不同任务、数据规模和基础模型需要实验，不应把某个教程里的数值当成固定答案。

## 五、训练前先处理 Token 和截断

偏好训练一条样本包含 Prompt、chosen 和 rejected，长度可能比 SFT 更大。要分别统计三者 Token，并明确截断策略：

```ts
type TokenBudget = {
  maxPromptTokens: number
  maxChosenTokens: number
  maxRejectedTokens: number
  maxTotalTokens: number
}

function fitPreferenceExample(
  item: PreferenceExample,
  budget: TokenBudget,
) {
  const prompt = truncate(item.prompt, budget.maxPromptTokens)
  const chosen = truncate(item.chosen, budget.maxChosenTokens)
  const rejected = truncate(item.rejected, budget.maxRejectedTokens)
  return { prompt, chosen, rejected }
}
```

不能只截断回答末尾，因为结论和引用可能正好在那里；也不能只保留末尾而丢掉问题约束。高质量管道要记录截断率，把被截断的高风险或关键样本单独处理。`chosen` 和 `rejected` 的截断方式也要保持可比，否则模型可能只学会识别长度。

## 六、一个简化的训练流程

DPO 训练可以拆成清晰的阶段：

```text
收集问题与两个候选回答
          ↓
人工 / 专家 / 验证器比较偏好
          ↓
清洗、去重、脱敏、检查冲突
          ↓
划分训练集、验证集和隐藏测试集
          ↓
加载策略模型与冻结参考模型
          ↓
计算 chosen / rejected 的序列概率
          ↓
优化偏好损失与参考约束
          ↓
离线评测、人工比较和灰度发布
```

伪代码如下：

```python
for batch in preference_loader:
    chosen_logp = policy.logprob(batch.prompt, batch.chosen)
    rejected_logp = policy.logprob(batch.prompt, batch.rejected)

    with torch.no_grad():
        ref_chosen_logp = reference.logprob(batch.prompt, batch.chosen)
        ref_rejected_logp = reference.logprob(batch.prompt, batch.rejected)

    relative = beta * (
        (chosen_logp - ref_chosen_logp)
        - (rejected_logp - ref_rejected_logp)
    )
    loss = -torch.nn.functional.logsigmoid(relative).mean()

    optimizer.zero_grad()
    loss.backward()
    clip_grad_norm_(policy.parameters(), 1.0)
    optimizer.step()
```

这只是帮助理解数据流的骨架。真实实现还要处理 padding、序列 mask、分布式训练、混合精度、梯度累积、检查点和显存。参考模型通常冻结，不参与梯度更新；策略模型可以使用 LoRA，降低实验门槛。

## 七、LoRA 能降低成本，但不能降低评测要求

DPO 与 LoRA 结合很常见。LoRA 只训练低秩适配器，基础模型参数冻结，显存和存储压力较小，便于快速做多组偏好实验。

但参数少不代表数据可以随便。LoRA 可能让模型在训练任务上快速改变风格，也可能带来过拟合。要观察通用能力、拒答行为、工具调用格式、长上下文和多语言表现是否退化。

```text
基础模型 + 适配器 A：客服偏好
基础模型 + 适配器 B：代码审查偏好
基础模型 + 适配器 C：写作风格偏好
```

这种模块化方式适合按任务部署，但路由和版本管理要清楚。不要在不知道当前加载哪个适配器的情况下比较线上质量，否则实验结论没有意义。

## 八、DPO 训练中要盯哪些信号

训练 loss 下降只是一个信号，不能证明模型真的变好了。至少要看：

- 验证集偏好准确率或 pairwise accuracy。
- chosen 与 rejected 的概率差是否合理增长。
- 平均回答长度、重复率和拒答率。
- 事实准确率、引用正确率和结构化输出通过率。
- 通用能力回归、高风险样本和长输入表现。
- KL 距离、梯度范数和异常 loss。

```ts
type DpoReport = {
  pairwiseAccuracy: number
  chosenMargin: number
  avgOutputTokens: number
  repetitionRate: number
  refusalRate: number
  schemaPassRate: number
  generalCapabilityDelta: number
}
```

如果 pairwise accuracy 上升但回答越来越长，可能是长度偏好；如果 loss 很低但独立人工比较没有改善，可能是数据重复或训练集过拟合；如果模型变得极度谨慎，可能是拒答样本过多或偏好标准不平衡。

## 九、训练后评测必须包含“不可偏好的”样本

DPO 的训练数据往往只告诉模型哪个回答更好，测试时要检查它是否保持了不应该改变的能力。除了偏好测试集，还要加入：

1. 原始基础能力样本，检查是否遗忘。
2. 事实和引用样本，检查是否为了讨好而编造。
3. 无答案和越权样本，检查拒答边界。
4. 长输入和多轮对话，检查上下文稳定性。
5. 结构化输出和工具调用样本，检查接口兼容。

人工比较时，最好隐藏模型版本和名称，使用明确 rubric。模型 A 说得更像“客服”不等于它更准确；模型 B 更短也不等于它遗漏了重要条件。偏好评测要和业务结果联系起来。

## 十、如何处理矛盾偏好

数据中可能出现同一个问题，样本一把 `A > B`，另一把却是 `B > A`。这不一定是标注错误，也可能代表两个不同任务目标或上下文。处理前先检查：Prompt 是否真的相同，系统指令是否不同，评判标准是否变化，回答是否包含时间敏感内容。

```ts
type PreferenceConflict = {
  promptHash: string
  pairs: Array<{ chosen: string; rejected: string }>
  reason?: 'duplicate' | 'criteria_mismatch' | 'time_sensitive' | 'unknown'
}
```

无法解释的冲突样本宁可进入人工复核或从训练集中移除，也不要简单随机保留。模型面对互相矛盾的信号时，可能学会输出折中但没有用的回答。

## 十一、什么时候 DPO 不适合

如果任务的正确性可以由规则、计算或测试直接验证，先用确定性校验和 SFT 往往更简单。DPO 适合表达“两个都能用，但一个更符合偏好”的差异；它不适合替代权限系统、事实数据库或业务事务。

如果团队没有稳定的偏好标准、数据量太小、负样本随意、基础模型本身能力不足，DPO 可能只是在放大标注噪声。它也不能解决知识更新问题，实时信息应该交给检索或工具。

做 DPO 前先问：我们是否能稳定判断哪个回答更好？这种偏好是否能被评测？如果答案是否定的，先改任务定义和数据流程，不要急着跑训练。

## 十二、我的总结：偏好优化是在教模型“更像你的团队”

DPO 最有用的地方，是把很多难以写成绝对分数的业务判断，变成同题回答之间的比较。你可以教模型更简洁、更有证据、更符合格式、更谨慎，或者更适合某个专业场景，而不必先建立一套复杂的奖励模型。

但它也会忠实放大偏好数据里的偏差。标注者喜欢长答案，模型就变长；标注者偏爱自信语气，幻觉可能增加；拒答样本过多，模型会对正常问题也说不。`chosen` 和 `rejected` 不是两个随便填的字符串，而是你对“什么是好回答”的一份工程定义。

我现在做 DPO 实验，会先写 rubric，再做小批量标注和一致性检查；训练时保留冻结参考模型和独立验证集；训练后同时看偏好准确率、事实质量、长度、拒答和通用能力。只有当模型不仅更讨标注者喜欢，也更能完成真实任务时，优化才算成功。

模型训练最终还是在塑造行为。DPO 给了我们一条相对直接的路：把团队经验、用户反馈和业务标准沉淀成高质量偏好对，再用可重复的评测验证变化。把数据含义想清楚，把负样本选认真，把训练后的副作用看完整，模型才会更符合业务，而不是只学会更巧妙地迎合评分。
