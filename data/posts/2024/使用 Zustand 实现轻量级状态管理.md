---
title: 使用 Zustand 实现轻量级状态管理
date: 2024-07-28 11:25:39
tags:
  [React, Zustand, State Management]  
---

故事背景
在开发一个中型 React 项目时，我发现 Redux 的样板代码过多，而 Context API 在复杂场景下性能堪忧。经过调研，我选择了 Zustand——一个轻量、灵活的状态管理库，完美平衡了简洁性和功能性。
设计思路
使用 Zustand 创建全局状态存储。
通过 Hook 提供类型安全的访问方式。
支持异步操作和中间件（如持久化）。
尽量减少组件重新渲染。
0. 项目结构搭建
```bash
npx create-react-app zustand-demo --template=typescript
cd zustand-demo
npm install zustand
touch src/store/useStore.ts src/components/Counter.tsx
```
1. 定义 Store 接口和实现
```ts
// src/store/useStore.ts
import { create } from 'zustand';

type State = {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  fetchCount: () => Promise<void>;
};

export const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  fetchCount: async () => {
    const res = await fetch('https://api.example.com/count');
    const { count } = await res.json();
    set({ count });
  },
}));
```
2. 组件中使用 Store
```tsx
// src/components/Counter.tsx
import { useStore } from '../store/useStore';

export default function Counter() {
  const { count, increment, decrement, reset, fetchCount } = useStore();

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>Reset</button>
      <button onClick={fetchCount}>Fetch Count</button>
    </div>
  );
}
```
3. 根组件渲染
```tsx
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import Counter from './components/Counter';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Counter />
  </React.StrictMode>
);
```
4. 样式文件
```css
/* src/index.css */
body {
  font-family: Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

button {
  margin: 0 5px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}
```
5. 可选：添加持久化中间件
```ts
// src/store/useStore.ts (带持久化)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  count: number;
  increment: () => void;
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'counter-storage', // 存储在 localStorage 中的 key
    }
  )
);
```
6. 使用示例
在 Counter.tsx 中，只需调用 useStore 获取状态和方法即可。Zustand 的 API 简单直观，避免了 Redux 的繁琐配置，同时支持异步操作和中间件扩展。
