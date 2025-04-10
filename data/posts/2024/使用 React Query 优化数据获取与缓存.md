---
title: 使用 React Query 优化数据获取与缓存
date: 2024-09-15 13:10:22
tags:
  [React, React Query, Data Fetching]  
---
故事背景

在一个需要频繁请求 API 的 React 项目中，我发现传统的 useEffect 和 fetch 组合在复杂场景下难以维护。React Query 的引入让我轻松实现了数据获取、缓存和状态同步，极大提升了开发效率和用户体验。

设计思路

- 使用 React Query 管理服务器状态。
- 配置查询和变异（mutation）来处理数据获取和更新。
- 利用内置的缓存和自动重试功能。
- 集成 TypeScript 提供类型安全。
- 项目结构搭建

```bash
npx create-react-app query-demo --template=typescript
cd query-demo
npm install @tanstack/react-query
touch src/api/fetchData.ts src/components/DataDisplay.tsx
```

1. API 请求函数

```ts
// src/api/fetchData.ts
export const fetchData = async (): Promise<{ id: number; title: string }[]> => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const updateData = async (id: number, title: string): Promise<{ id: number; title: string }> => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};
```

2. Query Client 配置

```tsx
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataDisplay from './components/DataDisplay';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      cacheTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <QueryClientProvider client={queryClient}>
    <DataDisplay />
  </QueryClientProvider>
);
```

3. 数据展示组件

```tsx
// src/components/DataDisplay.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchData, updateData } from '../api/fetchData';

export default function DataDisplay() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchData,
  });

  const mutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateData(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      <h1>Posts</h1>
      <ul>
        {data?.slice(0, 5).map((post) => (
          <li key={post.id}>
            {post.title}{' '}
            <button
              onClick={() => mutation.mutate({ id: post.id, title: 'Updated Title' })}
            >
              Update
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

4. 样式文件

```css
/* src/index.css */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 20px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 10px;
}

button {
  margin-left: 10px;
  padding: 5px 10px;
  background-color: #007BFF;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
```

5. 使用说明

React Query 通过 useQuery 获取数据并自动缓存，useMutation 处理更新操作。queryKey 用于标识查询，更新后通过 invalidateQueries 触发重新获取数据。内置的加载和错误状态管理让代码更简洁。

6. 可选：添加 Devtools

```tsx
// src/index.tsx (带 Devtools)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 在 QueryClientProvider 内添加
<QueryClientProvider client={queryClient}>
  <DataDisplay />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```
