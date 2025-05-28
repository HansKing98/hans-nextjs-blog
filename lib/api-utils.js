// API 错误处理工具函数

// 检测是否为数据库连接错误
export function isDatabaseConnectionError(error) {
  const errorMsg = error?.message?.toLowerCase() || ''

  return (
    errorMsg.includes('enotfound') ||
    errorMsg.includes('econnrefused') ||
    errorMsg.includes('timeout') ||
    errorMsg.includes('etimedout') ||
    errorMsg.includes('connection') ||
    errorMsg.includes('network')
  )
}

// 统一处理 API 响应中的数据库错误
export function handleApiResponse(response, data) {
  // 检查是否为数据库连接错误
  if (response.status === 503 && data?.type === 'DATABASE_CONNECTION_ERROR') {
    return {
      isDatabaseError: true,
      message: data.message || '数据库连接异常，请稍后重试',
      code: data.code || 'DB_CONNECTION_FAILED',
      type: 'CONNECTION_ERROR',
    }
  }

  // 检查其他类型的错误
  if (!response.ok) {
    return {
      isDatabaseError: false,
      message: data?.message || '请求失败',
      code: data?.code || 'REQUEST_FAILED',
      type: 'API_ERROR',
    }
  }

  return {
    isDatabaseError: false,
    message: null,
    type: 'SUCCESS',
  }
}

// 带数据库错误检测的 fetch 包装器
export async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options)
    const data = await response.json()

    const errorInfo = handleApiResponse(response, data)

    return {
      response,
      data,
      ...errorInfo,
    }
  } catch (error) {
    console.error('Fetch error:', error)

    // 网络错误可能也是数据库连接问题
    const isDatabaseError = isDatabaseConnectionError(error)

    return {
      response: null,
      data: null,
      isDatabaseError,
      message: isDatabaseError ? '网络连接异常，请检查数据库配置' : '网络请求失败，请稍后重试',
      code: isDatabaseError ? 'NETWORK_DB_ERROR' : 'NETWORK_ERROR',
      type: isDatabaseError ? 'CONNECTION_ERROR' : 'NETWORK_ERROR',
    }
  }
}
