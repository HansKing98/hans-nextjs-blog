import { NextResponse } from 'next/server'
import {
  getUserFromRequest,
  verifyPassword,
  hashPassword,
  sanitizeInput,
  validatePasswordStrength,
} from '../../../../lib/auth'
import { findUserById, updateUserPassword, handleDatabaseError } from '../../../../lib/db'
import { withRateLimit } from '../../../../lib/rateLimiter'

export async function POST(request) {
  try {
    // 频率限制：每10分钟最多5次修改密码请求
    const rateLimit = withRateLimit(5, 10 * 60 * 1000)
    const rateLimitResult = rateLimit(request)

    if (rateLimitResult.limited) {
      return NextResponse.json(
        {
          message: '请求过于频繁，请稍后再试',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          },
        }
      )
    }

    // 从请求中获取用户ID
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ message: '未授权访问' }, { status: 401 })
    }

    // 获取用户信息
    const user = await findUserById(userId)
    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 })
    }

    // 获取请求体
    const body = await request.json()
    const currentPassword = sanitizeInput(body.currentPassword, 128)
    const newPassword = sanitizeInput(body.newPassword, 128)
    const confirmPassword = sanitizeInput(body.confirmPassword, 128)

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: '所有密码字段都是必填的' }, { status: 400 })
    }

    // 确认新密码匹配
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: '新密码与确认密码不匹配' }, { status: 400 })
    }

    // 验证当前密码
    const storedPassword = user.password_hash
    if (!verifyPassword(currentPassword, storedPassword)) {
      return NextResponse.json({ message: '当前密码不正确' }, { status: 400 })
    }

    // 防止重复使用相同密码
    if (verifyPassword(newPassword, storedPassword)) {
      return NextResponse.json({ message: '新密码不能与当前密码相同' }, { status: 400 })
    }

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          message: '新密码不符合安全要求',
          errors: passwordValidation.errors,
        },
        { status: 400 }
      )
    }

    // 哈希新密码
    const newHashedPassword = hashPassword(newPassword)

    // 更新密码
    await updateUserPassword(userId, newHashedPassword)

    return NextResponse.json({
      message: '密码修改成功',
      lastUpdated: new Date().toISOString(),
    },
      { status: 200 }
    )
  } catch (error) {
    console.error('修改密码错误:', error)

    // 处理数据库连接错误
    const dbError = handleDatabaseError(error)
    if (dbError.type === 'CONNECTION_ERROR') {
      return NextResponse.json(
        {
          message: '数据库连接异常，请稍后重试',
          type: 'DATABASE_CONNECTION_ERROR',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ message: '服务器内部错误' }, { status: 500 })
  }
}
