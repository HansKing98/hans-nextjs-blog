---
title: Next.js 与 Vercel 的自动化部署实践
date: 2024-12-20 14:30:25
tags:
  [Next.js, Vercel, Deployment]  
---

## 故事背景

在开发一个需要快速迭代的前端项目时，我发现手动部署耗时且容易出错。于是，我利用 Next.js 和 Vercel 的集成，实现了从开发到上线的自动化流程，极大提高了效率。

## 设计思路

- 使用 Next.js 构建静态和服务器端渲染的混合应用。
- 配置 Vercel 的 Git 集成，实现推代码即部署。
- 添加环境变量管理敏感信息。

## 项目初始化

```bash
npx create-next-app@latest vercel-demo --typescript
cd vercel-demo
npm install
```
1. Next.js 主页面
```tsx
// app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Vercel Demo</h1>
      <p className="mt-4">Deployed automatically with Vercel!</p>
    </main>
  );
}
```
2. Vercel 配置文件
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "app/**/*",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```
3. 环境变量配置
在 Vercel 仪表盘中添加环境变量，或者本地创建 .env.local 文件：
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
然后在代码中使用：
tsx
// app/page.tsx (updated)
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Vercel Demo</h1>
      <p className="mt-4">API URL: {process.env.NEXT_PUBLIC_API_URL}</p>
    </main>
  );
}
```
4. 部署步骤
将项目推送到 GitHub/GitLab/Bitbucket。
在 Vercel 官网导入仓库。
配置域名和环境变量。
每次推送代码后，Vercel 自动构建并部署。
