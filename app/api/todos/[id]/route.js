import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { updateTodo, deleteTodo, handleDatabaseError } from '../../../../lib/db'

// 更新待办事项
export async function PUT(request, { params }) {
  try {
    const userId = await getUserFromRequest(request)

    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { title, description, status, priority, dueDate, estimatedHours, tags } = body

    // 验证必需字段
    if (!title || title.trim() === '') {
      return NextResponse.json({ message: '标题不能为空' }, { status: 400 })
    }

    // 验证状态值
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ message: '无效的状态值' }, { status: 400 })
    }

    // 验证优先级值
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ message: '无效的优先级值' }, { status: 400 })
    }

    // 更新待办事项数据
    const todoData = {
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      tags: Array.isArray(tags) ? tags : [],
    }

    const updatedTodo = await updateTodo(id, todoData, userId)

    if (!updatedTodo) {
      return NextResponse.json({ message: '待办事项不存在或无权限修改' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updatedTodo,
      message: '待办事项更新成功',
    })
  } catch (error) {
    console.error('Update todo error:', error)

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

    return NextResponse.json({ message: '更新待办事项失败' }, { status: 500 })
  }
}

// 删除待办事项
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserFromRequest(request)

    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    const { id } = params
    const deletedTodo = await deleteTodo(id, userId)

    if (!deletedTodo) {
      return NextResponse.json({ message: '待办事项不存在或无权限删除' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: '待办事项删除成功',
    })
  } catch (error) {
    console.error('Delete todo error:', error)

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

    return NextResponse.json({ message: '删除待办事项失败' }, { status: 500 })
  }
}
