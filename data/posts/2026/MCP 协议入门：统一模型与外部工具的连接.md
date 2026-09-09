---
title: MCP 协议入门：统一模型与外部工具的连接
date: 2025-05-25 10:00:00
tags:
  - AI
  - LLM
  - MCP
  - Agent
  - 协议
summary: 从 Host、Client、Server 三层结构出发，理解 MCP 如何统一模型与外部工具的连接，并用 TypeScript 骨架走通一次工具发现与调用。
categories:
  - 人工智能
  - Agent
---

{/*
 * [INPUT]: 依赖 MCP 的 Host、Client、Server、JSON-RPC、Tools、Resources 与 Prompts 概念
 * [OUTPUT]: 对外提供 MCP 协议的架构解释、消息流程、TypeScript 入门骨架与安全边界
 * [POS]: 大模型工程系列的 MCP 协议入门文章，承接 Agent 与 Tool Calling，服务后续 MCP Server 实战
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */}

# MCP 协议入门：统一模型与外部工具的连接

前段时间我连续试了几个 Agent 框架。它们都能调用工具：一个框架把天气查询写成 `tool`，另一个框架把数据库查询包成 `function`，还有一个框架要求你实现一套自定义插件接口。单独看，每个方案都能跑；真正把它们放在一起，麻烦就来了。

同一个搜索能力，要为不同的模型、不同的 Agent 宿主重复接入。参数 Schema 要重写，错误格式要重写，权限判断也要重写。工具一多，连接代码比业务代码还抢戏。那一刻我意识到，Agent 生态缺的未必是更多工具，而是一种大家都能说的“工具语言”。

MCP，也就是 Model Context Protocol，解决的正是这类连接问题。它不是一个更大的 Prompt 模板，也不是一个自动让模型变聪明的框架。它更像 USB：设备本身各不相同，但只要遵守接口，主机就有机会识别和使用它。理解这一点很重要——协议负责把边界说清楚，业务系统仍然要负责正确性、安全和可恢复性。

## 一、先记住三层：Host、Client、Server

MCP 最容易让初学者混淆的地方，是“模型”和“Server”并不是一回事。一个典型的连接关系可以画成这样：

```text
┌──────────────────────────────┐
│ Host：聊天应用 / IDE / Agent  │
│  ┌──────────┐   ┌──────────┐  │
│  │ MCP      │   │ MCP      │  │
│  │ Client A │   │ Client B │  │
│  └────┬─────┘   └────┬─────┘  │
└───────┼──────────────┼────────┘
        │              │
        ▼              ▼
   文件 Server      博客 Server
```

Host 是用户正在使用的应用，例如桌面聊天客户端、代码编辑器或企业内部 Agent。Host 负责管理模型会话、展示结果、决定什么时候询问用户确认，也负责创建和管理一个或多个 MCP Client。

Client 是 Host 里的一条协议连接。它知道如何与某个 MCP Server 完成初始化、发现能力、发送请求和接收通知。一个 Host 可以同时连接文件系统 Server、数据库 Server 和博客搜索 Server，但每条连接通常有自己的会话和权限边界。

Server 则是能力提供者。它可以是本地进程，也可以是远程服务，向 Client 暴露工具、资源或提示模板。Server 不应该假设自己能直接控制模型，更不应该把“模型一定会怎样调用我”当成安全前提。

这三层分开以后，很多设计问题就变得清楚了：模型负责决定是否需要能力，Host 负责用户交互和策略，Server 负责执行能力并重新校验权限。任何一层都不应该把自己的职责偷偷推给另一层。

## 二、MCP 暴露的不是只有工具

很多介绍 MCP 的文章只讲 Tools，这很容易把协议理解窄。实际设计时，至少要区分三类能力。

### 1. Tools：让模型发起动作

Tool 是可调用的函数，例如搜索博客、查询订单、创建日历事件。它一般有名称、描述、输入 Schema 和调用结果。Tool 可能产生副作用，所以创建、删除、发送、付款这类操作不能只因为“模型调用成功”就直接执行，通常需要用户确认或额外策略。

### 2. Resources：让应用读取上下文

Resource 更接近一个可读取的地址，例如某篇文章、一个配置文件或数据库中的只读记录。它强调“读取什么”，不等同于“执行什么”。把一份文档作为 Resource 暴露出来，和提供一个任意 SQL Tool，是完全不同的风险等级。

### 3. Prompts：复用交互模板

Prompt 可以把一套经过验证的任务模板暴露给 Host，例如“总结这份代码的风险”或“根据当前文档生成发布说明”。它不是把系统提示词偷偷塞给模型，而是让 Host 和用户能够发现、选择和填充一套明确的模板。

我在实践中最看重的是这三个词的边界：读取用 Resource，执行用 Tool，复用任务结构用 Prompt。边界清楚，权限、审计和用户确认才有落脚点；所有能力都塞进 Tool，最后一定会变成一把过宽的万能钥匙。

## 三、一次工具调用到底发生了什么

MCP 通常使用 JSON-RPC 风格的消息来表达请求、响应和通知。你不需要一开始就背完所有方法，但应该看懂一条完整链路：

```text
1. Client 连接 Server
2. Client 发送 initialize，声明协议版本与客户端能力
3. Server 返回自己的协议版本与服务能力
4. Client 发送 initialized 通知
5. Client 请求 tools/list
6. Server 返回工具名称、描述与 inputSchema
7. 模型决定调用某个工具
8. Host 通过 Client 发送 tools/call
9. Server 校验参数、身份、权限并执行
10. Server 返回结构化结果，Host 再交给模型或用户
```

这里有两个经常被忽略的事实。

