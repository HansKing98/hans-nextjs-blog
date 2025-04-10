---
title: React 的 Props 传递机制
date: 2022-08-18 15:10:23
tags:
  [React, Source Code, Props]  
---
故事背景

Props 是组件通信的关键，我研究了它的传递过程。

设计思路

- 分析 Props 的克隆。
- 理解更新触发。
- 示例

tsx

```tsx
<Component {...props} extra="value" />
``` 