---
title: React.createElement 的源码解析
date: 2022-04-02 16:40:21
tags:
  [React, Source Code, JSX]  
---

故事背景

JSX 的背后是 React.createElement，我深入源码研究了它的实现。

设计思路

- 查看 React.createElement 的参数。
- 分析其返回的对象结构。
- 结合 JSX 使用。
- 源码简析

js

```js
function createElement(type, config, children) {
  const props = { ...config };
  if (children) props.children = children;
  return { $$typeof: Symbol.for('react.element'), type, props };
}
```

2. 使用示例

jsx

```jsx
const element = React.createElement('div', { id: 'test' }, 'Hello');
// 等价于 <div id="test">Hello</div>
``` 