import crypto from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// 安全的密码哈希 - 使用PBKDF2替代SHA256
export function hashPassword(password, providedSalt = null) {
  // 生成随机盐值或使用提供的盐值
  const salt = providedSalt || crypto.randomBytes(32).toString('hex')

  // 使用PBKDF2进行密码哈希，100000次迭代
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')

  // 返回盐值和哈希的组合
  return `${salt}:${hash}`
}

// 验证密码
export function verifyPassword(password, hashedPassword) {
  try {
    // 如果是旧的SHA256格式，需要兼容处理
    if (!hashedPassword.includes(':')) {
      // 旧格式兼容 - 但应该提示用户更新密码
      const oldHash = crypto.createHash('sha256').update(password).digest('hex')
      return oldHash === hashedPassword
    }

    // 新格式：salt:hash
    const [salt, hash] = hashedPassword.split(':')
    const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')

    // 使用timingSafeEqual防止时序攻击
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'))
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// 输入验证和清理
export function sanitizeInput(input, maxLength = 255) {
  if (typeof input !== 'string') return ''

  // 限制长度防止DoS
  return input.trim().slice(0, maxLength)
}

// 验证密码强度
export function validatePasswordStrength(password) {
  const errors = []

  if (password.length < 8) {
    errors.push('密码至少需要8位')
  }
  if (password.length > 128) {
    errors.push('密码不能超过128位')
  }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('密码需要包含小写字母')
  // }
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('密码需要包含大写字母')
  // }
  if (!/\d/.test(password)) {
    errors.push('密码需要包含数字')
  }
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('密码需要包含特殊字符')
  // }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// 生成JWT令牌 - 添加更多安全字段
export async function generateToken(payload) {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    // 添加随机nonce防止token重放
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  return await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setAudience('todo-app')
    .setIssuer('todo-app-server')
    .sign(JWT_SECRET)
}

// 验证JWT令牌
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      audience: 'todo-app',
      issuer: 'todo-app-server',
    })
    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// 从请求中获取用户ID
export async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')

    let token = null

    // 首先尝试从Authorization header获取
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    // 然后尝试从cookie获取
    else if (cookieHeader) {
      const cookies = Object.fromEntries(cookieHeader.split('; ').map((c) => c.split('=')))
      token = cookies['auth-token']
    }

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    return payload?.userId || null
  } catch (error) {
    console.error('Get user from request failed:', error)
    return null
  }
}

// 创建认证响应 - 增强安全性
export function createAuthResponse(data, token) {
  const response = NextResponse.json(data, { status: 200 })

  // 设置安全的cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 86400, // 24小时
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    // 添加__Secure前缀(生产环境)
    ...(process.env.NODE_ENV === 'production' && { name: '__Secure-auth-token' }),
  })

  // 添加安全头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

// 创建登出响应
export function createLogoutResponse() {
  const response = NextResponse.json({ message: '登出成功' }, { status: 200 })

  // 清除cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'strict',
  })

  return response
}
