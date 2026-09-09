// 简单的 JavaScript reduce 实现
function myReduce(array, callback, initialValue) {
  // 检查数组是否为空且没有初始值
  if (array.length === 0 && initialValue === undefined) {
    throw new TypeError('Reduce of empty array with no initial value')
  }

  let accumulator
  let startIndex

  // 如果提供了初始值，使用初始值作为累加器，从索引 0 开始
  if (initialValue !== undefined) {
    accumulator = initialValue
    startIndex = 0
  } else {
    // 如果没有初始值，使用数组第一个元素作为累加器，从索引 1 开始
    accumulator = array[0]
    startIndex = 1
  }

  // 遍历数组，执行回调函数
  for (let i = startIndex; i < array.length; i++) {
    accumulator = callback(accumulator, array[i], i, array)
  }

  return accumulator
}

// 使用示例
console.log('=== JavaScript reduce 实现演示 ===\n')

// 示例 1: 数组求和
const numbers = [1, 2, 3, 4, 5]
const sum = myReduce(numbers, (acc, curr) => acc + curr, 0)
console.log(`1. 数组求和: [${numbers.join(', ')}] => ${sum}`)

// 示例 2: 数组求积
const product = myReduce(numbers, (acc, curr) => acc * curr, 1)
console.log(`2. 数组求积: [${numbers.join(', ')}] => ${product}`)

// 示例 3: 找最大值
const max = myReduce(numbers, (acc, curr) => Math.max(acc, curr))
console.log(`3. 找最大值: [${numbers.join(', ')}] => ${max}`)

// 示例 4: 数组扁平化
const nested = [
  [1, 2],
  [3, 4],
  [5, 6],
]
const flattened = myReduce(nested, (acc, curr) => acc.concat(curr), [])
console.log(`4. 数组扁平化: [[1,2],[3,4],[5,6]] => [${flattened.join(', ')}]`)

// 示例 5: 对象计数
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
const count = myReduce(
  fruits,
  (acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1
    return acc
  },
  {}
)
console.log(`5. 对象计数: [${fruits.join(', ')}] => ${JSON.stringify(count)}`)

// 示例 6: 字符串连接
const words = ['Hello', 'World', 'from', 'myReduce']
const sentence = myReduce(words, (acc, curr, index) => {
  return index === 0 ? curr : `${acc} ${curr}`
})
console.log(`6. 字符串连接: [${words.join(', ')}] => "${sentence}"`)

// 示例 7: 数组去重
const duplicates = [1, 2, 2, 3, 3, 3, 4, 4, 5]
const unique = myReduce(
  duplicates,
  (acc, curr) => {
    if (!acc.includes(curr)) {
      acc.push(curr)
    }
    return acc
  },
  []
)
console.log(`7. 数组去重: [${duplicates.join(', ')}] => [${unique.join(', ')}]`)

// 示例 8: 计算平均值
const average = myReduce(
  numbers,
  (acc, curr, index, array) => {
    acc += curr
    return index === array.length - 1 ? acc / array.length : acc
  },
  0
)
console.log(`8. 计算平均值: [${numbers.join(', ')}] => ${average}`)

// 示例 9: 反转数组
const reversed = myReduce(numbers, (acc, curr) => [curr, ...acc], [])
console.log(`9. 反转数组: [${numbers.join(', ')}] => [${reversed.join(', ')}]`)

// 示例 10: 分组
const people = [
  { name: '张三', age: 25 },
  { name: '李四', age: 30 },
  { name: '王五', age: 25 },
  { name: '赵六', age: 30 },
]
const groupedByAge = myReduce(
  people,
  (acc, person) => {
    const age = person.age
    if (!acc[age]) {
      acc[age] = []
    }
    acc[age].push(person.name)
    return acc
  },
  {}
)
console.log('10. 按年龄分组:', JSON.stringify(groupedByAge, null, 2))

console.log('\n=== 错误处理测试 ===')

// 测试空数组错误
try {
  myReduce([], (acc, curr) => acc + curr)
} catch (error) {
  console.log('空数组错误:', error.message)
}

// 正常情况：空数组但有初始值
const emptyResult = myReduce([], (acc, curr) => acc + curr, 0)
console.log('空数组但有初始值:', emptyResult)

module.exports = myReduce
