import Greetings from '@/components/Greetings'
import ExcellentPage from '@/app/excellent/excellent-page'
import { allPosts } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import tagData from 'app/tag-data.json'

export default function Home() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  const tags = tagData as Record<string, number>
  delete tags.plog
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
