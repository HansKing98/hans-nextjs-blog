---
title: React 的 Reconciliation 过程
date: 2022-06-03 13:25:19
tags:
  [React, Source Code, Reconciliation]  
---

故事背景

React 的高效更新依赖于 Reconciliation，我研究了它的 diff 算法。

设计思路

- 分析 key 的作用。
- 理解 diff 的优化策略。
- 核心逻辑（伪代码）

js

```js
function reconcile(oldFiber, newElement) {
  if (oldFiber.type === newElement.type) {
    updateFiber(oldFiber, newElement.props);
  } else {
    replaceFiber(oldFiber, newElement);
  }
}
``` 