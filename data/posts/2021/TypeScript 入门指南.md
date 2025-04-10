---
title: TypeScript 入门指南
date: 2021-05-15 16:40:30
tags:
  [TypeScript, 类型系统, 前端开发]  
---

# TypeScript 入门指南

## 一、基础类型

### 1. 基本类型

```typescript
// 布尔值
let isDone: boolean = false;

// 数字
let decimal: number = 6;
let hex: number = 0xf00d;
let binary: number = 0b1010;
let octal: number = 0o744;

// 字符串
let name: string = "张三";
let age: number = 25;
let sentence: string = `你好，我是${name}，今年${age}岁`;

// 数组
let list: number[] = [1, 2, 3];
let list2: Array<number> = [1, 2, 3];

// 元组
let tuple: [string, number] = ['张三', 25];
```

### 2. 特殊类型

```typescript
// 枚举
enum Color {
  Red,
  Green,
  Blue
}
let c: Color = Color.Green;

// Any
let notSure: any = 4;
notSure = "可能是字符串";
notSure = false;

// Void
function warnUser(): void {
  console.log("这是一个警告");
}

// Null 和 Undefined
let u: undefined = undefined;
let n: null = null;
```

## 二、接口

### 1. 对象接口

```typescript
// 基本接口
interface Person {
  name: string;
  age: number;
  readonly id: number;
  optional?: string;
}

// 使用接口
let person: Person = {
  name: "张三",
  age: 25,
  id: 1
};

// 只读属性
person.id = 2; // 错误
```

### 2. 函数接口

```typescript
// 函数类型接口
interface SearchFunc {
  (source: string, subString: string): boolean;
}

// 使用接口
let mySearch: SearchFunc = function(source: string, subString: string) {
  return source.search(subString) > -1;
};
```

### 3. 类接口

```typescript
// 类类型接口
interface ClockInterface {
  currentTime: Date;
  setTime(d: Date): void;
}

// 实现接口
class Clock implements ClockInterface {
  currentTime: Date = new Date();
  setTime(d: Date) {
    this.currentTime = d;
  }
}
```

## 三、类

### 1. 基本类

```typescript
// 类定义
class Animal {
  private name: string;
  protected age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  move(distance: number = 0) {
    console.log(`${this.name}移动了${distance}米`);
  }
}

// 继承
class Dog extends Animal {
  constructor(name: string, age: number) {
    super(name, age);
  }
  
  bark() {
    console.log('汪汪！');
  }
}
```

### 2. 访问修饰符

```typescript
class Person {
  public name: string;      // 公共属性
  private age: number;      // 私有属性
  protected id: number;     // 受保护属性
  
  constructor(name: string, age: number, id: number) {
    this.name = name;
    this.age = age;
    this.id = id;
  }
  
  // 公共方法
  public sayHello() {
    console.log(`你好，我是${this.name}`);
  }
  
  // 私有方法
  private getAge() {
    return this.age;
  }
}
```

## 四、泛型

### 1. 泛型函数

```typescript
// 基本泛型
function identity<T>(arg: T): T {
  return arg;
}

// 使用泛型
let output = identity<string>("myString");
let output2 = identity("myString"); // 类型推断

// 泛型约束
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}
```

### 2. 泛型类

```typescript
// 泛型类
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
}

// 使用泛型类
let myGenericNumber = new GenericNumber<number>();
myGenericNumber.zeroValue = 0;
myGenericNumber.add = function(x, y) { return x + y; };
```

## 五、类型推断

### 1. 基础类型推断

```typescript
// 变量类型推断
let x = 3;              // x 被推断为 number
let y = [0, 1, null];   // y 被推断为 (number | null)[]

// 函数返回类型推断
function add(a: number, b: number) {
  return a + b;         // 返回类型被推断为 number
}
```

### 2. 上下文类型推断

```typescript
// 上下文类型
window.onmousedown = function(mouseEvent) {
  console.log(mouseEvent.button);  // 正确
  console.log(mouseEvent.kangaroo); // 错误
};
```

## 六、模块

### 1. 导出

```typescript
// 导出声明
export interface StringValidator {
  isAcceptable(s: string): boolean;
}

// 导出语句
class ZipCodeValidator implements StringValidator {
  isAcceptable(s: string) {
    return s.length === 5;
  }
}
export { ZipCodeValidator };
export { ZipCodeValidator as mainValidator };
```

### 2. 导入

```typescript
// 导入声明
import { ZipCodeValidator } from "./ZipCodeValidator";
import { ZipCodeValidator as ZCV } from "./ZipCodeValidator";
import * as validator from "./ZipCodeValidator";

// 默认导出/导入
export default class ZipCodeValidator {
  // ...
}
import validator from "./ZipCodeValidator";
```

## 七、总结

通过本文的学习，我们掌握了：

1. TypeScript的基础类型系统
2. 接口的定义和使用
3. 类的定义和继承
4. 泛型的使用
5. 类型推断机制
6. 模块的导入导出

这些知识是TypeScript开发的基础，建议结合实际项目多加练习。 