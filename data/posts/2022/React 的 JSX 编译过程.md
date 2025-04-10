---
title: React 的 JSX 编译过程
date: 2022-11-30 13:40:08
tags:
  [React, Source Code, JSX]  
---

故事背景

JSX 的简洁让我对它的编译过程产生了兴趣。

设计思路

- 分析 Babel 的转换。
- 理解 React 元素创建。
- 编译结果

js

```js
// JSX: <div>Hello</div>
// 编译后: React.createElement('div', null, 'Hello')
``` 