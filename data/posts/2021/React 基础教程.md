---
title: React 基础教程
date: 2021-06-20 17:50:15
tags:
  [React, 前端框架, JavaScript]  
---

# React 基础教程

## 一、React 基础概念

### 1. JSX 语法

```jsx
// 基本JSX
const element = <h1>Hello, world!</h1>;

// JSX中使用表达式
const name = '张三';
const element = <h1>Hello, {name}</h1>;

// JSX中使用属性
const element = <img src={user.avatarUrl} alt={user.name} />;

// JSX中使用样式
const element = <div style={{color: 'red', fontSize: '20px'}}>Hello</div>;
```

### 2. 组件基础

```jsx
// 函数组件
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// 类组件
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}

// 组件使用
const element = <Welcome name="张三" />;
```

## 二、组件状态管理

### 1. State 使用

```jsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0
    };
  }

  increment = () => {
    this.setState({
      count: this.state.count + 1
    });
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>增加</button>
      </div>
    );
  }
}
```

### 2. Props 使用

```jsx
// 父组件
class Parent extends React.Component {
  render() {
    return <Child name="张三" age={25} />;
  }
}

// 子组件
class Child extends React.Component {
  render() {
    return (
      <div>
        <p>姓名：{this.props.name}</p>
        <p>年龄：{this.props.age}</p>
      </div>
    );
  }
}
```

## 三、生命周期

### 1. 挂载阶段

```jsx
class Example extends React.Component {
  constructor(props) {
    super(props);
    console.log('constructor');
  }

  componentDidMount() {
    console.log('componentDidMount');
  }

  render() {
    console.log('render');
    return <div>Hello</div>;
  }
}
```

### 2. 更新阶段

```jsx
class Example extends React.Component {
  componentDidUpdate(prevProps, prevState) {
    console.log('componentDidUpdate');
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }
}
```

### 3. 卸载阶段

```jsx
class Example extends React.Component {
  componentWillUnmount() {
    console.log('componentWillUnmount');
  }
}
```

## 四、事件处理

### 1. 基本事件

```jsx
class Toggle extends React.Component {
  handleClick = (e) => {
    e.preventDefault();
    console.log('点击事件');
  }

  render() {
    return (
      <button onClick={this.handleClick}>
        点击我
      </button>
    );
  }
}
```

### 2. 事件传参

```jsx
class List extends React.Component {
  handleClick = (id, e) => {
    console.log('ID:', id);
  }

  render() {
    return (
      <ul>
        {items.map(item => (
          <li key={item.id} onClick={(e) => this.handleClick(item.id, e)}>
            {item.text}
          </li>
        ))}
      </ul>
    );
  }
}
```

## 五、条件渲染

### 1. if 语句

```jsx
function Greeting(props) {
  if (props.isLoggedIn) {
    return <UserGreeting />;
  }
  return <GuestGreeting />;
}
```

### 2. 三元运算符

```jsx
function Greeting(props) {
  return (
    <div>
      {props.isLoggedIn ? (
        <UserGreeting />
      ) : (
        <GuestGreeting />
      )}
    </div>
  );
}
```

### 3. 逻辑与运算符

```jsx
function Mailbox(props) {
  return (
    <div>
      <h1>Hello!</h1>
      {props.unreadMessages.length > 0 && (
        <h2>你有 {props.unreadMessages.length} 条未读消息</h2>
      )}
    </div>
  );
}
```

## 六、列表渲染

### 1. 基本列表

```jsx
function NumberList(props) {
  const numbers = props.numbers;
  const listItems = numbers.map((number) =>
    <li key={number.toString()}>
      {number}
    </li>
  );
  return <ul>{listItems}</ul>;
}
```

### 2. 带索引的列表

```jsx
function TodoList(props) {
  return (
    <ul>
      {props.items.map((item, index) => (
        <li key={index}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}
```

## 七、表单处理

### 1. 受控组件

```jsx
class NameForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: ''};
  }

  handleChange = (event) => {
    this.setState({value: event.target.value});
  }

  handleSubmit = (event) => {
    event.preventDefault();
    alert('提交的名字: ' + this.state.value);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          名字:
          <input type="text" value={this.state.value} onChange={this.handleChange} />
        </label>
        <input type="submit" value="提交" />
      </form>
    );
  }
}
```

### 2. 非受控组件

```jsx
class NameForm extends React.Component {
  handleSubmit = (event) => {
    event.preventDefault();
    alert('提交的名字: ' + this.input.value);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          名字:
          <input type="text" ref={(input) => this.input = input} />
        </label>
        <input type="submit" value="提交" />
      </form>
    );
  }
}
```

## 八、总结

通过本文的学习，我们掌握了：

1. React的基础概念和JSX语法
2. 组件的创建和使用
3. 状态管理和属性传递
4. 生命周期方法
5. 事件处理
6. 条件渲染和列表渲染
7. 表单处理

这些知识是React开发的基础，建议结合实际项目多加练习。 