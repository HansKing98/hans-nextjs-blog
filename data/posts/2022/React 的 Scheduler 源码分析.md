---
title: React 的 Scheduler 源码分析
date: 2022-07-25 16:15:37
tags:
  [React, Source Code, Scheduler]  
---
故事背景

React 的任务调度让我对 Scheduler 模块产生了兴趣。

设计思路

- 分析任务优先级。
- 理解时间分片。
- 伪代码

js

```js
function scheduleTask(task) {
  if (isHighPriority(task)) {
    performSync(task);
  } else {
    requestIdleCallback(() => performAsync(task));
  }
}
``` 