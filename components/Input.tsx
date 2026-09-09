'use client'

import React, { useState, useRef, useEffect, forwardRef } from 'react'

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string
  error?: string
  value?: string // 受控模式的值
  defaultValue?: string // 非受控模式的默认值
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, value, defaultValue, onChange, className = '', placeholder, disabled, ...rest },
    ref
  ) => {
    // 判断是否为受控组件
    const isControlled = value !== undefined

    // 非受控模式的内部状态
    const [internalValue, setInternalValue] = useState(defaultValue || '')
    const internalRef = useRef<HTMLInputElement>(null)

    // 合并ref
    const inputRef = ref || internalRef

    // 获取当前值
    const currentValue = isControlled ? value : internalValue

    // 处理输入变化
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value

      // 如果是非受控组件，更新内部状态
      if (!isControlled) {
        setInternalValue(newValue)
      }

      // 调用外部onChange
      onChange?.(newValue, event)
    }

    // 样式类
    const baseInputClass = `
      w-full px-3 py-2 border rounded-md
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-all duration-200
      ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
      ${error ? 'border-red-500' : 'border-gray-300'}
      ${className}
    `.trim()

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

        <input
          ref={inputRef}
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInputClass}
          {...rest}
        />

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
