# 数据库错误处理功能说明

## 概述

本项目实现了完整的数据库连接错误检测和前端提示系统，当数据库未配置或连接失败时，会在前端显示友好的错误提示，并提供重试连接的功能。

## 功能特性

### 🔍 错误检测
- **数据库连接检查**: 自动检测数据库是否可访问
- **错误类型识别**: 区分连接错误、认证错误和普通业务错误
- **智能错误分类**: 根据错误信息提供针对性的提示

### 💬 用户提示
- **可视化错误提示**: 在前端显示清晰的错误信息
- **错误类型区分**: 数据库错误和普通错误使用不同的样式
- **操作引导**: 提供"重试连接"等操作按钮

### 🔄 自动恢复
- **健康状态检查**: 提供API健康检查端点
- **重试机制**: 用户可手动重试连接
- **自动重新获取**: 连接恢复后自动刷新数据

## API 端点

### 健康检查
```
GET /api/health
```

**响应示例（正常）:**
```json
{
  "status": "healthy",
  "database": "数据库连接正常",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**响应示例（异常）:**
```json
{
  "status": "unhealthy", 
  "database": "无法连接到数据库服务器，请检查数据库配置",
  "error": "connect ECONNREFUSED 127.0.0.1:5432",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### API 错误响应格式

当数据库连接出现问题时，所有API都会返回标准化的错误响应：

```json
{
  "message": "数据库连接异常，请稍后重试或联系管理员",
  "type": "DATABASE_CONNECTION_ERROR", 
  "code": "DB_CONNECTION_FAILED"
}
```

**HTTP状态码**: `503 Service Unavailable`

## 前端组件使用

### DatabaseErrorAlert 组件

```tsx
import { DatabaseErrorAlert } from '@/components/DatabaseErrorAlert'

function MyComponent() {
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const handleRetry = async () => {
    // 重试逻辑
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setShowError(false)
        // 重新获取数据
      }
    } catch (err) {
      console.error('重试失败:', err)
    }
  }

  return (
    <div>
      <DatabaseErrorAlert
        show={showError}
        message={errorMessage}
        onRetry={handleRetry}
        onClose={() => setShowError(false)}
        type="connection"
      />
      {/* 其他内容 */}
    </div>
  )
}
```

### useDatabaseStatus Hook

```tsx
import { useDatabaseStatus } from '@/components/DatabaseErrorAlert'

function MyComponent() {
  const { isConnected, error, isChecking, checkConnection } = useDatabaseStatus()
  
  if (!isConnected && error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={checkConnection} disabled={isChecking}>
          {isChecking ? '检查中...' : '重试连接'}
        </button>
      </div>
    )
  }
  
  return <div>正常内容</div>
}
```

### API 错误处理工具

```tsx
import { fetchWithErrorHandling } from '@/lib/api-utils'

async function fetchData() {
  const result = await fetchWithErrorHandling('/api/todos')
  
  if (result.isDatabaseError) {
    // 处理数据库错误
    showDatabaseErrorAlert(result.message)
  } else if (result.type === 'SUCCESS') {
    // 处理成功响应
    setData(result.data)
  } else {
    // 处理其他错误
    showGeneralError(result.message)
  }
}
```

## 错误类型说明

### 连接错误 (CONNECTION_ERROR)
- **ENOTFOUND**: DNS解析失败，数据库地址不正确
- **ECONNREFUSED**: 连接被拒绝，数据库服务未启动
- **TIMEOUT**: 连接超时，网络问题或数据库响应慢

### 认证错误 (AUTH_ERROR)  
- **密码错误**: 数据库密码不正确
- **用户不存在**: 数据库用户名不存在

### 配置错误 (CONFIG_ERROR)
- **数据库不存在**: 指定的数据库名称不存在
- **权限不足**: 用户没有访问数据库的权限

## 自定义错误处理

### 在新的API路由中添加错误处理

```javascript
import { handleDatabaseError } from '@/lib/db'

export async function GET(request) {
  try {
    // 数据库操作
    const result = await someDbOperation()
    return NextResponse.json({ data: result })
  } catch (error) {
    // 使用统一的错误处理
    const dbError = handleDatabaseError(error)
    if (dbError.type === 'CONNECTION_ERROR') {
      return NextResponse.json(
        {
          message: dbError.message,
          type: 'DATABASE_CONNECTION_ERROR',
          code: 'DB_CONNECTION_FAILED',
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { message: '操作失败' }, 
      { status: 500 }
    )
  }
}
```

### 在前端组件中检测数据库错误

```tsx
async function handleApiCall() {
  try {
    const response = await fetch('/api/some-endpoint')
    const data = await response.json()
    
    if (response.status === 503 && data?.type === 'DATABASE_CONNECTION_ERROR') {
      // 显示数据库错误提示
      setIsDatabaseError(true)
      setError(data.message)
    } else if (!response.ok) {
      // 处理其他错误
      setError(data.message || '操作失败')
    } else {
      // 成功处理
      handleSuccess(data)
    }
  } catch (err) {
    // 网络错误也可能是数据库问题
    setIsDatabaseError(true)
    setError('网络连接异常，请检查数据库配置')
  }
}
```

## 配置要求

确保在环境变量中正确配置数据库连接：

```env
# .env.local
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret
```

## 测试场景

### 1. 数据库未配置
- 删除或注释 `DATABASE_URL` 环境变量
- 预期: 应用启动时抛出错误

### 2. 数据库连接失败
- 配置错误的数据库地址或端口
- 预期: 前端显示"无法连接到数据库服务器"错误

### 3. 数据库认证失败
- 配置错误的用户名或密码
- 预期: 前端显示"数据库认证失败"错误

### 4. 网络超时
- 配置一个响应很慢的数据库地址
- 预期: 前端显示"数据库连接超时"错误

## 最佳实践

1. **统一错误处理**: 在所有API路由中使用 `handleDatabaseError` 函数
2. **用户友好提示**: 避免显示技术性的错误信息给最终用户
3. **重试机制**: 为用户提供重试连接的选项
4. **日志记录**: 在服务器端记录详细的错误信息用于调试
5. **监控告警**: 考虑集成监控系统来及时发现数据库问题

## 故障排除

### 常见问题

**Q: 为什么重试连接后还是显示错误？**
A: 检查数据库服务是否真的已经启动，以及网络连接是否正常。

**Q: 如何查看详细的错误信息？**
A: 查看浏览器开发者工具的Console和Network标签，服务器端日志也会记录详细错误。

**Q: 如何自定义错误提示信息？**
A: 修改 `lib/db.js` 中的 `handleDatabaseError` 函数，或在前端组件中自定义错误显示逻辑。

## 相关文件

- `lib/db.js` - 数据库连接和错误处理
- `lib/api-utils.js` - API错误处理工具
- `components/DatabaseErrorAlert.tsx` - 错误提示组件
- `app/api/health/route.js` - 健康检查API
- `app/(node-sass)/login/page.tsx` - 登录页面示例
- `app/(node-sass)/todo/page.tsx` - 待办事项页面示例 