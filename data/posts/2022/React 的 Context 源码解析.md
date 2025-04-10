---
title: React 的 Context 源码解析
date: 2022-08-10 13:20:44
tags:
  [React, Source Code, Context]  
---
故事背景

Context 是状态共享的基础，我深入源码研究了它的实现。

设计思路

- 分析 Provider 和 Consumer。
- 理解值的传递。
- 伪代码

js

```js
const context = {
  Provider: (props) => updateContext(props.value),
  Consumer: (props) => props.children(getContextValue()),
};
``` 