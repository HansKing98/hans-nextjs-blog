'use client'

import { useState } from 'react'

// 自定义 MyReduce 函数实现
function MyReduce<T, R>(
  array: T[],
  callback: (accumulator: R, currentValue: T, currentIndex: number, array: T[]) => R,
  initialValue?: R
): R {
  // 检查数组是否为空
  if (array.length === 0 && initialValue === undefined) {
    throw new TypeError('Reduce of empty array with no initial value')
  }

  let accumulator: R
  let startIndex: number

  // 如果提供了初始值，使用初始值作为累加器，从索引 0 开始
  if (initialValue !== undefined) {
    accumulator = initialValue
    startIndex = 0
  } else {
    // 如果没有初始值，使用数组第一个元素作为累加器，从索引 1 开始
    accumulator = array[0] as unknown as R
    startIndex = 1
  }

  // 遍历数组，执行回调函数
  for (let i = startIndex; i < array.length; i++) {
    accumulator = callback(accumulator, array[i], i, array)
  }

  return accumulator
}

export default function InputDemo() {
  const [result, setResult] = useState<string>('')

  const runExamples = () => {
    const examples: string[] = []

    // 示例 1: 数组求和
    const numbers = [1, 2, 3, 4, 5]
    const sum = MyReduce(numbers, (acc, curr) => acc + curr, 0)
    examples.push(`数组求和: [${numbers.join(', ')}] => ${sum}`)

    // 示例 2: 数组求积
    const product = MyReduce(numbers, (acc, curr) => acc * curr, 1)
    examples.push(`数组求积: [${numbers.join(', ')}] => ${product}`)

    // 示例 3: 找最大值
    const max = MyReduce(numbers, (acc, curr) => Math.max(acc, curr), numbers[0])
    examples.push(`找最大值: [${numbers.join(', ')}] => ${max}`)

    // 示例 4: 数组扁平化
    const nested = [
      [1, 2],
      [3, 4],
      [5, 6],
    ]
    const flattened = MyReduce(nested, (acc, curr) => acc.concat(curr), [] as number[])
    examples.push(`数组扁平化: ${JSON.stringify(nested)} => [${flattened.join(', ')}]`)

    // 示例 5: 对象计数
    const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
    const count = MyReduce(
      fruits,
      (acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    examples.push(`对象计数: [${fruits.join(', ')}] => ${JSON.stringify(count)}`)

    // 示例 6: 字符串连接
    const words = ['Hello', 'World', 'from', 'MyReduce']
    const sentence = MyReduce(words, (acc, curr, index) => {
      return index === 0 ? curr : `${acc} ${curr}`
    })
    examples.push(`字符串连接: [${words.join(', ')}] => "${sentence}"`)

    // 示例 7: 数组去重
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
    examples.push(`数组去重: [${duplicates.join(', ')}] => [${unique.join(', ')}]`)

    setResult(examples.join('\n\n'))
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">MyReduce 函数实现演示</h1>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">函数签名：</h2>
        <pre className="text-sm bg-white dark:bg-gray-900 p-3 rounded overflow-x-auto">
          {`function MyReduce<T, R>(
  array: T[],
  callback: (accumulator: R, currentValue: T, currentIndex: number, array: T[]) => R,
  initialValue?: R
): R`}
        </pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">实现特点：</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>支持泛型，类型安全</li>
          <li>完全模拟原生 reduce 行为</li>
          <li>支持可选的初始值参数</li>
          <li>处理空数组的边界情况</li>
          <li>提供完整的回调函数参数</li>
        </ul>
      </div>

      <button
        onClick={runExamples}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg mb-6 transition-colors"
      >
        运行示例
      </button>

      {result && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">运行结果：</h2>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result}</pre>
        </div>
      )}
    </div>
  )
}
