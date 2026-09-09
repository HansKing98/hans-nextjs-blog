/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer 文章集合、标签统计工具与博客展示组件
 * | [OUTPUT]: 对外提供 Plog 列表页面与页面元数据
 * | [POS]: App Router Plog 列表入口，仅展示带 Plog 标签的文章
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allPosts } from 'contentlayer/generated'

import { genPageMetadata } from '../seo'

import BlogPage from 'app/blog/blog-page'
import { getTagCounts } from '@/lib/tag-data'

export const metadata = genPageMetadata({ title: 'Plog' })
export default async function Page() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  const tags = getTagCounts(true)
  return (
    <BlogPage
      tags={tags}
      posts={posts.filter((el) => el.tags && el.tags.includes('plog'))}
      plogTag={true}
    />
  )
}
