// 简单的内存级频率限制器（生产环境建议使用Redis）
class RateLimiter {
  constructor() {
    this.requests = new Map()
    this.loginAttempts = new Map()

    // 每5分钟清理一次过期记录
    setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )
  }

  // 清理过期记录
  cleanup() {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000

    // 清理普通请求记录
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((time) => time > fiveMinutesAgo)
      if (validTimestamps.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validTimestamps)
      }
    }

    // 清理登录失败记录
    for (const [key, data] of this.loginAttempts.entries()) {
      if (data.lastAttempt < oneHourAgo) {
        this.loginAttempts.delete(key)
      }
    }
  }

  // 获取客户端标识
  getClientId(request) {
    // 优先使用X-Forwarded-For，然后是X-Real-IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('x-remote-addr')

    return forwarded?.split(',')[0].trim() || realIp || remoteAddr || 'unknown'
  }

  // 通用频率限制
  isRateLimited(request, maxRequests = 100, windowMs = 5 * 60 * 1000) {
    const clientId = this.getClientId(request)
    const now = Date.now()
    const windowStart = now - windowMs

    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, [])
    }

    const timestamps = this.requests.get(clientId)
    // 移除窗口外的记录
    const validTimestamps = timestamps.filter((time) => time > windowStart)

    if (validTimestamps.length >= maxRequests) {
      return {
        limited: true,
        retryAfter: Math.ceil((validTimestamps[0] - windowStart) / 1000),
      }
    }

    // 记录当前请求
    validTimestamps.push(now)
    this.requests.set(clientId, validTimestamps)

    return { limited: false }
  }

  // 登录特定的频率限制
  checkLoginLimit(request, username) {
    const clientId = this.getClientId(request)
    const key = `${clientId}:${username}`
    const now = Date.now()

    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, {
        attempts: 0,
        lastAttempt: now,
        lockoutUntil: null,
      })
    }

    const attemptData = this.loginAttempts.get(key)

    // 检查是否在锁定期内
    if (attemptData.lockoutUntil && now < attemptData.lockoutUntil) {
      return {
        allowed: false,
        reason: 'account_locked',
        retryAfter: Math.ceil((attemptData.lockoutUntil - now) / 1000),
        message: `账户已锁定，请 ${Math.ceil((attemptData.lockoutUntil - now) / 60000)} 分钟后重试`,
      }
    }

    // 如果超过1小时，重置计数
    if (now - attemptData.lastAttempt > 60 * 60 * 1000) {
      attemptData.attempts = 0
    }

    // 检查失败次数
    if (attemptData.attempts >= 5) {
      // 5次失败后锁定30分钟
      attemptData.lockoutUntil = now + 30 * 60 * 1000
      return {
        allowed: false,
        reason: 'too_many_attempts',
        retryAfter: 30 * 60,
        message: '登录失败次数过多，账户已锁定30分钟',
      }
    }

    return { allowed: true }
  }

  // 记录登录失败
  recordLoginFailure(request, username) {
    const clientId = this.getClientId(request)
    const key = `${clientId}:${username}`
    const now = Date.now()

    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, {
        attempts: 0,
        lastAttempt: now,
        lockoutUntil: null,
      })
    }

    const attemptData = this.loginAttempts.get(key)
    attemptData.attempts += 1
    attemptData.lastAttempt = now
    attemptData.lockoutUntil = null

    this.loginAttempts.set(key, attemptData)
  }

  // 重置登录失败计数（登录成功时调用）
  resetLoginFailures(request, username) {
    const clientId = this.getClientId(request)
    const key = `${clientId}:${username}`
    this.loginAttempts.delete(key)
  }
}

// 全局实例
const rateLimiter = new RateLimiter()

// 中间件函数
export function withRateLimit(maxRequests = 100, windowMs = 5 * 60 * 1000) {
  return function (request) {
    return rateLimiter.isRateLimited(request, maxRequests, windowMs)
  }
}

export function withLoginRateLimit() {
  return {
    check: (request, username) => rateLimiter.checkLoginLimit(request, username),
    recordFailure: (request, username) => rateLimiter.recordLoginFailure(request, username),
    resetFailures: (request, username) => rateLimiter.resetLoginFailures(request, username),
  }
}

export default rateLimiter
