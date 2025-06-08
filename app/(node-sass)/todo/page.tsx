'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  created_at: string
  category_name?: string
  project_name?: string
}

export default function TodoPage() {
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [error, setError] = useState('')
  const [isDatabaseError, setIsDatabaseError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserAndTodos()
  }, [])

  const fetchUserAndTodos = async () => {
    try {
      setIsLoading(true)
      setError('')
      setIsDatabaseError(false)

      // 获取用户信息
      const userResponse = await fetch('/api/auth/user')

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/login')
          return
        }
        const userData = await userResponse.json()
        if (userResponse.status === 503 && userData?.type === 'DATABASE_CONNECTION_ERROR') {
          setIsDatabaseError(true)
          setError(userData.message || '数据库连接异常，无法验证用户身份')
          return
        }
        throw new Error('获取用户信息失败')
      }

      const userData = await userResponse.json()
      setUsername(userData.username)
      setUserId(userData.id)

      // 获取待办事项
      const todosResponse = await fetch('/api/todos')

      if (todosResponse.ok) {
        const todosData = await todosResponse.json()
        setTodos(todosData.data || [])
      } else {
        const todosData = await todosResponse.json()
        if (todosResponse.status === 503 && todosData?.type === 'DATABASE_CONNECTION_ERROR') {
          setIsDatabaseError(true)
          setError(todosData.message || '数据库连接异常，无法获取待办事项')
        } else {
          console.error('获取待办事项失败')
          setError('获取待办事项失败')
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error)
      setIsDatabaseError(true)
      setError('网络连接异常，请检查数据库配置')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetryConnection = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/health')
      const data = await response.json()

      if (response.ok && data.status === 'healthy') {
        setIsDatabaseError(false)
        setError('')
        // 重新获取数据
        await fetchUserAndTodos()
      } else {
        setError('数据库连接仍然异常，请联系管理员')
      }
    } catch (err) {
      setError('无法检查数据库连接状态')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const handleAddTodo = () => {
    router.push('/todo-edit')
  }

  const handleEditTodo = (id: string) => {
    router.push(`/todo-edit?id=${id}`)
  }

  const handleDeleteTodo = async (id: string) => {
    if (!confirm('确定要删除这个待办事项吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 重新获取待办事项列表
        fetchUserAndTodos()
      } else {
        const errorData = await response.json()
        if (response.status === 503 && errorData?.type === 'DATABASE_CONNECTION_ERROR') {
          setIsDatabaseError(true)
          setError(errorData.message || '数据库连接异常，删除失败')
        } else {
          alert(errorData.message || '删除失败')
        }
      }
    } catch (error) {
      console.error('删除待办事项错误:', error)
      setIsDatabaseError(true)
      setError('网络连接异常，删除失败')
    }
  }

  const handleStatusChange = async (id: string, newStatus: Todo['status']) => {
    try {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return

      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...todo,
          status: newStatus,
        }),
      })

      if (response.ok) {
        // 重新获取待办事项列表
        fetchUserAndTodos()
      } else {
        const errorData = await response.json()
        if (response.status === 503 && errorData?.type === 'DATABASE_CONNECTION_ERROR') {
          setIsDatabaseError(true)
          setError(errorData.message || '数据库连接异常，更新失败')
        } else {
          alert(errorData.message || '更新失败')
        }
      }
    } catch (error) {
      console.error('更新状态错误:', error)
      setIsDatabaseError(true)
      setError('网络连接异常，更新失败')
    }
  }

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'all') return true
    return todo.status === filter
  })

  const getStatusColor = (status: Todo['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case 'on_hold':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
    }
  }

  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'low':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const statusLabels = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    on_hold: '暂停',
  }

  const priorityLabels = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-6 transition-colors">
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">待办事项管理</h1>
            {username && <span className="ml-4 text-gray-600 dark:text-gray-400">欢迎，{username}</span>}
          </div>

          <button
            onClick={handleAddTodo}
            className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <svg
              className="h-5 w-5 mr-1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            新增
          </button>
        </div>

        {/* 数据库错误提示 */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-md ${
              isDatabaseError
                ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {isDatabaseError ? (
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3
                  className={`text-sm font-medium ${
                    isDatabaseError ? 'text-orange-800 dark:text-orange-200' : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {isDatabaseError ? '数据库连接异常' : '系统错误'}
                </h3>
                <div
                  className={`mt-1 text-sm ${isDatabaseError ? 'text-orange-700 dark:text-orange-300' : 'text-red-700 dark:text-red-300'}`}
                >
                  <p>{error}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  {isDatabaseError && (
                    <button
                      type="button"
                      onClick={handleRetryConnection}
                      disabled={isLoading}
                      className="text-sm bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-200 font-medium py-1.5 px-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '检查中...' : '重试连接'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setIsDatabaseError(false)
                    }}
                    className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-1.5 px-3 rounded-md transition-colors"
                  >
                    知道了
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 过滤器 */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === status
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? '全部' : statusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center">
            <svg
              className="animate-spin h-10 w-10 mx-auto text-blue-500 dark:text-blue-400"
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
            <p className="mt-3 text-gray-500 dark:text-gray-400">加载中...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">暂无待办事项，点击新增按钮添加</p>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/20 transition-shadow bg-white dark:bg-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{todo.title}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                            todo.status
                          )}`}
                        >
                          {statusLabels[todo.status]}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                          {priorityLabels[todo.priority]}
                        </span>
                      </div>

                      {todo.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{todo.description}</p>
                      )}

                      {todo.tags && todo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {todo.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        创建时间: {new Date(todo.created_at).toLocaleString()}
                        {todo.due_date && (
                          <span className="ml-4">
                            截止时间: {new Date(todo.due_date).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {/* 状态快速切换 */}
                      {todo.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(todo.id, 'in_progress')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          title="开始执行"
                        >
                          开始
                        </button>
                      )}
                      {todo.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusChange(todo.id, 'completed')}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm"
                          title="标记完成"
                        >
                          完成
                        </button>
                      )}

                      <button
                        onClick={() => handleEditTodo(todo.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        title="编辑"
                      >
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        title="删除"
                      >
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
