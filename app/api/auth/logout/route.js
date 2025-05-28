import { createLogoutResponse } from '../../../../lib/auth'

export async function POST() {
  try {
    return createLogoutResponse()
  } catch (error) {
    console.error('Logout error:', error)
    return new Response(JSON.stringify({ message: '登出失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
