/**
 * +--------------------------------------------------------------------------+
 * | [INPUT]: 依赖 Contentlayer、MDX 插件、站点元数据与文章内容目录
 * | [OUTPUT]: 对外提供 Post 文档类型与 Contentlayer 内容源配置
 * | [POS]: 内容层核心配置，负责 Markdown/MDX 解析、派生字段与构建后索引
 * | [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * +--------------------------------------------------------------------------+
 */
import { ComputedFields, defineDocumentType, makeSource } from 'contentlayer/source-files'
import path from 'path'
// Remark packages
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkFootnotes from 'remark-footnotes'
import {
  extractTocHeadings,
  remarkCodeTitles,
  remarkExtractFrontmatter,
  remarkImgToJsx,
} from 'pliny/mdx-plugins/index.js'
// Rehype packages
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeCitation from 'rehype-citation'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypePresetMinify from 'rehype-preset-minify'
import siteMetadata from './data/siteMetadata'
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic'
import octicons from '@primer/octicons'
import { pinyin } from 'pinyin-pro'
import count from 'word-count'

const root = process.cwd()

const getChinesePath = (doc) => {
  const slut = doc._raw.flattenedPath.replace(/^.+?(\/)/, '')
  return pinyin(slut, { toneType: 'none', nonZh: 'consecutive', separator: '-' })
    .replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '') // url 标准符号
    .replaceAll(/-+/g, '-')
    .replace(/(-\/s)|(\/-)|(-$)/g, '') // /- -/ 或者结尾-
}

const computedFields: ComputedFields = {
  slug: {
    type: 'string',
    resolve: (doc) => getChinesePath(doc),
  },
  path: {
    type: 'string',
    resolve: (doc) => 'blog/' + getChinesePath(doc),
  },
  filePath: {
    type: 'string',
    resolve: (doc) => doc._raw.sourceFilePath,
  },
  toc: { type: 'string', resolve: (doc) => extractTocHeadings(doc.body.raw) },
  summary: {
    type: 'string',
    resolve: (doc) => extractTocHeadings(doc.body.raw).then((res) => JSON.stringify(res)),
  },
  description: {
    type: 'string',
    resolve: (doc) => doc.summary,
  },
  wordCount: { type: 'number', resolve: (doc) => count(doc.body.raw) },
}

export const Post = defineDocumentType(() => ({
  name: 'Post',
  filePathPattern: 'posts/**/*.md',
  contentType: 'mdx',
  fields: {
    title: { type: 'string', required: true },
    date: { type: 'string', required: true },
    tags: { type: 'list', of: { type: 'string' }, default: [] },
    lastmod: { type: 'date' },
    draft: { type: 'boolean' },
    summary: { type: 'string' },
    image: { type: 'string' },
    images: { type: 'list', of: { type: 'string' } },
    authors: { type: 'list', of: { type: 'string' } },
    layout: { type: 'string' },
    bibliography: { type: 'string' },
    canonicalUrl: { type: 'string' },
    categories: { type: 'list', of: { type: 'string' } },
    slug: { type: 'string' },
  },
  computedFields: {
    ...computedFields,
    structuredData: {
      type: 'json',
      resolve: (doc) => ({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: doc.title,
        datePublished: doc.date,
        dateModified: doc.lastmod || doc.date,
        description: doc.summary,
        image: doc.images ? doc.images[0] : siteMetadata.socialBanner,
        url: siteMetadata.siteUrl + '/blog/' + getChinesePath(doc),
        author: doc.authors,
      }),
    },
  },
}))

const icon = fromHtmlIsomorphic(
  `
  <span class="content-header-link-placeholder">
    ${octicons.link.toSVG()}
  </span>
  `,
  { fragment: true }
)

export default makeSource({
  contentDirPath: 'data',
  contentDirExclude: ['tofu.json', 'showcase.json', '**/CLAUDE.md'],
  documentTypes: [Post],
  mdx: {
    // cwd: process.cwd(),
    remarkPlugins: [
      remarkExtractFrontmatter,
      remarkGfm,
      remarkCodeTitles,
      remarkMath,
      remarkImgToJsx,
      remarkFootnotes,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'prepend',
          headingProperties: {
            className: ['content-header'],
          },
          content: icon,
        },
      ],
      rehypeKatex,
      [rehypeCitation, { path: path.join(root, 'data') }],
      [rehypePrismPlus, { defaultLanguage: 'js', ignoreMissing: true }],
      rehypePresetMinify,
    ],
  },
})
