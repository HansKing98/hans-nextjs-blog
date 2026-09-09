/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer 生成的文章数据、Pliny 内容工具与站点元数据
 * | [OUTPUT]: 对外生成标签统计、Plog 标签统计与本地搜索索引
 * | [POS]: 构建前内容数据生成器，由 package.json 的 build 显式调用
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer.js'
import siteMetadata from '../data/siteMetadata.js'

const allPosts = JSON.parse(
  readFileSync(new URL('../.contentlayer/generated/Post/_index.json', import.meta.url), 'utf8')
)

const createTagCount = (posts, includePlog) => {
  const tagCount = {}

  posts.forEach((post) => {
    if (post.draft === true || !post.tags || post.tags.includes('plog') !== includePlog) {
      return
    }

    post.tags.forEach((tag) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })
  })

  return tagCount
}

writeFileSync('./app/tag-data.json', JSON.stringify(createTagCount(allPosts, false)))
writeFileSync('./app/tag-plog-data.json', JSON.stringify(createTagCount(allPosts, true)))

if (
  siteMetadata?.search?.provider === 'kbar' &&
  siteMetadata.search.kbarConfig.searchDocumentsPath
) {
  writeFileSync(
    `public/${siteMetadata.search.kbarConfig.searchDocumentsPath}`,
    JSON.stringify(allCoreContent(sortPosts(allPosts)))
  )
}
