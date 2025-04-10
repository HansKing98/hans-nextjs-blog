---
title: React Fiber 架构初探
date: 2022-03-25 09:15:33
tags:
  [React, Source Code, Fiber]  
---
故事背景

React 16 的 Fiber 架构让我对 React 的渲染机制产生了好奇。我通过阅读源码了解了 Fiber 的基本概念。

设计思路

- 分析 Fiber 节点结构。
- 理解任务调度原理。
- 简述 Fiber 的优点。
- Fiber 节点示例（伪代码）

js

```js
const fiber = {
  tag: 'HostComponent',
  type: 'div',
  stateNode: domNode,
  child: null,
  sibling: null,
  return: parentFiber,
};
```

2. 核心概念

Fiber 是 React 的工作单元，通过链表结构实现任务的拆分和优先级调度。
