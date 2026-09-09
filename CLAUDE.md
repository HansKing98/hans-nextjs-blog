# hans-nextjs-blog - 基于 Next.js 的个人技术博客
Next.js 14 + React 18 + TypeScript + Tailwind CSS + Contentlayer + MDX
<directory>
app/ - App Router 页面与路由
components/ - 可复用 UI 组件
data/posts/ - 按年份组织的 Markdown/MDX 博客文章
layouts/ - 文章与页面布局
lib/ - 通用工具函数
scripts/ - 构建后处理与 RSS 脚本
</directory>
<config>
contentlayer.config.ts - 内容模型、MDX 插件与搜索索引
data/siteMetadata.js - 站点元信息
package.json - 依赖与构建脚本
</config>
法则: 极简·稳定·导航·版本精确
