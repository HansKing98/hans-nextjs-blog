---
title: 前端性能优化：React Lazy Loading
date: 2024-11-20 17:30:41
tags:
  [React, Performance, Lazy Loading]  
---
故事背景

一个大型 React 项目加载速度变慢，我通过 Lazy Loading 优化了首屏加载时间。

设计思路

- 使用 React.lazy 动态加载组件。
- 配合 Suspense 处理加载状态。
- 项目初始化


```bash
npx create-react-app lazy-demo --template=typescript
```

1. 懒加载组件

```tsx
import React, { Suspense } from 'react';

const LazyComponent = React.lazy(() => import('./LazyComponent'));

export default function App() {
  return (
    <div>
      <h1>Home</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    </div>
  );
}
```

2. 被加载组件

```tsx
// src/LazyComponent.tsx
export default function LazyComponent() {
  return <p>This is lazily loaded!</p>;
}
```
