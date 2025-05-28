# 数据库错误处理功能

## 快速开始

本项目已集成完整的数据库连接错误检测和前端提示系统。当数据库连接出现问题时，用户会看到友好的错误提示。

### ✨ 主要功能

- 🔍 **智能错误检测**: 自动识别数据库连接、认证和配置错误
- 💬 **友好错误提示**: 为用户显示易懂的错误信息而不是技术术语
- 🔄 **一键重试**: 提供"重试连接"按钮，方便用户操作
- 📊 **健康监控**: 实时检查数据库连接状态

### 🚀 使用方法

#### 1. 测试数据库连接

```bash
# 运行测试脚本
node scripts/test-db-connection.js

# 或通过API检查
curl http://localhost:3000/api/health
```

#### 2. 前端体验

访问登录页面或待办事项页面，当数据库连接异常时会自动显示错误提示：

- 🟠 **数据库错误**: 橙色警告样式，带有重试按钮
- 🔴 **普通错误**: 红色错误样式，标准错误信息

#### 3. 错误恢复

用户可以点击"重试连接"按钮检查数据库状态，连接恢复后会自动刷新数据。

### 🧪 测试场景

模拟不同的数据库错误情况来测试功能：

```bash
# 场景1: 数据库未配置
# 删除 .env.local 中的 DATABASE_URL

# 场景2: 连接失败  
DATABASE_URL=postgresql://user:pass@wronghost:5432/db

# 场景3: 认证失败
DATABASE_URL=postgresql://wronguser:wrongpass@host:5432/db

# 场景4: 数据库不存在
DATABASE_URL=postgresql://user:pass@host:5432/nonexistent_db
```

### 📖 详细文档

查看 `docs/DATABASE_ERROR_HANDLING.md` 获取完整的使用指南和API文档。

### 🔧 开发者指南

在新的API路由中添加错误处理：

```javascript
import { handleDatabaseError } from '@/lib/db'

export async function GET(request) {
  try {
    // 数据库操作
  } catch (error) {
    const dbError = handleDatabaseError(error)
    if (dbError.type === 'CONNECTION_ERROR') {
      return NextResponse.json({
        message: dbError.message,
        type: 'DATABASE_CONNECTION_ERROR',
        code: 'DB_CONNECTION_FAILED',
      }, { status: 503 })
    }
    // 处理其他错误...
  }
}
```

在前端组件中检测错误：

```tsx
if (response.status === 503 && data?.type === 'DATABASE_CONNECTION_ERROR') {
  setIsDatabaseError(true)
  setError(data.message)
}
```

### 📁 相关文件

- `lib/db.js` - 数据库连接和错误处理核心
- `components/DatabaseErrorAlert.tsx` - 错误提示组件  
- `lib/api-utils.js` - API错误处理工具
- `app/api/health/route.js` - 健康检查端点

---

💡 **提示**: 这个功能让您的应用对数据库连接问题更加健壮，为用户提供更好的体验。
