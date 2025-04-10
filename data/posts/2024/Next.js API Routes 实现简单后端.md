---
title: Next.js API Routes 实现简单后端
date: 2024-12-22 14:30:55
tags:
   [Next.js, API, Backend]  
---
   
故事背景

在开发一个小型前端项目时，我需要快速实现一个后端接口来处理数据请求。最终选择了 Next.js 的 API Routes，既方便又能与前端无缝集成。

设计思路
使用 Next.js 的 api 目录创建 RESTful 接口。  
配置简单的 GET 和 POST 请求处理。  

项目初始化
```bash
npx create-next-app@latest next-api-demo --typescript
cd next-api-demo
```
API 路由实现
```tsx
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  const newUser = { id: Date.now(), name };
  return NextResponse.json(newUser, { status: 201 });
}
```
