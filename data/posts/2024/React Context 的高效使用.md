---
title: React Context 的高效使用
date: 2024-05-12 09:15:23
tags:
  [React, State Management]  
---
故事背景

在多人协作的前端项目中，状态管理经常成为痛点。Redux过于复杂，而传递 props 层级过深又显得繁琐。我最近封装了一个基于 React Context 的轻量级状态管理方案，简单易用且性能优异。

设计思路

- 使用 React.createContext 创建全局状态容器。
- 通过自定义 Hook 封装 Context 的使用逻辑。
- 使用 useReducer 替代 useState，提供更复杂的状态更新逻辑。
- 提供类型安全的 TypeScript 接口。
- 项目结构搭建

```bash
npx create-react-app context-demo --template=typescript
cd context-demo
touch src/context/GlobalContext.tsx src/hooks/useGlobalContext.ts
```

1. Context 接口定义

```ts
type State = {
  count: number;
  theme: 'light' | 'dark';
};

type Action = { type: 'increment' } | { type: 'toggleTheme' };

type ContextType = {
  state: State;
  dispatch: React.Dispatch<Action>;
};
```

2. 创建 Context 和 Provider

```ts
const GlobalContext = React.createContext<ContextType | undefined>(undefined);

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'toggleTheme':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    default:
      return state;
  }
};

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, { count: 0, theme: 'light' });
  return (
    <GlobalContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalContext.Provider>
  );
};
```

3. 自定义 Hook

```ts
export const useGlobalContext = () => {
  const context = React.useContext(GlobalContext);
  if (!context) throw new Error('useGlobalContext must be used within GlobalProvider');
  return context;
};
```

4. 使用示例

```tsx
import { GlobalProvider, useGlobalContext } from './context/GlobalContext';

const App = () => {
  const { state, dispatch } = useGlobalContext();
  return (
    <div>
      <p>Count: {state.count}</p>
      <p>Theme: {state.theme}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>Add</button>
      <button onClick={() => dispatch({ type: 'toggleTheme' })}>Toggle Theme</button>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <GlobalProvider>
    <App />
  </GlobalProvider>
);
```

------
