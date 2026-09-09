/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer 生成的 allPosts 文章集合
 * | [OUTPUT]: 对外提供按是否包含 Plog 分类聚合的标签统计函数
 * | [POS]: 标签数据领域工具，被博客、精选、Plog 与标签路由页面复用
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { allPosts } from 'contentlayer/generated'

export function getTagCounts(includePlog: boolean): Record<string, number> {
  const tagCounts: Record<string, number> = {}

  allPosts.forEach((post) => {
    if (post.draft === true || !post.tags || post.tags.includes('plog') !== includePlog) {
      return
    }

    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    })
  })

  return tagCounts
}
