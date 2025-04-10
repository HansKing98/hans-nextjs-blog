---
title: React 的 Fiber Root 解析
date: 2022-11-03 14:25:49
tags:
  [React, Source Code, Fiber]  
---

故事背景

Fiber Root 是 React 渲染的起点，我研究了它的作用。

设计思路

- 分析 Fiber Root 的创建。
- 理解渲染流程。
- 伪代码

js

```js
const fiberRoot = {
  current: hostRootFiber,
  containerInfo: domContainer,
};
``` 