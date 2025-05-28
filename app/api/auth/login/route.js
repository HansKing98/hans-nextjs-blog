import { NextResponse } from 'next/server'
import { findUserByUsername, handleDatabaseError } from '../../../../lib/db'
import { verifyPassword, generateToken, createAuthResponse } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    // 验证输入
    if (!username || !password) {
      return NextResponse.json({ message: '用户名和密码不能为空' }, { status: 400 })
    }

    // 查找用户
    const user = await findUserByUsername(username)

    if (!user) {
      return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 })
    }

    // 验证密码
    const storedPassword = user.password_hash
    if (!storedPassword || !verifyPassword(password, storedPassword)) {
      return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 })
    }

    // 生成JWT令牌
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    })

    // 返回用户信息（不包含密码）
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      message: '登录成功',
    }

    return createAuthResponse(userData, token)
  } catch (error) {
    console.error('Login error:', error)

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
