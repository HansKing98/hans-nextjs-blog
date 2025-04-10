---
title: useEffect 的依赖数组解析
date: 2022-06-18 15:35:42
tags:
  [React, Hooks, Source Code]  
---
故事背景

useEffect 的依赖数组让我踩过不少坑，我通过源码搞清楚了它的运行机制。

设计思路

- 分析依赖比较逻辑。
- 理解清理函数的调用时机。
- 示例

tsx

```tsx
useEffect(() => {
  console.log('Effect');
  return () => console.log('Cleanup');
}, [value]);
``` 