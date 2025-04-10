---
title: React 的 Virtual DOM 实现
date: 2022-06-29 10:05:13
tags:
  [React, Source Code, Virtual DOM]  
---
故事背景

Virtual DOM 是 React 的核心概念，我深入研究了它的实现原理。

设计思路

- 分析 Virtual DOM 的结构。
- 理解 DOM 更新的过程。
- 伪代码

js

```js
const vdom = {
  type: 'div',
  props: { id: 'app' },
  children: [{ type: 'span', props: {}, children: ['Hello'] }],
};
``` 