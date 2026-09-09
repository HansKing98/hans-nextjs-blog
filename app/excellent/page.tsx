/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer 文章集合、标签统计工具与精选文章组件
 * | [OUTPUT]: 对外提供精选文章列表页面
 * | [POS]: App Router 精选文章列表入口，筛选 top 标签文章并排除 Plog
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allPosts } from 'contentlayer/generated'
import ExcellentPage from './excellent-page'
import { getTagCounts } from '@/lib/tag-data'

export default async function Page() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  const tags = getTagCounts(false)

  return (
    <ExcellentPage
      tags={tags}
      posts={posts.filter(
        (el) => el.tags?.includes('top') && (!el.tags || !el.tags.includes('plog'))
      )}
    />
  )
}
