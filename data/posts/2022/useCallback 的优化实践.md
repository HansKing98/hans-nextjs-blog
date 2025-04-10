---
title: useCallback 的优化实践
date: 2022-08-27 10:35:18
tags:
  [React, Hooks, Performance]  
---

故事背景

函数重复创建影响性能，我用 useCallback 优化了代码。

设计思路

- 使用 useCallback 缓存函数。
- 分析依赖项。
- 示例

tsx

```tsx
const handleClick = useCallback(() => console.log(value), [value]);
``` 