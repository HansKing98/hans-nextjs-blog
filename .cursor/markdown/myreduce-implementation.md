# MyReduce 函数实现文档

## 概述

`MyReduce` 是一个自定义实现的 JavaScript/TypeScript 函数，完全模拟了原生 `Array.prototype.reduce` 方法的行为。

## 函数签名

```typescript
function MyReduce<T, R>(
  array: T[],
  callback: (accumulator: R, currentValue: T, currentIndex: number, array: T[]) => R,
  initialValue?: R
): R
```

## 参数说明

- `array: T[]` - 要处理的数组
- `callback` - 回调函数，接收四个参数：
  - `accumulator: R` - 累加器，存储每次计算的结果
  - `currentValue: T` - 当前元素
  - `currentIndex: number` - 当前元素的索引
  - `array: T[]` - 原始数组
- `initialValue?: R` - 可选的初始值

## 核心实现逻辑

### 1. 边界情况处理

```typescript
if (array.length === 0 && initialValue === undefined) {
  throw new TypeError('Reduce of empty array with no initial value')
}
```

如果数组为空且没有提供初始值，抛出 TypeError，与原生 reduce 行为一致。

### 2. 累加器初始化

```typescript
let accumulator: R
let startIndex: number

if (initialValue !== undefined) {
  accumulator = initialValue
  startIndex = 0
} else {
  accumulator = array[0] as unknown as R
  startIndex = 1
}
```

- 如果提供了初始值，累加器使用初始值，遍历从索引 0 开始
- 如果没有初始值，累加器使用数组第一个元素，遍历从索引 1 开始

### 3. 遍历执行

```typescript
for (let i = startIndex; i < array.length; i++) {
  accumulator = callback(accumulator, array[i], i, array)
}
```

按顺序遍历数组，执行回调函数并更新累加器。

## 使用示例

### 1. 数组求和

```typescript
const numbers = [1, 2, 3, 4, 5]
const sum = MyReduce(numbers, (acc, curr) => acc + curr, 0)
// 结果: 15
```

### 2. 数组求积

```typescript
const numbers = [1, 2, 3, 4, 5]
const product = MyReduce(numbers, (acc, curr) => acc * curr, 1)
// 结果: 120
```

### 3. 找最大值

```typescript
const numbers = [1, 2, 3, 4, 5]
const max = MyReduce(numbers, (acc, curr) => Math.max(acc, curr), numbers[0])
// 结果: 5
```

### 4. 数组扁平化

```typescript
const nested = [[1, 2], [3, 4], [5, 6]]
const flattened = MyReduce(nested, (acc, curr) => acc.concat(curr), [] as number[])
// 结果: [1, 2, 3, 4, 5, 6]
```

### 5. 对象计数

```typescript
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
const count = MyReduce(
  fruits,
  (acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1
    return acc
  },
  {} as Record<string, number>
)
// 结果: { apple: 3, banana: 2, orange: 1 }
```

### 6. 字符串连接

```typescript
const words = ['Hello', 'World', 'from', 'MyReduce']
const sentence = MyReduce(words, (acc, curr, index) => {
  return index === 0 ? curr : `${acc} ${curr}`
})
// 结果: "Hello World from MyReduce"
```

### 7. 数组去重

```typescript
const duplicates = [1, 2, 2, 3, 3, 3, 4, 4, 5]
const unique = MyReduce(
  duplicates,
  (acc, curr) => {
    if (!acc.includes(curr)) {
      acc.push(curr)
    }
    return acc
  },
  [] as number[]
)
// 结果: [1, 2, 3, 4, 5]
```

## 特点和优势

1. **类型安全**: 使用 TypeScript 泛型，提供完整的类型推断和检查
2. **完全兼容**: 行为与原生 `Array.prototype.reduce` 完全一致
3. **边界处理**: 正确处理空数组等边界情况
4. **灵活性**: 支持各种数据类型的转换和处理
5. **可读性**: 代码清晰易懂，便于理解和维护

## 与原生 reduce 的对比

| 特性 | MyReduce | Array.prototype.reduce |
|------|----------|------------------------|
| 基本功能 | ✅ | ✅ |
| 类型安全 | ✅ | ✅ |
| 边界处理 | ✅ | ✅ |
| 性能 | 略低 | 原生优化 |
| 兼容性 | 自定义 | 内置支持 |

## 应用场景

- 学习和理解 reduce 的工作原理
- 在不支持原生 reduce 的环境中使用
- 需要自定义 reduce 行为的特殊场景
- 代码面试和算法练习

## 总结

`MyReduce` 函数是一个完整的 reduce 方法实现，展示了如何从零开始构建一个功能强大的数组处理工具。通过这个实现，可以深入理解 reduce 的工作机制和函数式编程的思想。 