第一，`tools/list` 是能力发现，不是权限授予。Server 把一个工具列出来，不代表当前用户就有权执行它；真正调用时必须再次检查身份、租户、资源范围和风险等级。

第二，工具结果不是“模型说了算”的文本。返回内容最好包含明确的结构、来源和错误类型，让 Host 能够决定是继续推理、展示引用、请求确认，还是停止任务。只返回一段模糊字符串，后面很难审计。

## 四、一个最小的 TypeScript Server 骨架

下面的代码故意不绑定某个 SDK。先把协议层和业务层分开，之后换 SDK、换传输方式，业务函数仍然可以复用。

```ts
type SearchInput = {
  query: string
  limit?: number
}

type SearchResult = {
  title: string
  url: string
  snippet: string
}

const tools = {
  search_blog: {
    description: '搜索公开发布的博客文章，只读，无副作用',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
    },
  },
}

async function searchBlog(input: SearchInput): Promise<SearchResult[]> {
  const query = input.query.trim()
  if (!query) throw new Error('query 不能为空')

  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20)
  return blogIndex.searchPublicPosts(query, limit)
}

async function handleToolCall(name: string, args: unknown) {
  if (name !== 'search_blog') {
    throw new Error(`未知工具：${name}`)
  }

  // 这里还应接入 JSON Schema 校验与可信连接上下文中的权限检查。
  const input = args as SearchInput
  const results = await searchBlog(input)

  return {
    content: [{ type: 'text', text: JSON.stringify(results) }],
    structuredContent: { results },
    isError: false,
  }
}
```

这段代码还不是完整的 MCP Server，因为真正的 Server 还需要传输层、初始化处理、`tools/list` 和 `tools/call` 的协议映射。但它先把最重要的分界线展示出来了：工具描述是协议元数据，搜索函数是业务能力，调用处理器是边界层。

如果把这三块揉成一个大函数，后续加鉴权、超时、审计和测试时就会很痛苦。协议适配器应该薄，业务函数应该可独立测试，安全策略应该有明确入口。这不是为了追求“架构漂亮”，而是因为工具一旦接入模型，错误会被自动放大。

## 五、传输方式不是小细节

本地 Server 常见的方式是通过标准输入输出与 Host 通信。它的优点是启动简单、权限容易绑定到本机进程；缺点是进程生命周期、日志污染和环境变量管理需要格外小心。尤其不要把调试日志随意写到 stdout，否则协议消息和日志混在一起，Client 看到的就不再是合法数据。

远程 Server 则需要考虑 HTTP、鉴权、连接复用、超时和断线重连。远程连接的好处是能力可以集中维护，坏处是攻击面和运维责任都会增加。无论使用哪种传输方式，超时、取消和请求 ID 都应该是设计的一部分。一个永远不结束的工具调用，会把整个 Agent 循环拖死。

我的建议是：本地原型先用最简单的传输跑通初始化、列工具和调用；准备共享给团队时，再补上身份认证、速率限制、审计日志和版本兼容。不要在第一天就做一个“万能远程平台”，那通常意味着还没有把真正的能力边界想明白。

## 六、MCP 不会自动替你解决安全问题

MCP 统一了连接方式，却没有替你判断一个工具是否值得调用。至少要认真处理下面几件事：

- 工具描述不能夸大能力，尤其不能把“只读搜索”描述成“可以访问所有数据”。
- 参数必须做 Schema 校验、长度限制和业务规范化，不能相信模型生成的每个字段。
- 身份和权限要从可信连接上下文获得，不能由模型在参数里自报家门。
- 有副作用的动作要区分预览和执行，必要时要求用户明确确认。
- 结果要带来源、版本和请求 ID，便于回放和审计。
- 对外部内容保持不信任，网页、文档和工具返回值都可能包含 Prompt Injection。
- Server 要设置超时、取消和幂等键，避免重试造成重复写入。

尤其要记住：工具调用链越长，越不能只在入口做一次鉴权。用户权限、租户范围和资源状态可能在执行前已经变化，关键操作需要在真正写入前再次确认。

## 七、我研究完 MCP 后留下的判断

我一开始以为 MCP 的价值是“让更多工具接入模型”。后来实际看了几套 Server，又自己拆了一遍消息流程，结论变了：MCP 真正重要的地方，是它迫使我们把能力写成可发现、可描述、可校验、可审计的接口。

这件事听起来朴素，却正是 Agent 从 Demo 走向系统的分水岭。以前我们常把工具调用写在 Prompt 旁边，模型知道一点，代码知道一点，权限又藏在另一个中间件里。出了问题，大家只能互相猜。协议化之后，至少可以明确回答：有哪些能力、输入是什么、谁能调用、返回什么、失败如何表达。

但协议不是魔法。它不能替你设计好数据库，也不能阻止模型误解业务，更不能替你承担高风险操作的责任。一个糟糕的万能 Server，即使披上 MCP 的外衣，仍然是糟糕的系统；一个职责单一、权限清楚、结果可追踪的 Server，哪怕只提供一个搜索工具，也已经是很好的开始。

如果你准备学习 MCP，我建议按这个顺序动手：先实现一个只读 Tool，再观察 `initialize` 和能力发现；接着增加 Resource 和引用；然后加入超时、错误分类和权限测试；最后才考虑远程部署和多 Server 编排。每一步都要能回答“它允许什么、拒绝什么、失败后怎么办”。

当模型开始调用你的工具时，你就不再只是写一个函数，而是在设计一条由模型、应用和真实世界共同参与的执行边界。边界越清楚，系统越可靠；边界越含糊，所谓智能越容易变成自动化事故。
