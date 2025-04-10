---
title: 出海 SaaS：多语言支持方案
date: 2024-12-15 12:00:09
tags:
  [SaaS, i18n, React]  
---

故事背景

为了让 SaaS 产品适配全球用户，我基于 React 和 i18next 实现了多语言支持。

设计思路

- 使用 i18next 处理翻译。
- 配置语言切换组件。
- 项目初始化

```bash
npx create-react-app i18n-demo --template=typescript
npm install i18next react-i18next
```

1. i18n 配置

```ts
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { welcome: 'Welcome!' } },
    zh: { translation: { welcome: '欢迎！' } },
  },
  lng: 'en',
  fallbackLng: 'en',
});

export default i18n;
```

2. 使用多语言

```tsx
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('zh')}>中文</button>
      <button onClick={() => i18n.changeLanguage('en')}>English</button>
    </div>
  );
}
```
