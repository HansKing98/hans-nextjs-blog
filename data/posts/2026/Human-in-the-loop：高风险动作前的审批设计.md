---
title: Human-in-the-loop：高风险动作前的审批设计
date: 2025-08-03 10:00:00
tags:
  - AI
  - LLM
  - Agent
  - Human-in-the-loop
  - 安全设计
summary: 高风险 Agent 动作不能只依赖模型判断，需要通过风险分级、清晰预览、人工确认、参数锁定、超时处理与审计建立可靠的人机协作边界。
categories:
  - 人工智能
  - 安全实践
---

{/*
 * [INPUT]: 依赖 Agent 工具调用、风险分级、用户确认、权限、审计与工作流状态管理知识
 * [OUTPUT]: 对外提供高风险 Agent 动作的人机协作、审批流程、确认界面与审计设计方法
 * [POS]: 大模型工程系列的 Agent 安全文章，承接 Agent 失败模式，服务后续 Agent 评测主题
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# Human-in-the-loop：高风险动作前的审批设计

“需要人工确认”很容易写进产品需求，也很容易被做成一个没有意义的按钮。Agent 准备删除 200 个文件，界面只显示“是否继续”；用户不知道文件是什么、为什么删、能不能恢复，最后只能凭感觉点击确认。另一个系统则在用户确认以后重新规划了一遍，参数已经变了，用户确认的其实不是最后执行的那件事。

我见过这种流程以后，开始把人工确认当成一种安全协议，而不是 UI 装饰。Agent 可以帮助收集信息、生成计划和准备参数，但真正产生副作用的动作，需要让人看见具体影响，并且确认的内容必须和最终执行严格对应。

Human-in-the-loop 的目的不是让人替模型点击每一步，而是在不可逆、高风险或不确定的节点，把决定权交还给人。

## 一、先给动作做风险分级

风险不能只按工具名称判断。同一个“发送消息”工具，发送给自己和发送给一万个客户，风险完全不同；同一个“更新数据库”操作，修改测试记录和修改支付状态，也不是一个级别。

```ts
type ActionRisk = {
  reversibility: 'reversible' | 'partially_reversible' | 'irreversible'
  dataSensitivity: 'public' | 'internal' | 'sensitive'
  affectedUsers: number
  financialImpact: number
  externalCommunication: boolean
}
```

可以根据动作的不可逆程度、影响人数、数据敏感度、金额和外部传播范围计算风险等级，但高风险规则最好有明确的硬条件：删除、付款、权限变更、公开发布和跨租户访问默认需要更高等级审批。

## 二、确认前先生成可审查的计划

不要只让 Agent 说“我准备执行这个操作”。它应该给出对象、参数、来源、预计影响和失败处理：

```ts
type ApprovalRequest = {
  approvalId: string
  taskId: string
  action: string
  target: string
  parameters: Record<string, unknown>
  reason: string
  evidence: string[]
  impact: string[]
  rollback?: string
  expiresAt: string
}
```

例如删除文件时，展示文件列表、总大小、来源规则、是否有备份和无法恢复的部分；发送邮件时展示收件人数量、主题、正文摘要和附件；修改权限时展示当前权限、目标权限和受影响用户。

计划不是执行。系统要在审批通过后冻结关键参数，防止 Agent 在等待期间重新规划，再执行一组不同的动作。

## 三、确认必须绑定具体版本

审批对象应该有内容哈希或版本号：

```ts
const approvalHash = hash({
  action,
  target,
  parameters,
  evidenceVersion,
})
```

执行前重新计算并比较。如果目标文件、收件人列表、金额、权限或证据已经变化，就让审批失效，重新生成预览。不能让用户确认了“给 A 发 100 元”，系统实际却执行了“给 A 和 B 各发 100 元”。

这也是处理并发变化的关键。审批等待期间，另一个管理员可能已经修改了资源；版本不一致时，正确动作是暂停，而不是假设旧计划仍然安全。

## 四、确认界面要讲人话

用户不是来审查 JSON 的。界面应该先说结论和影响，再提供细节：

```text
即将发送一封邮件给 238 位客户
原因：通知活动延期
附件：活动说明.pdf（1 个）
不可撤回：发送后无法保证收件人未阅读

[查看完整收件人] [取消] [确认发送]
```

按钮不能使用模糊文字，例如“继续”“执行一下”。确认动作要明确写出动词和对象。高风险操作可以要求二次确认、输入资源名称或选择明确的审批人，但不要通过一堆无意义弹窗制造确认疲劳。

如果动作影响很多对象，默认展示数量、范围和异常项。用户应该能快速发现“目标不是我以为的那一批”。

## 五、谁来确认是权限问题

不是“有人点击了确认”就够了。审批人必须具备处理该动作的权限，不能让普通用户替管理员批准权限变更，也不能让 Agent 自己模拟一个审批。

```ts
function canApprove(user: User, request: ApprovalRequest) {
  return (
    user.roles.some((role) => request.allowedRoles.includes(role)) &&
    !user.id.startsWith('agent-') &&
    request.tenantId === user.tenantId
  )
}
```

对于高影响动作，可以要求双人审批、职责分离或特定角色确认。审批人和执行人是否可以是同一个人，要按风险决定。所有授权判断都必须在服务端完成，不能相信前端传来的 `approved: true`。

## 六、审批状态要进入任务状态机

审批不能只是一个弹窗状态。任务需要明确记录：

```text
running → waiting_approval
waiting_approval → approved → executing → succeeded
                 ├─→ rejected
                 └─→ expired
```

```ts
type ApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'executing'
  | 'completed'
```

用户拒绝后，Agent 应该停止当前高风险动作，或者根据产品规则生成替代计划；不能默默换一种方式执行同样的事情。审批过期后需要重新检查证据和参数，不能沿用旧批准。

## 七、等待期间也要处理取消和变化

用户可能在审批等待时取消任务，资源可能被别人修改，权限也可能被撤销。执行前必须重新检查：

- 审批是否仍然有效；
- 当前用户权限是否仍然存在；
- 目标资源版本是否一致；
- 风险评估是否发生变化；
- 幂等键是否已经执行过。

```ts
async function executeApproved(request: ApprovalRequest) {
  assertApprovalIsValid(request)
  await assertResourceVersion(request.target, request.targetVersion)
  await assertPermission(request.approver, request.action)
  return tool.execute({
    ...request.parameters,
    idempotencyKey: request.approvalId,
  })
}
```

“用户刚刚确认过”不是永久权限。确认只对一组具体、短期有效的参数负责。

## 八、审批和自动化要有分层策略

不是所有动作都需要人工。低风险、可逆、影响范围小的动作可以自动完成；中风险动作可以批量确认；高风险动作需要逐项确认或双人审批。

```text
低风险：读取、搜索、生成草稿 → 自动
中风险：修改少量内部数据 → 用户确认
高风险：付款、删除、公开发布 → 强确认 / 双人审批
```

分层能避免人工确认疲劳。如果 Agent 每次读取一个文件都弹窗，用户最终会习惯性点击确认，真正危险的动作反而得不到注意。把人的注意力留给不可逆和高影响节点，协作才有效。

## 九、审计记录要能还原决定

审批记录至少包含请求内容、预览版本、审批人、时间、来源设备、执行结果和失败原因：

```ts
type ApprovalAudit = {
  approvalId: string
  taskId: string
  requestedBy: string
  approvedBy?: string
  actionHash: string
  decision: 'approved' | 'rejected' | 'expired'
  decidedAt?: string
  executedAt?: string
  result?: string
}
```

审计日志本身也要保护，不能让普通用户看到其他租户的审批内容。高敏感参数可以脱敏，但要保留足够信息让授权人员复核。发生争议时，团队应该能回答“用户当时看到了什么、确认了什么、系统最终执行了什么”。

## 十、用故障和误操作测试审批流程

不要只测用户点击确认的顺利路径。至少测试：

- 用户确认后参数发生变化；
- 两个审批人同时操作；
- 审批链接过期；
- 用户权限在等待期间被撤销；
- 工具执行超时但外部动作可能已发生；
- Agent 在被拒绝后尝试绕过审批；
- 客户端重复提交确认。

这些测试要验证状态机、幂等、权限和审计是否一致。一个“确认按钮点了两次却发了两封邮件”的问题，本质不是前端防抖，而是审批执行没有幂等保护。

## 总结：把决定权交给人，也要把信息交给人

Human-in-the-loop 最容易被做成“模型说要做，人点一下就行”。真正有效的人机协作需要更严格：先分级风险，再生成清晰计划；审批绑定具体参数和版本；执行前重新检查权限、资源和幂等；状态可过期、可拒绝、可撤销；最终留下完整审计。

我现在看到一个“需要人工确认”的需求，会继续问：人到底确认了什么？影响范围是否看得见？等待期间变化怎么办？拒绝以后 Agent 会不会换路绕过？执行结果能否证明和预览一致？

人不是自动化系统的橡皮图章。好的 Agent 会把复杂信息整理成可以判断的选项，把低风险重复劳动自动完成，把真正不可逆的决定交还给有权限的人。确认不是为了让系统免责，而是为了让人拥有知情、选择和停止的能力。
