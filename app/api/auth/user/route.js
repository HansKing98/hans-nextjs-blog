import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { findUserById, handleDatabaseError } from '../../../../lib/db'

export async function GET(request) {
  try {
    // 从请求中获取用户ID
    const userId = await getUserFromRequest(request)

    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    // 从数据库获取用户信息
    const user = await findUserById(userId)

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 })
    }

    // 返回用户信息（不包含敏感数据）
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      createdAt: user.created_at,
    })
  } catch (error) {
    console.error('Get user error:', error)

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

    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
