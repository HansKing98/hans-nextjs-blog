---
title: React 的 Error Boundary 实现
date: 2022-11-17 16:05:27
tags:
  [React, Error Handling, Components]  
---

故事背景

错误处理是健壮应用的关键，我实现了 Error Boundary。

设计思路

- 使用 componentDidCatch。
- 提供回退 UI。
- 示例

tsx

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  componentDidCatch() {
    this.setState({ hasError: true });
  }
  render() {
    return this.state.hasError ? <div>Error</div> : this.props.children;
  }
}
``` 