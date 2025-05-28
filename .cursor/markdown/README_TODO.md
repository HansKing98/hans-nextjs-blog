# 智能待办事项管理系统

基于 Next.js + Neon PostgreSQL 构建的现代化待办事项管理应用。

## 🚀 功能特性

### 用户管理

- ✅ 用户注册和登录
- ✅ JWT 基础认证
- ✅ 安全的密码哈希 (SHA256)
- ✅ Cookie 会话管理

### 待办事项管理

- ✅ 创建、编辑、删除待办事项
- ✅ 状态管理 (待处理、进行中、已完成、已取消、暂停)
- ✅ 优先级设置 (低、中、高、紧急)
- ✅ 截止时间和工时估算
- ✅ 标签系统
- ✅ 分类过滤
- ✅ 实时状态更新

### 用户界面

- ✅ 现代化响应式设计
- ✅ 直观的操作界面
- ✅ 加载状态和错误处理
- ✅ 移动端适配

## 🗄️ 数据库架构

### 核心表结构

1. **users** - 用户管理
   - id, email, username, full_name, password_hash
   - 创建时间、更新时间

2. **todos** - 待办事项
   - 基本信息：title, description
   - 状态管理：status, priority
   - 时间管理：due_date, estimated_hours
   - 分配管理：created_by, assigned_to
   - 标签系统：tags (JSONB)
   - 审计：created_at, updated_at

3. **projects** - 项目管理 (扩展)
   - name, description, color, owner_id

4. **categories** - 分类管理 (扩展)
   - name, description, color, project_id

5. **todo_comments** - 评论系统 (扩展)
   - 评论内容、创建者、关联待办

6. **todo_history** - 审计日志 (扩展)
   - 变更历史、操作类型、变更数据

### 数据库特性

- ✅ 完整的关系约束
- ✅ 自动时间戳
- ✅ 性能索引
- ✅ JSONB 支持
- ✅ 枚举类型

## 🛠️ 技术栈

### 前端

- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **React Hooks** - 状态管理

### 后端

- **Next.js API Routes** - 服务端 API
- **Neon PostgreSQL** - 云数据库
- **@neondatabase/serverless** - 数据库连接
- **jose** - JWT 处理

### 安全

- **SHA256** - 密码哈希
- **JWT** - 会话管理
- **Cookie HttpOnly** - 安全存储
- **SQL 注入防护** - 参数化查询

## 📁 项目结构

```
hans-nextjs-blog/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js      # 登录 API
│   │   │   ├── user/route.js       # 用户信息 API
│   │   │   └── logout/route.js     # 登出 API
│   │   └── todos/
│   │       ├── route.js            # 待办事项列表 API
│   │       └── [id]/route.js       # 单个待办事项 API
│   ├── login/
│   │   └── page.tsx               # 登录页面
│   ├── todo/
│   │   └── page.tsx               # 待办事项列表页面
│   └── todo-edit/
│       └── page.tsx               # 编辑待办事项页面
├── lib/
│   ├── db.js                      # 数据库连接和工具函数
│   └── auth.js                    # 认证相关工具函数
└── database/
    └── schema.sql                 # 完整数据库架构
```

## 🚦 API 接口

### 认证相关

- `POST /api/auth/login` - 用户登录
- `GET /api/auth/user` - 获取当前用户信息
- `POST /api/auth/logout` - 用户登出

### 待办事项

- `GET /api/todos` - 获取用户待办事项列表
- `POST /api/todos` - 创建新待办事项
- `PUT /api/todos/[id]` - 更新待办事项
- `DELETE /api/todos/[id]` - 删除待办事项

## 🔧 环境配置

创建 `.env.local` 文件：

```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret_key
```

## 📱 页面路由

- `/login` - 登录页面
- `/todo` - 待办事项主页
- `/todo-edit` - 新增待办事项
- `/todo-edit?id=xxx` - 编辑待办事项

## 🎯 核心功能流程

### 用户认证流程

1. 用户在登录页面输入凭据
2. 后端验证用户名密码
3. 生成 JWT 令牌
4. 设置 HttpOnly Cookie
5. 跳转到待办事项页面

### 待办事项管理流程

1. 用户查看待办事项列表
2. 可按状态筛选 (全部/待处理/进行中/已完成)
3. 快速状态切换 (待处理→进行中→已完成)
4. 编辑/删除操作
5. 实时数据同步

## 🔒 安全特性

- **认证保护**: 所有 API 都需要有效 JWT
- **授权控制**: 用户只能操作自己的数据
- **密码安全**: SHA256 哈希存储
- **会话安全**: HttpOnly Cookie 防止 XSS
- **SQL 安全**: 参数化查询防注入

## 🌟 扩展特性

数据库已预留扩展能力：

- 项目分组管理
- 任务分类系统
- 评论和协作
- 操作历史审计
- 多用户协作
- 文件附件
- 通知提醒

## 🚀 运行项目

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量 (创建 .env.local)

3. 启动开发服务器：

```bash
npm run dev
```

4. 访问应用：
   - 登录页面: <http://localhost:3000/login>
   - 测试账号: admin / 123456

## 📝 使用说明

1. **首次使用**: 需要创建测试用户 (username: admin, password: 123456)
2. **登录**: 使用测试账号登录系统
3. **创建待办**: 点击"新增"按钮创建待办事项
4. **管理待办**: 在列表页面查看、编辑、删除待办事项
5. **状态管理**: 使用快捷按钮切换待办状态
6. **筛选查看**: 使用顶部筛选器按状态查看

## 🎨 界面特色

- **现代化设计**: 采用 Tailwind CSS 构建
- **响应式布局**: 适配各种屏幕尺寸
- **直观操作**: 简洁明了的用户界面
- **状态可视**: 不同颜色区分状态和优先级
- **加载反馈**: 完善的加载状态和错误提示

这个待办事项管理系统展示了现代 Web 应用的完整实现，包含了认证、数据管理、用户界面等核心功能，具备良好的扩展性和维护性。
