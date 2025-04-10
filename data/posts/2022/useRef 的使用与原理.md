---
title: useRef 的使用与原理
date: 2022-08-02 11:45:59
tags:
  [React, Hooks, Source Code]  
---

故事背景

useRef 的灵活性让我很好奇，我研究了它的实现。

设计思路

- 使用 useRef 操作 DOM。
- 分析其持久化特性。
- 示例

tsx

```tsx
const ref = useRef<HTMLInputElement>(null);
useEffect(() => {
  ref.current?.focus();
}, []);
``` 