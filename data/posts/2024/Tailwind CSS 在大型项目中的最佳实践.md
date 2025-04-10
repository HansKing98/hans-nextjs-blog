---
title: Tailwind CSS 在大型项目中的最佳实践
date: 2024-07-19 10:05:47
tags:
  [Tailwind CSS, CSS, Frontend]  
---

故事背景

Tailwind CSS 的原子类风格虽然高效，但在大项目中容易导致代码冗余。我总结了一些实践经验，帮助团队更好地管理样式。

设计思路

- 使用自定义配置文件优化 Tailwind。
- 封装常用组件，减少重复。
- 配置 PurgeCSS 优化生产环境。
- 项目初始化

```bash
npx create-react-app tw-demo --template=typescript
cd tw-demo
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

1. Tailwind 配置

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1D4ED8',
      },
    },
  },
};
```

2. 封装组件

```tsx
// src/components/Button.tsx
export const Button = ({ children }: { children: React.ReactNode }) => (
  <button className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
    {children}
  </button>
);
```

3. CSS 文件

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

------
