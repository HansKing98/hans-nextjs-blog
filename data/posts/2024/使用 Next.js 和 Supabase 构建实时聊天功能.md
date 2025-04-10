---
title: 使用 Next.js 和 Supabase 构建实时聊天功能
date: 2024-09-28 14:20:35
tags:
  [Next.js, Supabase, Real-time, React]
---

## 故事背景

最近在一个项目中，我需要实现一个实时聊天功能，能够让用户即时发送和接收消息。经过调研，我选择了 Next.js 作为前端框架，并结合 Supabase 的实时数据库功能，快速搭建了一个高效的解决方案。

## 设计思路

- 使用 Next.js 的 App Router 构建页面。
- 通过 Supabase 的 PostgreSQL 数据库存储消息。
- 利用 Supabase 的实时订阅功能监听消息更新。
- 在前端使用 React 状态管理消息列表。

## 项目初始化

```bash
npx create-next-app@latest chat-demo --typescript
cd chat-demo
npm install @supabase/supabase-js
```
1. Supabase 配置
首先在 Supabase 控制台创建一个项目，并获取 API Key 和 URL。然后在项目中初始化 Supabase 客户端。
```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);
```
2. 消息表结构
在 Supabase 控制台中创建一张 messages 表，包含以下字段：
id (int8, 主键，自增)
content (text)
created_at (timestamp, 默认当前时间)
user_id (text)
3. 聊天组件
创建一个页面组件，处理消息的发送和实时接收。
```tsx
// app/chat/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Message = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // 实时订阅消息
  useEffect(() => {
    // 获取初始消息
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    // 订阅实时更新
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const { error } = await supabase.from('messages').insert({
      content: newMessage,
      user_id: 'user1', // 假设固定用户，实际应从认证中获取
    });
    if (!error) setNewMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="h-96 overflow-y-auto border p-2 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <span className="font-bold">{msg.user_id}: </span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border p-2"
          placeholder="输入消息..."
        />
        <button onClick={handleSend} className="bg-blue-500 text-white px-4 py-2">
          发送
        </button>
      </div>
    </div>
  );
}
```
4. 样式调整
为了让聊天界面更美观，可以添加一些简单的 CSS。
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: Arial, sans-serif;
}
```
5. 环境变量配置
在项目根目录创建 .env.local 文件，添加 Supabase 配置。
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
6. 部署与测试
运行项目并测试实时功能：
```bash
npm run dev
```
访问 http://localhost:3000/chat  ，发送消息后即可看到实时更新。部署时可使用 Vercel，只需推送代码并配置环境变量即可。
