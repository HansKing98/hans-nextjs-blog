# 2026/
> L2 | 父级: /CLAUDE.md

成员清单
大模型发展史与100篇技术学习写作计划.md: 2023—2026 大模型技术路线图，包含 100 个教程选题与建议发布时间
Agent 是什么：模型、工具、状态与循环.md: Agent 的模型、工具、状态与决策循环基础
多智能体协作：什么时候值得拆成多个 Agent.md: 多智能体拆分判断、协作模式与失败恢复设计
Tool Calling 的可靠性：Schema、重试与幂等.md: 工具调用的 Schema、错误分类、重试与幂等设计
ReAct Agent：从搜索工具开始实现智能体.md: ReAct 计划、行动、观察循环与最小 Agent 实现
MCP 协议入门：统一模型与外部工具的连接.md: MCP Host、Client、Server 架构与工具调用协议入门
MCP Server 实战：为博客暴露搜索工具.md: 以博客搜索为例实现可被 Agent 调用的 MCP Server
Computer Use：浏览器操作的状态机设计.md: 浏览器操作型 Agent 的状态机、观察与动作闭环
Agent Memory：短期记忆、长期记忆与用户画像.md: Agent 记忆分层、提取、召回与用户画像设计
Agent 失败模式：循环、幻觉、工具误用与失控.md: Agent 常见失败模式、检测信号与恢复策略
Human-in-the-loop：高风险动作前的审批设计.md: 高风险 Agent 动作的用户确认、审批与审计
Agent 评测：任务成功率、轨迹质量与成本.md: Agent 任务结果、执行轨迹与资源成本评测
BrowserGym 与任务型 Agent 基准测试.md: 浏览器任务型 Agent 的基准测试与实验设计
vLLM 推理服务：PagedAttention 与吞吐优化.md: vLLM 推理服务、PagedAttention 与吞吐优化
KV Cache：LLM 推理为什么会被显存卡住.md: KV Cache 的内存占用、复用与推理性能
Continuous Batching 与服务并发.md: 连续批处理、请求调度与推理服务并发
Speculative Decoding：用小模型加速大模型.md: 投机解码的验证流程、加速条件与工程权衡
FlashAttention：注意力计算的 IO 优化.md: FlashAttention 的分块计算与显存访问优化
量化实践：GPTQ、AWQ、GGUF 如何选择.md: GPTQ、AWQ、GGUF 量化格式与部署选择
2025 年总结：从 Copilot 到可执行 Agent.md: 2025 年推理模型、Agent 与推理基础设施总结
从模型选型到能力路由：建立自己的 Model Gateway.md: 统一模型调用、路由策略与降级机制
LLM 网关设计：统一鉴权、限流、重试与审计.md: 面向生产环境的 LLM 网关实现
结构化生成的终极实践：JSON Schema 与类型安全.md: 结构化输出与运行时校验
LLM-as-a-Judge：自动评审的偏差与校准.md: 自动化模型评测与裁判校准
构建黄金数据集：让评测从感觉变成证据.md: 高质量评测集的设计与维护
Prompt 版本管理与回归测试.md: Prompt 工程化与回归测试
生产级 RAG：离线评测、在线监控与增量索引.md: RAG 生产系统的完整闭环
多租户 AI 应用：隔离数据、配额和检索权限.md: 多租户 AI 系统设计
AI 应用的隐私保护：脱敏、留存与数据边界.md: AI 数据安全与隐私工程
版权与训练数据：工程师需要知道的边界.md: AI 项目版权与数据合规实践
小模型路线：蒸馏、剪枝与任务专用模型.md: 小模型优化技术总览
Model Distillation 实战：把大模型能力压缩下来.md: 知识蒸馏训练实践
On-device AI：端侧推理的性能与隐私权衡.md: 端侧模型部署与优化
AI Coding Agent 的代码库理解与补丁生成.md: 代码智能体的上下文与补丁工作流
软件工程 Agent：从 Issue 到可审查 Pull Request.md: 软件工程智能体设计
多模态 Agent：让模型读图、读表、读屏幕.md: 多模态输入编排
实时语音 Agent：延迟预算与打断处理.md: 实时语音智能体架构
长任务 Agent：检查点、恢复与幂等执行.md: 长任务智能体的可靠执行
AI 系统成本核算：Token、GPU、存储与人工成本.md: AI 系统成本模型
AI 系统的 SLO：质量、延迟、可用性与安全.md: AI 服务等级目标设计
从零搭建 LLM 应用 CI：测试、评测与发布门禁.md: LLM 应用持续集成
读论文方法：如何拆解一篇大模型论文.md: 大模型论文阅读方法
复现论文的工程方法：环境、数据、指标与误差.md: 论文复现工程流程
大模型发展史总复盘：从生成文本到可执行系统.md: 2023—2026 技术演进总结
100篇之后怎么继续：建立个人 AI 技术雷达.md: 个人 AI 技术跟踪、筛选与持续学习系统

法则: 成员完整·一行一文件·父级链接·技术词前置
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
