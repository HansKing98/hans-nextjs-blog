---
title: React Hooks 的基本用法
date: 2022-03-12 14:20:45
tags:
  [React, Hooks, Functional Components]  
---

故事背景

React Hooks 的推出让我从类组件转向了函数式组件。我总结了 useState 和 useEffect 的基本用法及其注意事项。

设计思路

- 使用 useState 管理状态。
- 使用 useEffect 处理副作用。
- 展示 Hooks 的简单应用。
- 项目结构搭建

bash

```bash
npx create-react-app hooks-demo --template=typescript
```

1. Hooks 示例

tsx

```tsx
import React, { useState, useEffect } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
    return () => {
      document.title = 'React App';
    };
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Add</button>
    </div>
  );
}
```
