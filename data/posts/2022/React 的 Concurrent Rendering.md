---
title: React 的 Concurrent Rendering
date: 2022-11-24 11:15:53
tags:
  [React, Source Code, Concurrent]  
---

故事背景

React 18 的并发渲染提升了性能，我研究了其原理。

设计思路

- 分析优先级调度。
- 理解过渡更新。
- 示例

tsx

```tsx
startTransition(() => setState(newValue));
``` 