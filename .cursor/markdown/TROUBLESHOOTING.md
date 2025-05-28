# 智能待办事项系统 - 问题排查指南

## 🔧 登录成功但没有跳转的解决方案

### 问题描述

用户输入正确的用户名密码后，系统提示登录成功，但页面没有自动跳转到待办事项页面。

### 已修复的问题

✅ **Cookie设置问题**: 修复了`createAuthResponse`函数，使用`NextResponse.cookies.set()`正确设置HttpOnly cookie。

### 排查步骤

#### 1. 检查浏览器开发者工具

1. 打开浏览器开发者工具 (F12)
2. 切换到 **Network** 标签
3. 尝试登录，观察以下内容：
   - `/api/auth/login` 请求是否返回 200 状态码
   - 响应头中是否包含 `Set-Cookie` 字段
   - Cookie是否正确设置 (在Application/Storage标签查看)

#### 2. 检查控制台错误

1. 切换到 **Console** 标签
2. 查看是否有JavaScript错误
3. 登录成功后应该看到: `登录成功: {用户信息}`

#### 3. 验证cookie设置

在浏览器控制台运行：

```javascript
// 检查cookie是否存在
document.cookie.includes('token')

// 或者直接查看所有cookie
document.cookie
```

#### 4. 测试API端点

使用以下命令测试登录API：

```bash
# 测试登录
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "123456"}' \
  -i

# 检查响应中的Set-Cookie头
```

### 常见问题及解决方案

#### ❌ 问题1: Cookie未设置

**症状**: 登录请求成功但没有Set-Cookie头
**解决**: 已修复 - 更新了`createAuthResponse`函数使用NextResponse

#### ❌ 问题2: JavaScript错误阻止跳转

**症状**: 控制台显示错误信息
**解决**:

- 检查Next.js版本兼容性
- 确保所有依赖正确安装
- 查看具体错误信息

#### ❌ 问题3: 路由问题

**症状**: 尝试跳转但页面不存在
**解决**: 确认以下页面存在：

- `/app/todo/page.tsx`
- `/app/todo-edit/page.tsx`

#### ❌ 问题4: 认证中间重定向

**症状**: 跳转到todo页面后立即被重定向回登录页
**解决**: 检查`/api/auth/user`端点是否正常工作

### 手动测试流程

1. **清除浏览器缓存和cookie**

   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Cmd+Option+E
   ```

2. **重新访问登录页面**

   ```
   http://localhost:3000/login
   ```

3. **使用测试账号登录**

   ```
   用户名: admin
   密码: 123456
   ```

4. **验证跳转**
   - 应该自动跳转到: `http://localhost:3000/todo`
   - 页面应该显示用户名: "欢迎，admin"
   - 应该看到示例待办事项

### 环境检查

#### 确认环境变量

创建 `.env.local` 文件：

```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret_key
```

#### 确认依赖版本

```bash
npm list @neondatabase/serverless
npm list jose
npm list next
```

#### 重启开发服务器

```bash
# 停止服务器
Ctrl+C

# 重新启动
npm run dev
```

### 调试模式

如果问题仍然存在，启用详细日志：

1. 在 `app/login/page.tsx` 中添加更多调试信息：

```javascript
console.log('开始登录请求');
console.log('请求体:', { username, password });
console.log('响应状态:', response.status);
console.log('响应数据:', data);
console.log('准备跳转到 /todo');
```

2. 在 `app/api/auth/login/route.js` 中添加服务端日志：

```javascript
console.log('收到登录请求:', { username });
console.log('用户查找结果:', user ? '找到用户' : '未找到用户');
console.log('密码验证结果:', '验证通过');
console.log('生成token成功');
```

### 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

- 浏览器类型和版本
- Node.js版本
- 控制台错误信息
- Network请求详情
- 系统环境 (Windows/Mac/Linux)

---

## 📱 快速验证命令

运行以下命令验证系统状态：

```bash
# 1. 验证服务器运行
curl -s http://localhost:3000/login | grep "智能待办" > /dev/null && echo "✅ 登录页面正常" || echo "❌ 登录页面异常"

# 2. 验证登录API
curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"username": "admin", "password": "123456"}' | grep "登录成功" > /dev/null && echo "✅ 登录API正常" || echo "❌ 登录API异常"

# 3. 验证待办事项页面
curl -s http://localhost:3000/todo | grep "智能待办" > /dev/null && echo "✅ 待办页面正常" || echo "❌ 待办页面异常"
```

现在系统应该能够正常工作了！🎉
