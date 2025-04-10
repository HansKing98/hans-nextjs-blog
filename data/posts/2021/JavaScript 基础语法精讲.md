---
title: JavaScript 基础语法精讲
date: 2021-01-15 10:20:30
tags:
  [JavaScript, 基础语法, 编程基础]  
---

# JavaScript 基础语法精讲

## 一、变量与数据类型

### 1. 变量声明

```javascript
// 使用 let 声明变量
let name = '张三';
let age = 25;

// 使用 const 声明常量
const PI = 3.14159;
const MAX_SIZE = 100;

// 使用 var 声明变量（不推荐）
var oldWay = '旧方式';
```

### 2. 数据类型

```javascript
// 基本数据类型
let str = '字符串';          // 字符串
let num = 123;              // 数字
let bool = true;            // 布尔值
let undef = undefined;      // 未定义
let nul = null;             // 空值
let sym = Symbol('唯一');   // 符号

// 引用数据类型
let obj = {                 // 对象
  name: '张三',
  age: 25
};

let arr = [1, 2, 3];       // 数组
let func = function() {};   // 函数
```

## 二、运算符与表达式

### 1. 算术运算符

```javascript
let a = 10;
let b = 3;

console.log(a + b);   // 13
console.log(a - b);   // 7
console.log(a * b);   // 30
console.log(a / b);   // 3.333...
console.log(a % b);   // 1
console.log(a ** b);  // 1000
```

### 2. 比较运算符

```javascript
console.log(1 == '1');    // true
console.log(1 === '1');   // false
console.log(1 != '1');    // false
console.log(1 !== '1');   // true
console.log(1 > 2);       // false
console.log(1 >= 1);      // true
```

### 3. 逻辑运算符

```javascript
console.log(true && false);   // false
console.log(true || false);   // true
console.log(!true);          // false

// 短路运算
let result = false && console.log('不会执行');
let result2 = true || console.log('不会执行');
```

## 三、流程控制

### 1. 条件语句

```javascript
// if-else
let age = 18;
if (age >= 18) {
  console.log('成年人');
} else {
  console.log('未成年人');
}

// switch
let day = 1;
switch (day) {
  case 1:
    console.log('星期一');
    break;
  case 2:
    console.log('星期二');
    break;
  default:
    console.log('其他');
}
```

### 2. 循环语句

```javascript
// for 循环
for (let i = 0; i < 5; i++) {
  console.log(i);
}

// while 循环
let i = 0;
while (i < 5) {
  console.log(i);
  i++;
}

// do-while 循环
let j = 0;
do {
  console.log(j);
  j++;
} while (j < 5);
```

## 四、函数

### 1. 函数声明

```javascript
// 函数声明
function add(a, b) {
  return a + b;
}

// 函数表达式
const subtract = function(a, b) {
  return a - b;
};

// 箭头函数
const multiply = (a, b) => a * b;
```

### 2. 函数参数

```javascript
// 默认参数
function greet(name = '张三') {
  console.log(`你好，${name}`);
}

// 剩余参数
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// 解构参数
function printUser({name, age}) {
  console.log(`姓名：${name}，年龄：${age}`);
}
```

## 五、对象与数组

### 1. 对象操作

```javascript
// 对象创建
const person = {
  name: '张三',
  age: 25,
  sayHello() {
    console.log(`你好，我是${this.name}`);
  }
};

// 对象访问
console.log(person.name);
console.log(person['age']);
person.sayHello();

// 对象解构
const {name, age} = person;
```

### 2. 数组操作

```javascript
// 数组创建
const numbers = [1, 2, 3, 4, 5];

// 数组方法
numbers.push(6);           // 添加元素
numbers.pop();            // 删除最后一个元素
numbers.unshift(0);       // 开头添加元素
numbers.shift();          // 删除第一个元素

// 数组遍历
numbers.forEach(num => console.log(num));
const doubled = numbers.map(num => num * 2);
const evens = numbers.filter(num => num % 2 === 0);
```

## 六、异步编程

### 1. Promise

```javascript
// Promise 创建
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('成功');
  }, 1000);
});

// Promise 使用
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('完成'));
```

### 2. async/await

```javascript
// async 函数
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('错误：', error);
  }
}
```

## 七、总结

通过本文的学习，我们掌握了：

1. 变量声明与数据类型
2. 运算符与表达式
3. 流程控制语句
4. 函数定义与使用
5. 对象与数组操作
6. 异步编程基础

这些基础知识是JavaScript编程的基石，建议多加练习，熟练掌握。 