/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer 文章集合、标签统计工具与博客展示组件
 * | [OUTPUT]: 对外提供 Blog 列表页面与页面元数据
 * | [POS]: App Router 博客列表入口，过滤 Plog 文章并聚合普通文章标签
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allPosts } from 'contentlayer/generated'

import BlogPage from './blog-page'
import { genPageMetadata } from '../seo'
import { getTagCounts } from '@/lib/tag-data'

export const metadata = genPageMetadata({ title: 'Blog' })
export default async function Page() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  const tags = getTagCounts(false)
  return (
    <BlogPage tags={tags} posts={posts.filter((el) => !el.tags || !el.tags.includes('plog'))} />
  )
}
