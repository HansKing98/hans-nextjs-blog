import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // 检查是否访问受保护的路由
  if (pathname.startsWith('/todo')) {
    const authToken = request.cookies.get('auth-token')

    // 如果没有认证令牌，重定向到登录页面
    if (!authToken) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/todo/:path*'],
}
