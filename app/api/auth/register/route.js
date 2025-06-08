import { NextResponse } from 'next/server'
import {
  createUser,
  findUserByUsername,
  findUserByEmail,
  handleDatabaseError,
} from '../../../../lib/db'
import {
  hashPassword,
  generateToken,
  createAuthResponse,
  sanitizeInput,
  validatePasswordStrength,
} from '../../../../lib/auth'
import { withRateLimit } from '../../../../lib/rateLimiter'

export async function POST(request) {
  try {
    // 通用频率限制：每5分钟最多10次注册请求
    const rateLimit = withRateLimit(10, 5 * 60 * 1000)
    const rateLimitResult = rateLimit(request)

    if (rateLimitResult.limited) {
      return NextResponse.json(
        {
          message: 'Too many registration attempts, please try again later',
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
    const email = sanitizeInput(body.email, 100)
    const password = sanitizeInput(body.password, 128)
    const fullName = sanitizeInput(body.fullName, 100)

    // 验证输入
    if (!username || !password || !email) {
      return NextResponse.json(
        { message: 'Username, password and email are required' },
        { status: 400 }
      )
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
        },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
    }

    // 验证用户名格式（只允许字母数字和下划线）
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          message:
            'Username must be 3-30 characters long and contain only letters, numbers, and underscores',
        },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await findUserByUsername(username)
    if (existingUser) {
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 })
    }

    // 检查邮箱是否已被注册
    const existingEmail = await findUserByEmail(email)
    if (existingEmail) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
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
      message: 'Registration successful',
    }

    return createAuthResponse(userData, token)
  } catch (error) {
    console.error('Register error:', error)

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

    // 处理唯一约束违反（用户名或邮箱已存在）
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      if (error.message?.includes('username')) {
        return NextResponse.json({ message: 'Username already exists' }, { status: 409 })
      }
      if (error.message?.includes('email')) {
        return NextResponse.json({ message: 'Email already registered' }, { status: 409 })
      }
    }

    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
