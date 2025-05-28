'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// 定义待办事项类型
interface Todo {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  estimated_hours?: number
  tags?: string[]
}

export default function EditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 表单字段
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Todo['status']>('pending')
  const [priority, setPriority] = useState<Todo['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  useEffect(() => {
    fetchUserAndTodo()
  }, [id])

  const fetchUserAndTodo = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/auth/user')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('获取用户信息失败')
      }

      const userData = await response.json()
      setUserId(userData.id)

      // 如果是编辑模式，获取待办事项数据
      if (id) {
        await loadTodoData()
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      setError('获取用户信息失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTodoData = async () => {
    try {
      // 从待办事项列表API获取数据，然后查找对应ID的项目
      const response = await fetch('/api/todos')

      if (response.ok) {
        const todosData = await response.json()
        const todo = todosData.data?.find((t: Todo) => t.id === id)

        if (todo) {
          setTitle(todo.title)
          setDescription(todo.description || '')
          setStatus(todo.status)
          setPriority(todo.priority)
          setDueDate(todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '')
          setEstimatedHours(todo.estimated_hours ? todo.estimated_hours.toString() : '')
          setTagsInput(todo.tags ? todo.tags.join(', ') : '')
        } else {
          setError('未找到指定的待办事项')
        }
      } else {
        setError('获取待办事项失败')
      }
    } catch (error) {
      console.error('加载待办事项失败:', error)
      setError('加载待办事项内容失败，请稍后再试')
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      // 处理标签
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const todoData = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        tags,
      }

      let response

      if (id) {
        // 更新现有待办事项
        response = await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todoData),
        })
      } else {
        // 创建新待办事项
        response = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todoData),
        })
      }

      const result = await response.json()

      if (response.ok) {
        // 返回待办事项列表页
        router.push('/todo')
      } else {
        setError(result.message || '保存失败')
      }
    } catch (error) {
      console.error('保存待办事项失败:', error)
      setError('保存待办事项失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: '待处理' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
    { value: 'on_hold', label: '暂停' },
  ]

  const priorityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'urgent', label: '紧急' },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-8 border-b pb-4">
          <svg
            className="h-8 w-8 text-blue-600 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800">智能待办</h1>
        </div>

        <div className="mb-4 flex items-center">
          <svg
            className="h-6 w-6 text-blue-600 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <h2 className="text-xl font-medium">{id ? '编辑待办事项' : '新增待办事项'}</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

        <div className="space-y-6">
          {/* 标题 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              标题 *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入待办事项标题..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          {/* 描述 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入详细描述..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* 状态和优先级 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Todo['status'])}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                优先级
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Todo['priority'])}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 截止时间和预估工时 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                截止时间
              </label>
              <input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="estimatedHours"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                预估工时（小时）
              </label>
              <input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="输入标签，用逗号分隔..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">例如：工作, 紧急, 学习</p>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : null}
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
