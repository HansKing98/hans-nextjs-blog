---
title: ES6+ 新特性详解
date: 2021-04-10 15:30:15
tags:
  [JavaScript, ES6, 新特性]  
---

# ES6+ 新特性详解

## 一、变量声明

### 1. let 和 const

```javascript
// let 声明变量
let name = '张三';
name = '李四';  // 可以重新赋值

// const 声明常量
const PI = 3.14159;
// PI = 3.14;  // 报错，不能重新赋值

// 块级作用域
{
  let x = 1;
  const y = 2;
}
// console.log(x);  // 报错，x未定义
```

### 2. 解构赋值

```javascript
// 数组解构
const [a, b, c] = [1, 2, 3];
const [first, ...rest] = [1, 2, 3, 4];

// 对象解构
const {name, age} = {name: '张三', age: 25};
const {name: userName, age: userAge} = {name: '张三', age: 25};

// 函数参数解构
function printUser({name, age = 18}) {
  console.log(`${name}今年${age}岁`);
}
```

## 二、函数增强

### 1. 箭头函数

```javascript
// 基本语法
const add = (a, b) => a + b;

// 多行函数体
const printUser = (name, age) => {
  console.log(`姓名：${name}`);
  console.log(`年龄：${age}`);
};

// this 绑定
const person = {
  name: '张三',
  sayHello: function() {
    setTimeout(() => {
      console.log(`你好，我是${this.name}`);
    }, 1000);
  }
};
```

### 2. 默认参数

```javascript
// 基本用法
function greet(name = '张三') {
  console.log(`你好，${name}`);
}

// 解构默认值
function createUser({name = '张三', age = 18} = {}) {
  console.log(`创建用户：${name}，${age}岁`);
}
```

### 3. 剩余参数

```javascript
// 收集剩余参数
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// 与解构结合
const [first, ...others] = [1, 2, 3, 4];
```

## 三、字符串增强

### 1. 模板字符串

```javascript
// 基本用法
const name = '张三';
const age = 25;
console.log(`姓名：${name}，年龄：${age}`);

// 多行字符串
const html = `
  <div>
    <h1>${name}</h1>
    <p>${age}岁</p>
  </div>
`;

// 标签模板
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ? `<mark>${values[i]}</mark>` : '');
  }, '');
}
```

### 2. 字符串方法

```javascript
// 新增方法
const str = 'Hello World';

console.log(str.startsWith('Hello'));  // true
console.log(str.endsWith('World'));    // true
console.log(str.includes('llo'));      // true
console.log(str.repeat(3));            // 'Hello WorldHello WorldHello World'
```

## 四、数组增强

### 1. 扩展运算符

```javascript
// 数组展开
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];

// 函数参数展开
function sum(a, b, c) {
  return a + b + c;
}
const numbers = [1, 2, 3];
console.log(sum(...numbers));
```

### 2. 新增方法

```javascript
// Array.from
const arrayLike = {0: 'a', 1: 'b', length: 2};
const arr = Array.from(arrayLike);

// Array.of
const arr1 = Array.of(1, 2, 3);

// find 和 findIndex
const numbers = [1, 2, 3, 4, 5];
const even = numbers.find(n => n % 2 === 0);
const evenIndex = numbers.findIndex(n => n % 2 === 0);

// includes
console.log(numbers.includes(3));  // true
```

## 五、对象增强

### 1. 属性简写

```javascript
// 属性简写
const name = '张三';
const age = 25;
const person = {name, age};

// 方法简写
const obj = {
  sayHello() {
    console.log('你好');
  }
};
```

### 2. 计算属性名

```javascript
// 动态属性名
const prop = 'name';
const obj = {
  [prop]: '张三',
  ['get' + prop]() {
    return this[prop];
  }
};
```

### 3. Object 方法

```javascript
// Object.assign
const target = {a: 1};
const source = {b: 2};
Object.assign(target, source);

// Object.keys/values/entries
const obj = {a: 1, b: 2};
console.log(Object.keys(obj));    // ['a', 'b']
console.log(Object.values(obj));  // [1, 2]
console.log(Object.entries(obj)); // [['a', 1], ['b', 2]]
```

## 六、Promise

### 1. 基本用法

```javascript
// 创建Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('成功');
  }, 1000);
});

// 使用Promise
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('完成'));
```

### 2. Promise 方法

```javascript
// Promise.all
Promise.all([
  fetch('/api/user'),
  fetch('/api/posts')
])
  .then(([user, posts]) => {
    console.log(user, posts);
  });

// Promise.race
Promise.race([
  fetch('/api/slow'),
  fetch('/api/fast')
])
  .then(result => console.log(result));
```

## 七、Class

### 1. 基本语法

```javascript
// 类定义
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  sayHello() {
    console.log(`你好，我是${this.name}`);
  }

  static create(name) {
    return new Person(name, 18);
  }
}

// 继承
class Student extends Person {
  constructor(name, age, grade) {
    super(name, age);
    this.grade = grade;
  }

  study() {
    console.log(`${this.name}正在学习`);
  }
}
```

## 八、总结

通过本文的学习，我们掌握了：

1. 变量声明（let/const）
2. 函数增强（箭头函数、默认参数等）
3. 字符串增强（模板字符串、新方法）
4. 数组增强（扩展运算符、新方法）
5. 对象增强（属性简写、新方法）
6. Promise异步处理
7. Class面向对象

这些新特性大大提升了JavaScript的开发效率和代码质量，建议在实际项目中多加应用。 