import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allPosts } from 'contentlayer/generated'
import tagData from 'app/tag-data.json'
import ExcellentPage from './excellent-page'

export default async function Page() {
  const sortedPosts = sortPosts(allPosts)
  const posts = allCoreContent(sortedPosts)
  console.log(posts)
  const tags = tagData as Record<string, number>
  delete tags.plog

  return (
    <ExcellentPage
      tags={tags}
      posts={posts.filter(
        (el) => el.tags?.includes('top') && (!el.tags || !el.tags.includes('plog'))
      )}
    />
  )
}
