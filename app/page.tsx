/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖问候组件、精选文章组件、Contentlayer 文章集合与标签统计工具
 * | [OUTPUT]: 对外提供包含问候区与精选文章列表的网站首页
 * | [POS]: App Router 根路由，负责组织首页问候内容与精选文章
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import Greetings from '@/components/Greetings'
import ExcellentPage from '@/app/excellent/excellent-page'
import { allPosts } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { getTagCounts } from '@/lib/tag-data'

export default function Home() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  const tags = getTagCounts(false)

  return (
    <>
      <Greetings />
      <ExcellentPage
        posts={posts.filter(
          (el) => el.tags?.includes('top') && (!el.tags || !el.tags.includes('plog'))
        )}
        tags={tags}
      />
    </>
  )
}
