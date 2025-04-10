---
title: Next.js 14 的 App Router 实战
date: 2024-06-03 16:22:10
tags:
  [Next.js, React, SSR]  
---
故事背景

Next.js 14 引入了 App Router，彻底改变了路由和数据获取的方式。我在一个新项目中尝试了它的特性，发现它在 SSR 和静态生成方面表现优异。

设计思路

- 使用 app/ 目录结构替代 pages/。
- 利用 async 组件直接获取数据。
- 配置动态路由和布局组件。
- 项目初始化

```bash
npx create-next-app@latest next14-demo --typescript
cd next14-demo
```

1. 页面组件

```tsx
// app/page.tsx
export default async function Home() {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json();
  return (
    <main>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </main>
  );
}
```

2. 布局组件

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>Header</header>
        {children}
        <footer>Footer</footer>
      </body>
    </html>
  );
}
```

3. 动态路由

```tsx
// app/posts/[id]/page.tsx
export default async function Post({ params }: { params: { id: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.id}`).then(res => res.json());
  return <div>{post.content}</div>;
}
```

------
