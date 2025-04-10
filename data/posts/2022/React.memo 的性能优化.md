---
title: React.memo 的性能优化
date: 2022-07-14 09:30:11
tags:
  [React, Performance, Memoization]  
---

故事背景

组件重复渲染影响性能，我用 React.memo 优化了项目。

设计思路

- 使用 React.memo 包裹组件。
- 自定义比较函数。
- 示例

tsx

```tsx
const MemoComponent = React.memo(
  ({ value }: { value: number }) => <div>{value}</div>,
  (prevProps, nextProps) => prevProps.value === nextProps.value
);
``` 