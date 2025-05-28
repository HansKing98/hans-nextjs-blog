import React, { useState, useEffect } from 'react'

interface DatabaseErrorAlertProps {
  show: boolean
  message: string
  onRetry?: () => void
  onClose?: () => void
  type?: 'connection' | 'config' | 'general'
}

export const DatabaseErrorAlert: React.FC<DatabaseErrorAlertProps> = ({
  show,
  message,
  onRetry,
  onClose,
  type = 'general',
}) => {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
  }, [show])

  if (!isVisible) return null

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full shadow-lg rounded-lg border bg-red-50 border-red-200">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">数据库连接异常</h3>
            <div className="mt-1 text-sm text-red-700">
              <p>{message}</p>
            </div>
            <div className="mt-4 flex gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 font-medium py-1.5 px-3 rounded-md transition-colors"
                >
                  重试连接
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1.5 px-3 rounded-md transition-colors"
              >
                知道了
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// 数据库连接状态检查 Hook
export const useDatabaseStatus = () => {
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/health')
      const data = await response.json()

      if (response.ok && data.status === 'healthy') {
        setIsConnected(true)
        setError(null)
      } else {
        setIsConnected(false)
        setError(data.database || data.message || '数据库连接失败')
      }
    } catch (err) {
      setIsConnected(false)
      setError('无法检查数据库连接状态')
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return {
    isConnected,
    error,
    isChecking,
    checkConnection,
  }
}

export default DatabaseErrorAlert
