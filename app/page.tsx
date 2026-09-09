/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Xiaohongshu 首页展示组件
 * | [OUTPUT]: 对外提供网站首页 Home 页面
 * | [POS]: App Router 根路由，负责承载首页主内容
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import Xiaohongshu from './xiaohongshu'

export default function Home() {
  return (
    <>
      <Xiaohongshu />
    </>
  )
}
