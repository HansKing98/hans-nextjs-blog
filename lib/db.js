import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

const sql = neon(process.env.DATABASE_URL)

export { sql }

// 数据库连接检查函数
export async function checkDatabaseConnection() {
  try {
    // 尝试执行一个简单的查询来测试连接
    const result = await sql`SELECT 1 as connected`
    return {
      connected: true,
      message: '数据库连接正常',
    }
  } catch (error) {
    console.error('数据库连接检查失败:', error)

    // 根据不同的错误类型返回相应的消息
    let errorMessage = '数据库连接失败'

    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = '无法连接到数据库服务器，请检查数据库配置'
    } else if (error.message?.includes('password authentication failed')) {
      errorMessage = '数据库认证失败，请检查用户名和密码'
    } else if (error.message?.includes('database') && error.message?.includes('does not exist')) {
      errorMessage = '数据库不存在，请检查数据库名称'
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = '数据库连接超时，请稍后重试'
    }

    return {
      connected: false,
      message: errorMessage,
      error: error.message,
    }
  }
}

// 数据库错误处理包装器
export function handleDatabaseError(error) {
  console.error('数据库操作错误:', error)

  // 如果是连接相关的错误
  if (
    error.message?.includes('ENOTFOUND') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('timeout') ||
    error.message?.includes('ETIMEDOUT')
  ) {
    return {
      type: 'CONNECTION_ERROR',
      message: '数据库连接异常，请稍后重试或联系管理员',
    }
  }

  // 如果是认证相关的错误
  if (error.message?.includes('authentication') || error.message?.includes('password')) {
    return {
      type: 'AUTH_ERROR',
      message: '数据库认证失败，请联系管理员',
    }
  }

  // 通用数据库错误
  return {
    type: 'DATABASE_ERROR',
    message: '数据库操作失败，请稍后重试',
  }
}

// 工具函数：创建用户
export async function createUser(email, username, fullName, hashedPassword) {
  const result = await sql`
    INSERT INTO users (email, username, full_name, password_hash)
    VALUES (${email}, ${username}, ${fullName}, ${hashedPassword})
    RETURNING id, email, username, full_name, created_at
  `
  return result[0]
}

// 工具函数：通过用户名查找用户
export async function findUserByUsername(username) {
  const result = await sql`
    SELECT id, email, username, full_name, password_hash, created_at
    FROM users 
    WHERE username = ${username}
    LIMIT 1
  `
  return result[0] || null
}

// 工具函数：通过邮箱查找用户
export async function findUserByEmail(email) {
  const result = await sql`
    SELECT id, email, username, full_name, password_hash, created_at
    FROM users 
    WHERE email = ${email}
    LIMIT 1
  `
  return result[0] || null
}

// 工具函数：通过ID查找用户
export async function findUserById(userId) {
  const result = await sql`
    SELECT id, email, username, full_name, password_hash, created_at
    FROM users 
    WHERE id = ${userId}
    LIMIT 1
  `
  return result[0] || null
}

// 工具函数：获取用户的待办事项
export async function getUserTodos(userId) {
  const result = await sql`
    SELECT 
      t.*,
      c.name as category_name,
      p.name as project_name,
      u.full_name as assigned_to_name
    FROM todos t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.created_by = ${userId}
    ORDER BY t.created_at DESC
  `
  return result
}

// 工具函数：创建待办事项
export async function createTodo(todoData) {
  const {
    title,
    description,
    status = 'pending',
    priority = 'medium',
    dueDate,
    estimatedHours,
    assignedTo,
    createdBy,
    projectId,
    categoryId,
    tags = [],
  } = todoData

  const result = await sql`
    INSERT INTO todos (
      title, description, status, priority, due_date, 
      estimated_hours, assigned_to, created_by, project_id, 
      category_id, tags
    )
    VALUES (
      ${title}, ${description}, ${status}, ${priority}, ${dueDate},
      ${estimatedHours}, ${assignedTo}, ${createdBy}, ${projectId},
      ${categoryId}, ${JSON.stringify(tags)}
    )
    RETURNING *
  `
  return result[0]
}

// 工具函数：更新待办事项
export async function updateTodo(todoId, todoData, userId) {
  const { title, description, status, priority, dueDate, estimatedHours, tags } = todoData

  const result = await sql`
    UPDATE todos 
    SET 
      title = ${title},
      description = ${description},
      status = ${status},
      priority = ${priority},
      due_date = ${dueDate},
      estimated_hours = ${estimatedHours},
      tags = ${JSON.stringify(tags)},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${todoId} AND created_by = ${userId}
    RETURNING *
  `
  return result[0]
}

// 工具函数：删除待办事项
export async function deleteTodo(todoId, userId) {
  const result = await sql`
    DELETE FROM todos 
    WHERE id = ${todoId} AND created_by = ${userId}
    RETURNING id
  `
  return result[0]
}

// 工具函数：获取用户的项目
export async function getUserProjects(userId) {
  const result = await sql`
    SELECT id, name, description, color, created_at
    FROM projects 
    WHERE owner_id = ${userId}
    ORDER BY created_at DESC
  `
  return result
}

// 工具函数：获取项目的分类
export async function getProjectCategories(projectId) {
  const result = await sql`
    SELECT id, name, description, color
    FROM categories 
    WHERE project_id = ${projectId}
    ORDER BY name
  `
  return result
}

// 工具函数：更新用户密码
export async function updateUserPassword(userId, newHashedPassword) {
  const result = await sql`
    UPDATE users
    SET 
      password_hash = ${newHashedPassword},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
    RETURNING id
  `
  return result[0] || null
}
