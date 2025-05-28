import { NextResponse } from 'next/server'
import { createUser, findUserByUsername, findUserByEmail, handleDatabaseError } from '../../../../lib/db'
import { hashPassword, generateToken, createAuthResponse } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { username, password, email, fullName } = await request.json()

    // 验证输入
    if (!username || !password || !email) {
      return NextResponse.json({ message: '用户名、密码和邮箱不能为空' }, { status: 400 })
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json({ message: '密码长度至少为6位' }, { status: 400 })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: '邮箱格式不正确' }, { status: 400 })
    }

    // 检查用户名是否已存在
    const existingUser = await findUserByUsername(username)
    if (existingUser) {
      return NextResponse.json({ message: '用户名已存在' }, { status: 409 })
    }

    // 检查邮箱是否已被注册
    const existingEmail = await findUserByEmail(email)
    if (existingEmail) {
      return NextResponse.json({ message: '邮箱已被注册' }, { status: 409 })
    }

    // 哈希密码
    const hashedPassword = hashPassword(password)

    // 创建用户
    const user = await createUser(email, username, fullName || username, hashedPassword)

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
      message: '注册成功',
    }

    return createAuthResponse(userData, token)
  } catch (error) {
    console.error('Register error:', error)

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

    // 处理唯一约束违反（用户名或邮箱已存在）
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      if (error.message?.includes('username')) {
        return NextResponse.json({ message: '用户名已存在' }, { status: 409 })
      }
      if (error.message?.includes('email')) {
        return NextResponse.json({ message: '邮箱已被注册' }, { status: 409 })
      }
    }

    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 })
  }
} 