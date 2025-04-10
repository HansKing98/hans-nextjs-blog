---
title: React 的 Hooks 调度机制
date: 2022-11-10 09:50:32
tags:
  [React, Source Code, Hooks]  
---

故事背景

Hooks 的顺序调用让我好奇其调度原理。

设计思路

- 分析 Hook 链表。
- 理解更新逻辑。
- 伪代码

js

```js
let currentHook = null;
function mountHook() {
  currentHook = { memoizedState: null, next: null };
}
``` 