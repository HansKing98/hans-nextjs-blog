import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getUserTodos, createTodo, handleDatabaseError } from '../../../lib/db'

// 获取用户的待办事项列表
export async function GET(request) {
  try {
    const userId = await getUserFromRequest(request)

    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    const todos = await getUserTodos(userId)

    return NextResponse.json({
      success: true,
      data: todos,
    })
  } catch (error) {
    console.error('Get todos error:', error)

    // 处理数据库连接错误
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

    return NextResponse.json({ message: '获取待办事项失败' }, { status: 500 })
  }
}

// 创建新的待办事项
export async function POST(request) {
  try {
    const userId = await getUserFromRequest(request)

    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority, dueDate, estimatedHours, tags } = body

    // 验证必需字段
    if (!title || title.trim() === '') {
      return NextResponse.json({ message: '标题不能为空' }, { status: 400 })
    }

    // 创建待办事项数据
    const todoData = {
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: userId,
      assignedTo: userId, // 默认分配给创建者
    }

    const newTodo = await createTodo(todoData)

    return NextResponse.json({
      success: true,
      data: newTodo,
      message: '待办事项创建成功',
    })
  } catch (error) {
    console.error('Create todo error:', error)

    // 处理数据库连接错误
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

    return NextResponse.json({ message: '创建待办事项失败' }, { status: 500 })
  }
}
