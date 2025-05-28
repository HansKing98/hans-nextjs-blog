import crypto from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// 生成哈希密码
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// 验证密码
export function verifyPassword(password, hashedPassword) {
  const hash = hashPassword(password)
  return hash === hashedPassword
}

// 生成JWT令牌
export async function generateToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

// 验证JWT令牌
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
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

// 创建认证响应
export function createAuthResponse(data, token) {
  const response = NextResponse.json(data, { status: 200 })

  // 设置cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 86400, // 24小时
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

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
