---
title: useState 的实现原理
date: 2022-04-15 11:10:57
tags:
  [React, Hooks, Source Code]  
---

故事背景

useState 是最常用的 Hook，我通过源码探索了它的工作机制。

设计思路

- 分析 Hook 的存储机制。
- 理解状态更新的流程。
- 伪代码

js

```js
let hookStates = [];
let cursor = 0;

function useState(initialValue) {
  const currentCursor = cursor++;
  hookStates[currentCursor] = hookStates[currentCursor] || initialValue;
  const setState = (newValue) => {
    hookStates[currentCursor] = newValue;
    rerender();
  };
  return [hookStates[currentCursor], setState];
}
``` 