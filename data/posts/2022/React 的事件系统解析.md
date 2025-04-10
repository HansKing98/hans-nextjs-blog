---
title: React 的事件系统解析
date: 2022-07-07 14:50:28
tags:
  [React, Source Code, Events]  
---
故事背景

React 的事件委托机制让我很好奇，我通过源码了解了它的事件处理流程。

设计思路

- 分析事件绑定。
- 理解合成事件。
- 核心逻辑（伪代码）

js

```js
function dispatchEvent(event) {
  const syntheticEvent = createSyntheticEvent(event);
  bubbleEvent(syntheticEvent, fiber);
}
``` 