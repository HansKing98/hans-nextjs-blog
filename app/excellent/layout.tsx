import { genPageMetadata } from '../seo'

export const metadata = genPageMetadata({
  title: '推荐阅读',
  description: '精选文章推荐',
  keywords: ['blog', 'articles', 'recommended reading'],
  alternates: {
    canonical: '/excellent',
  },
})

export default function Layout({ children }) {
  return children
}
