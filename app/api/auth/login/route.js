import { NextResponse } from 'next/server'
import { findUserByUsername, handleDatabaseError } from '../../../../lib/db'
import {
  verifyPassword,
  generateToken,
  createAuthResponse,
  sanitizeInput,
} from '../../../../lib/auth'
import { withRateLimit, withLoginRateLimit } from '../../../../lib/rateLimiter'

export async function POST(request) {
  try {
    // 通用频率限制：每5分钟最多20次请求
    const rateLimit = withRateLimit(20, 5 * 60 * 1000)
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

    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = sanitizeInput(body.password, 128)

    // 验证输入
    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 })
    }

    // 登录特定的频率限制
    const loginRateLimit = withLoginRateLimit()
    const loginLimitResult = loginRateLimit.check(request, username)

    if (!loginLimitResult.allowed) {
      return NextResponse.json(
        {
          message: loginLimitResult.message,
          type: 'RATE_LIMITED',
          retryAfter: loginLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': loginLimitResult.retryAfter.toString(),
          },
        }
      )
    }

    // 查找用户
    const user = await findUserByUsername(username)

    if (!user) {
      // 记录失败尝试（即使用户不存在，也要记录以防止用户名枚举）
      loginRateLimit.recordFailure(request, username)
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }

    // 验证密码
    const storedPassword = user.password_hash
    if (!storedPassword || !verifyPassword(password, storedPassword)) {
      // 记录失败尝试
      loginRateLimit.recordFailure(request, username)
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 })
    }

    // 登录成功，重置失败计数
    loginRateLimit.resetFailures(request, username)

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
      message: 'Login successful',
    }

    return createAuthResponse(userData, token)
  } catch (error) {
    console.error('Login error:', error)

    // 处理数据库连接错误
    const dbError = handleDatabaseError(error)
    if (dbError.type === 'CONNECTION_ERROR') {
      return NextResponse.json(
        {
          message: 'Database connection error, please try again later',
          type: 'DATABASE_CONNECTION_ERROR',
          code: 'DB_CONNECTION_FAILED',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
