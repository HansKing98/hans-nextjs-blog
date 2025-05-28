#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于验证数据库错误处理功能是否正常工作
 */

const { checkDatabaseConnection } = require('../lib/db')

async function testDatabaseConnection() {
  console.log('🔍 开始检查数据库连接...\n')

  try {
    const result = await checkDatabaseConnection()

    if (result.connected) {
      console.log('✅ 数据库连接测试通过')
      console.log(`📝 状态信息: ${result.message}`)
      console.log('\n🎉 数据库错误处理功能已准备就绪!')
    } else {
      console.log('❌ 数据库连接测试失败')
      console.log(`📝 错误信息: ${result.message}`)
      if (result.error) {
        console.log(`🔧 技术详情: ${result.error}`)
      }
      console.log('\n💡 这是预期行为 - 错误处理功能正在工作!')
      console.log('   前端应该能够正确显示这个错误信息。')
    }
  } catch (error) {
    console.log('💥 测试过程中发生未预期的错误:')
    console.error(error)
    console.log('\n🚨 建议检查:')
    console.log('   1. 环境变量 DATABASE_URL 是否正确配置')
    console.log('   2. 数据库服务是否正在运行')
    console.log('   3. 网络连接是否正常')
  }

  console.log('\n📋 测试场景建议:')
  console.log('   1. 正常连接: 配置正确的 DATABASE_URL')
  console.log('   2. 连接失败: 配置错误的主机地址')
  console.log('   3. 认证失败: 配置错误的用户名/密码')
  console.log('   4. 数据库不存在: 配置不存在的数据库名')

  console.log('\n🌐 Web测试:')
  console.log('   启动服务后访问: http://localhost:3000/api/health')
  console.log('   前端测试页面: http://localhost:3000/login')
}

// 检查是否有环境变量
if (!process.env.DATABASE_URL) {
  console.log('⚠️  警告: 未找到 DATABASE_URL 环境变量')
  console.log('📝 这将触发"数据库未配置"错误，这是测试的一部分。')
  console.log('')
}

// 运行测试
testDatabaseConnection().catch(console.error)
