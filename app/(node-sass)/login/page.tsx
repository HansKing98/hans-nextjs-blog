'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isDatabaseError, setIsDatabaseError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      setError('')
      setIsDatabaseError(false)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('登录成功:', data)
        // 登录成功，跳转到待办事项页面
        router.push('/todo')
      } else {
        // 检查是否为数据库连接错误
        if (response.status === 503 && data?.type === 'DATABASE_CONNECTION_ERROR') {
          setIsDatabaseError(true)
          setError(data.message || '数据库连接异常，请联系管理员')
        } else {
          // 其他登录错误
          setError(data.message || '登录失败，请检查用户名和密码')
        }
      }
    } catch (err) {
      console.error('登录错误:', err)
      // 网络错误也可能是数据库问题
      setIsDatabaseError(true)
      setError('网络连接异常，请稍后再试或联系管理员')
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
        alert('数据库连接已恢复正常，请重新登录')
      } else {
        setError('数据库连接仍然异常，请联系管理员')
      }
    } catch (err) {
      setError('无法检查数据库连接状态')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <svg
            className="h-12 w-12 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1V3H9V1L3 7V9H1V11H3L4 21C4.1 21.5 4.4 22 5 22H19C19.6 22 19.9 21.5 20 21L21 11H23V9H21ZM11 19H9V13H11V19ZM15 19H13V13H15V19Z" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Log in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          or{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            sign up
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className={`p-3 rounded-md text-sm ${
                  isDatabaseError
                    ? 'bg-orange-50 text-orange-800 border border-orange-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {isDatabaseError ? (
                      <svg
                        className="w-5 h-5 text-orange-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p>{error}</p>
                    {isDatabaseError && (
                      <button
                        type="button"
                        onClick={handleRetryConnection}
                        disabled={isLoading}
                        className="mt-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium py-1 px-2 rounded transition-colors disabled:opacity-50"
                      >
                        {isLoading ? '检查中...' : '重试连接'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-gray-700">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
