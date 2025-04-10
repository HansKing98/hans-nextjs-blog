---
title: React Query 的数据获取与缓存
date: 2024-12-25 10:30:45
tags:
  [React, React Query, Data Fetching]
---

## 故事背景

在开发一个数据驱动的 React 应用时，我发现频繁的 API 调用和状态管理让代码变得复杂。通过引入 React Query，我简化了数据获取和缓存逻辑，提高了开发效率和用户体验。

## 设计思路

- 使用 React Query 的 `useQuery` Hook 进行数据获取。
- 配置缓存和自动重试机制。
- 提供简单的加载和错误状态处理。

## 项目初始化

```bash
npx create-react-app query-demo --template=typescript
npm install @tanstack/react-query
~~~

1. 配置 React Query

tsx

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

2. 数据获取组件

```tsx
import { useQuery } from '@tanstack/react-query';

const fetchPosts = async () => {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  return res.json();
};

export default function Posts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <ul className="list-disc pl–

5">
      {data.map((post: any) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

3. 样式文件

```css
body {
  font-family: Arial, sans-serif;
  padding: 20px;
}
这篇文章介绍了如何使用 React Query 来简化数据获取和缓存，保持了与你提供的格式一致的结构，包括标题、日期、标签、故事背景、设计思路、代码块等。如果你需要调整内容或添加更多细节，请告诉我！
```
