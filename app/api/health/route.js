import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '../../../lib/db'

export async function GET() {
  try {
    const result = await checkDatabaseConnection()

    if (result.connected) {
      return NextResponse.json({
        status: 'healthy',
        database: result.message,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: result.message,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('健康检查失败:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: '健康检查过程中发生错误',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
