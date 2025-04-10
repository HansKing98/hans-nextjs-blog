---
title: Tailwind CSS 与 Headless UI 结合
date: 2024-11-03 09:45:17
tags:
   [Tailwind CSS, Headless UI, UI]  
---
故事背景

我需要快速搭建一个可复用的下拉菜单组件，最终选择了 Tailwind CSS 和 Headless UI 的组合。

设计思路

- 使用 Headless UI 提供无样式组件。
- 用 Tailwind CSS 添加样式。
- 项目初始化

```bash
npx create-react-app headless-demo --template=typescript
npm install @headlessui/react tailwindcss
npx tailwindcss init
```

1. 下拉菜单组件

```tsx
import { Menu } from '@headlessui/react';

export default function Dropdown() {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="bg-blue-500 text-white px-4 py-2 rounded">
        Options
      </Menu.Button>
      <Menu.Items className="absolute mt-2 w-56 bg-white shadow-lg rounded">
        <Menu.Item>
          {({ active }) => (
            <a className={`block px-4 py-2 ${active ? 'bg-blue-100' : ''}`} href="#">Option 1</a>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <a className={`block px-4 py-2 ${active ? 'bg-blue-100' : ''}`} href="#">Option 2</a>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
```
