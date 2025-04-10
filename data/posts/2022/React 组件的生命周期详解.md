---
title: React 组件的生命周期详解
date: 2022-03-05 10:30:15
tags:
  [React, Components, Lifecycle]  
---

故事背景

在学习 React 的初期，我对组件的生命周期总是感到困惑。通过阅读源码和实践，我梳理了类组件的生命周期方法及其应用场景。

设计思路

- 分析 componentDidMount、componentDidUpdate 和 componentWillUnmount。
- 使用类组件展示生命周期的实际应用。
- 提供 TypeScript 类型支持。
- 项目结构搭建

bash

```bash
npx create-react-app lifecycle-demo --template=typescript
cd lifecycle-demo
touch src/components/LifecycleDemo.tsx
```

1. 组件实现

tsx

```tsx
// src/components/LifecycleDemo.tsx
import React from 'react';

type Props = { initialCount: number };
type State = { count: number };

export default class LifecycleDemo extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { count: props.initialCount };
    console.log('Constructor');
  }

  componentDidMount() {
    console.log('Mounted');
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    console.log('Updated', { prevCount: prevState.count, newCount: this.state.count });
  }

  componentWillUnmount() {
    console.log('Unmounted');
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Increment
        </button>
      </div>
    );
  }
}
```
2. 使用示例

tsx

```tsx
// src/index.tsx
import ReactDOM from 'react-dom/client';
import LifecycleDemo from './components/LifecycleDemo';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<LifecycleDemo initialCount={0} />);
```
